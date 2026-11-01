import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

const sha=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");

test("private resumable uploads enforce ownership, sequential idempotent chunks, resume checksums, cancellation and expiry",async()=>{
  const root=await mkdtemp(path.join(tmpdir(),"pikso-resumable-test-"));
  process.env.STORAGE_DIR=root;
  const uploads=await import("../src/lib/resumable-upload");
  const owner="admin-test";
  const pdf=new Uint8Array(uploads.UPLOAD_CHUNK_BYTES+17);pdf.set(new TextEncoder().encode("%PDF-1.7"));
  const session=await uploads.createUploadSession(owner,pdf.length);
  assert.equal((await uploads.getUploadStatus(owner,session.id)).confirmedChunks,0);
  await assert.rejects(uploads.getUploadStatus("another-admin",session.id),{status:404});
  const first=pdf.slice(0,uploads.UPLOAD_CHUNK_BYTES),last=pdf.slice(uploads.UPLOAD_CHUNK_BYTES);
  await assert.rejects(uploads.storeUploadChunk(owner,session.id,1,last,sha(last)),{status:409});
  await assert.rejects(uploads.storeUploadChunk(owner,session.id,0,first,"0".repeat(64)),{status:422});
  assert.equal((await uploads.storeUploadChunk(owner,session.id,0,first,sha(first))).checksum,sha(first));
  assert.equal((await uploads.storeUploadChunk(owner,session.id,0,first,sha(first))).checksum,sha(first),"lost response retry is idempotent");
  const changed=new Uint8Array(first);changed[10]=1;
  await assert.rejects(uploads.storeUploadChunk(owner,session.id,0,changed,sha(changed)),{status:409});
  await assert.rejects(uploads.storeUploadChunk(owner,session.id,0,first.slice(1),sha(first.slice(1))),{status:400});
  await assert.rejects(uploads.getUploadStatus(owner,"../../etc"),{status:400});
  const resumed=await uploads.getUploadStatus(owner,session.id);
  assert.equal(resumed.confirmedChunks,1);
  assert.deepEqual(resumed.hashes,[sha(first)]);
  await uploads.storeUploadChunk(owner,session.id,1,last,sha(last));
  assert.deepEqual(await uploads.assembleUpload(owner,session.id),Buffer.from(pdf));
  const dir=path.join(root,"upload-sessions",session.id);
  await uploads.purgeExpiredUploads(Date.now()+uploads.UPLOAD_TTL_MS+1000);
  await assert.rejects(stat(dir));

  const cancelled=await uploads.createUploadSession(owner,8);
  await uploads.deleteUploadSession(owner,cancelled.id);
  await assert.rejects(uploads.getUploadStatus(owner,cancelled.id),{status:404});
  const expired=await uploads.createUploadSession(owner,8);
  // Use access-time enforcement independently of the janitor sweep.
  const sessionFile=path.join(root,"upload-sessions",expired.id,"session.json");
  const current=JSON.parse(await readFile(sessionFile,"utf8"));current.expiresAt=Date.now()-1;
  const {writeFile}=await import("node:fs/promises");await writeFile(sessionFile,JSON.stringify(current));
  await assert.rejects(uploads.getUploadStatus(owner,expired.id),{status:410});
  await rm(root,{recursive:true,force:true});
});

test("resumable client verifies PDF signature, checks resumed bytes, chunks sequentially and keeps finalization separate",async()=>{
  const client=await import("../src/lib/resumable-upload-client");
  const pdfBytes=new Uint8Array(uploadsSize()+9);pdfBytes.set(new TextEncoder().encode("%PDF-1.7"));
  const file=new File([pdfBytes],"story.pdf",{type:"application/pdf",lastModified:123});
  const original=globalThis.fetch;
  const seen:Array<{url:string;method:string;length:number}> = [];
  const {UPLOAD_CHUNK_BYTES}=await import("../src/lib/resumable-upload");
  const checksums:string[]=[];
  let confirmed=0;
  let loseFirstResponse=true;
  globalThis.fetch=async(input,init={})=>{
    const url=String(input),method=init.method??"GET";const body=init.body;
    const length=body instanceof Blob?body.size:body instanceof ArrayBuffer?body.byteLength:0;
    seen.push({url,method,length});
    if(url==="/api/admin/book-uploads"&&method==="POST")return Response.json({id:"11111111-1111-4111-8111-111111111111",size:file.size,chunkBytes:UPLOAD_CHUNK_BYTES,expiresAt:Date.now()+10000},{status:201});
    if(url.endsWith("/api/admin/book-uploads/11111111-1111-4111-8111-111111111111")){return Response.json({size:file.size,chunkBytes:UPLOAD_CHUNK_BYTES,confirmedChunks:confirmed,hashes:checksums});}
    const match=url.match(/chunks\/(\d+)$/);
    if(match&&method==="PUT"){
      const index=Number(match[1]);const checksum=String((init.headers as Record<string,string>)["X-Chunk-SHA256"]);
      assert.equal(checksum,await client.chunkChecksum(body as Blob));
      if(index===0){checksums[0]=checksum;confirmed=1;}
      else{checksums[index]=checksum;confirmed=index+1;}
      if(index===0&&loseFirstResponse){loseFirstResponse=false;throw new TypeError("lost response after stored part");}
      return Response.json({index,checksum});
    }
    throw new Error(`unexpected request ${method} ${url}`);
  };
  try{
    const controller=new AbortController();const progress:Array<{phase:string;percent:number}>=[];let sessionId="";
    const id=await client.uploadPdfInChunks(file,{signal:controller.signal,onSession:value=>sessionId=value,onProgress:value=>progress.push(value)});
    assert.equal(id,sessionId);
    assert.deepEqual(seen.filter(item=>item.method==="PUT").map(item=>item.length),[UPLOAD_CHUNK_BYTES,UPLOAD_CHUNK_BYTES,9]);
    assert.equal(progress.at(-1)?.phase,"ready");
    assert.match(client.uploadResumeKey(file),/^pikso-upload:/);
    const firstRun=seen.length;confirmed=1;checksums.length=1;
    await client.uploadPdfInChunks(file,{signal:new AbortController().signal,sessionId:id,onSession(){},onProgress(){}});
    assert.deepEqual(seen.slice(firstRun).filter(item=>item.method==="PUT").map(item=>item.length),[9],"resume never resends confirmed first part");
    const wrongBytes=new Uint8Array(pdfBytes);wrongBytes[100]=99;
    await assert.rejects(client.uploadPdfInChunks(new File([wrongBytes],"story.pdf",{type:"application/pdf"}),{signal:new AbortController().signal,sessionId:id,onSession(){},onProgress(){}}),/berbeda/);
    let finalCalls=0;
    globalThis.fetch=async(input,init)=>{finalCalls++;assert.match(String(input),/books\/finalize$/);assert.ok(String(init?.body).includes(id));throw new TypeError("lost final response");};
    await assert.rejects(client.finalizeUploadedBook(id,{title:"Test"}),/tanpa membuat buku ganda/);
    assert.equal(finalCalls,1,"book finalization never retries automatically");
    await assert.rejects(client.uploadPdfInChunks(new File(["not pdf"],"bad.pdf",{type:"application/pdf"}),{signal:new AbortController().signal,onSession(){},onProgress(){}}),/bukan PDF/);
  }finally{globalThis.fetch=original;}
});
function uploadsSize(){return 1024*1024;}
