import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { Pool } from "pg";

test("authenticated resumable routes preserve actual PDF, finalize once, recover lost commit response and enforce boundaries",async()=>{
  const root=await mkdtemp(path.join(tmpdir(),"pikso-resumable-routes-"));
  process.env.STORAGE_DIR=root;
  process.env.DATABASE_URL="postgresql://test:test@127.0.0.1:1/test";
  process.env.BETTER_AUTH_SECRET="test-only-secret-not-production-1234567890";
  process.env.BETTER_AUTH_URL="http://localhost:3000";
  const pool=new Pool({connectionString:process.env.DATABASE_URL});
  const books=new Map<string,unknown[]>();let pending:unknown[]|undefined;let failCommit=false;let unavailable=false;let writes=0;
  mock.method(pool,"query",async(sql:string,args:unknown[])=>{
    if(unavailable)throw new Error("db unavailable");
    const row=books.get(String(args?.[0]));
    return {rows:row?[{id:row[0],slug:row[1],title:row[2],pdf_path:row[6]}]:[]};
  });
  mock.method(pool,"connect",async()=>({release(){},query:async(sql:string,args:unknown[])=>{
    if(sql==="BEGIN")pending=undefined;
    if(sql.startsWith("INSERT INTO books")){writes++;pending=args;}
    if(sql.startsWith("INSERT INTO m_book_category"))return {rows:[{id:"cat",name:args[0]}],rowCount:1};
    if(sql==="COMMIT"){
      if(pending)books.set(String(pending[0]),pending);
      if(failCommit){failCommit=false;unavailable=true;throw new Error("commit response lost");}
    }
    return {rows:[],rowCount:1};
  }}));
  (globalThis as unknown as {nanaPool:Pool}).nanaPool=pool;
  let owner="admin-one",signedIn=true;
  const {getAuth}=await import("../src/lib/auth");
  mock.method(getAuth().api,"getSession",async()=>signedIn?{user:{id:owner,role:"admin"}}:null);
  const create=await import("../src/app/api/admin/book-uploads/route");
  const status=await import("../src/app/api/admin/book-uploads/[id]/route");
  const chunk=await import("../src/app/api/admin/book-uploads/[id]/chunks/[index]/route");
  const final=await import("../src/app/api/admin/books/finalize/route");
  const uploads=await import("../src/lib/resumable-upload");
  function json(body:unknown,url="/api/admin/book-uploads",origin="http://localhost:3000") {return new Request(`http://localhost:3000${url}`,{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(body)});}
  const metadata={title:"Test",slug:"test",author:"Studio",description:"",categories:["Fantasi"],status:"draft"};
  async function sendPdf(bytes:Uint8Array){
    const response=await create.POST(json({size:bytes.length}));assert.equal(response.status,201);
    const {id}=await response.json();
    for(let i=0;i<Math.ceil(bytes.length/uploads.UPLOAD_CHUNK_BYTES);i++){
      const part=bytes.slice(i*uploads.UPLOAD_CHUNK_BYTES,(i+1)*uploads.UPLOAD_CHUNK_BYTES);
      const response=await chunk.PUT(new Request(`http://localhost:3000/api/admin/book-uploads/${id}/chunks/${i}`,{method:"PUT",headers:{origin:"http://localhost:3000","x-chunk-sha256":createHash("sha256").update(part).digest("hex")},body:part}),{params:Promise.resolve({id,index:String(i)})});
      assert.equal(response.status,200);
    }
    return id as string;
  }
  try{
    signedIn=false;assert.equal((await create.POST(json({size:10}))).status,401);signedIn=true;
    assert.equal((await create.POST(json({size:10},undefined,"https://evil.test"))).status,403);
    assert.equal((await create.POST(json({size:NaN}))).status,400);
    assert.equal((await create.POST(json({size:50*1024*1024+1}))).status,413);
    const actual=await readFile(path.join(process.cwd(),"docs/reference/Nana dan Kerajaan di Atas Awan.pdf"));
    const id=await sendPdf(new Uint8Array(actual));
    owner="other-admin";
    assert.equal((await status.GET(new Request(`http://localhost:3000/api/admin/book-uploads/${id}`),{params:Promise.resolve({id})})).status,404);
    owner="admin-one";
    const incomplete=await uploads.createUploadSession(owner,12);
    assert.equal((await chunk.PUT(new Request("http://localhost/chunk",{method:"PUT",headers:{origin:"http://localhost:3000"},body:new Uint8Array(uploads.UPLOAD_CHUNK_BYTES+1)}),{params:Promise.resolve({id:incomplete.id,index:"0"})})).status,413);
    assert.equal((await final.POST(json({...metadata,uploadId:incomplete.id}))).status,409);
    await uploads.deleteUploadSession(owner,incomplete.id);
    const first=await final.POST(json({...metadata,uploadId:id}));assert.equal(first.status,200);assert.equal(writes,1);
    const repeated=await Promise.all([final.POST(json({...metadata,uploadId:id})),final.POST(json({...metadata,uploadId:id}))]);
    assert.deepEqual(repeated.map(r=>r.status),[200,200]);assert.equal(writes,1,"same session creates one book only, including concurrent repeats");
    assert.equal((await final.POST(json({...metadata,title:"changed",uploadId:id}))).status,409);
    const row=books.get(id)!;assert.equal(row[8],15);
    assert.deepEqual(await readFile(path.join(root,"books",String(row[6]))),actual);
    const sharp=(await import("sharp")).default;const cover=await sharp(path.join(root,"covers",String(row[7]))).metadata();assert.equal(cover.width,900);assert.equal(cover.height,900);
    assert.deepEqual(await readdir(path.join(root,"upload-sessions",id)),["session.json"],"chunks removed after confirmed commit");
    const statusPayload=await (await status.GET(new Request(`http://localhost:3000/api/admin/book-uploads/${id}`),{params:Promise.resolve({id})})).json();
    assert.equal(statusPayload.sourceChecksum,createHash("sha256").update(actual).digest("hex"));

    const doc=await PDFDocument.create();doc.addPage([100,100]);const secondId=await sendPdf(new Uint8Array(await doc.save()));
    failCommit=true;
    assert.equal((await final.POST(json({...metadata,slug:"second",uploadId:secondId}))).status,503);
    assert.equal((await readdir(path.join(root,"books"))).length,2,"uncertain COMMIT never deletes committed file");
    unavailable=false;
    assert.equal((await final.POST(json({...metadata,slug:"second",uploadId:secondId}))).status,200);
    assert.equal(writes,2,"reconcile instead of repeat INSERT");
    assert.equal((await readdir(path.join(root,"books"))).length,2);

    const concurrent=await Promise.allSettled([uploads.createUploadSession(owner,10),uploads.createUploadSession(owner,10),uploads.createUploadSession(owner,10),uploads.createUploadSession(owner,10)]);
    assert.equal(concurrent.filter(v=>v.status==="fulfilled").length,3);
    assert.equal(concurrent.filter(v=>v.status==="rejected").length,1);
    for(const attempt of concurrent)if(attempt.status==="fulfilled")await uploads.deleteUploadSession(owner,attempt.value.id);
    // Global disk reservation cannot be bypassed by using different admins.
    const reserved=[];
    for(let i=0;i<10;i++)reserved.push(await uploads.createUploadSession(`owner-${i}`,50*1024*1024));
    await assert.rejects(uploads.createUploadSession("overflow",50*1024*1024),{status:507});
    for(let i=0;i<reserved.length;i++)await uploads.deleteUploadSession(`owner-${i}`,reserved[i].id);
  }finally{
    mock.restoreAll();delete (globalThis as unknown as {nanaPool?:Pool}).nanaPool;await pool.end();await rm(root,{recursive:true,force:true});
  }
});
