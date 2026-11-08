import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { bookInput } from "../src/lib/validation";
import { unlockStory, storyAccessKey } from "../src/lib/story-access-client";

const metadata={title:"Cerita",slug:"locked",description:"",author:"Studio",categories:[],status:"published" as const};
test("access input remains optional, string-only, bounded and preserves case",()=>{
  assert.equal(bookInput.parse(metadata).accessCode,"");
  assert.equal(bookInput.parse({...metadata,accessCode:"NaNa20256"}).accessCode,"NaNa20256");
  for(const accessCode of [12,null,"a".repeat(129)])assert.equal(bookInput.safeParse({...metadata,accessCode}).success,false);
});

test("additive migration, atomic code writes, lifetime proofs, API and file authorization enforce access and revocation",async()=>{
  process.env.BETTER_AUTH_SECRET="story-access-test-signing-secret-not-production";
  process.env.BETTER_AUTH_URL="http://localhost:3000";
  const storage=await mkdtemp(path.join(tmpdir(),"pikso-access-test-"));
  process.env.STORAGE_DIR=storage;await mkdir(path.join(storage,"books"));await writeFile(path.join(storage,"books","aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf"),Buffer.from("%PDF-test-only"));
  const db=new PGlite();const pool=new Pool({connectionString:"postgresql://test:test@127.0.0.1:1/test"});
  (globalThis as unknown as {nanaPool:Pool}).nanaPool=pool;
  let failCategories=false;
  const query=async(sql:string,values:unknown[]=[])=>{
    if(failCategories&&sql.startsWith("DELETE FROM tr_book_category"))throw new Error("test rollback");
    const result=await db.query(sql,values);return {...result,rowCount:result.affectedRows??result.rows.length};
  };
  mock.method(pool,"query",query);mock.method(pool,"connect",async()=>({query,release(){}}));
  try{
    for(const id of ["001-initial","002-book-categories"])await db.exec(await readFile(new URL(`../db/${id}.sql`,import.meta.url),"utf8"));
    await db.query("INSERT INTO books(slug,title,pdf_path,cover_path,pdf_pages) VALUES('legacy','Legacy','a.pdf','b.webp',1)");
    const sql=await readFile(new URL("../db/003-book-access-codes.sql",import.meta.url),"utf8");await db.exec(sql);await db.exec(sql);
    const salesSql=await readFile(new URL("../db/004-book-sales-link.sql",import.meta.url),"utf8");await db.exec(salesSql);await db.exec(salesSql);
    const legacy=await db.query<{access_code_hash:null;access_version:string}>("SELECT access_code_hash,access_version FROM books WHERE slug='legacy'");
    assert.equal(legacy.rows[0].access_code_hash,null);assert.match(legacy.rows[0].access_version,/^[0-9a-f-]{36}$/);
    const {writeBook}=await import("../src/lib/book-write");
    const {getPublicBook,getAdminBook,listBooks}=await import("../src/lib/books");
    const {getBookAccess,issueAccessProof,validAccessProof,verifyAccessCode,canReadBook,accessCookieName,allowAccessAttempt}=await import("../src/lib/book-access");
    const {POST}=await import("../src/app/api/books/[slug]/access/route");
    const file=await import("../src/app/api/books/[slug]/file/route");
    const id="11111111-1111-4111-8111-111111111111";
    await writeBook(id,{...metadata,accessCode:"NanaTest20256"},{pdf:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf",cover:"not-present.webp",pages:1});
    const book=(await getPublicBook("locked"))!;assert.equal(book.access_locked,true);
    assert.ok(!("access_code_hash" in book)&&!("access_version" in book));
    assert.ok(!("access_code_hash" in (await getAdminBook(id))!));
    assert.ok(!JSON.stringify(await listBooks(1)).includes("NanaTest20256"));
    const access=(await getBookAccess(id))!;assert.notEqual(access.access_code_hash,"NanaTest20256");
    assert.ok(await verifyAccessCode(access,"NanaTest20256"));assert.equal(await verifyAccessCode(access,"nanatest20256"),false);
    const proof=issueAccessProof(access);assert.ok(validAccessProof(access,proof));
    assert.equal(validAccessProof({...access,id:"other"},proof),false);
    for(const token of ["",proof+"x","v1."+"A".repeat(43),"../invalid",null])assert.equal(validAccessProof(access,token),false);
    // No issued-at/expiry field or time comparison: even large clock changes do not expire a proof.
    mock.method(Date,"now",()=>Date.UTC(2099,0,1));assert.ok(validAccessProof(access,proof));mock.restoreAll();
    mock.method(pool,"query",query);mock.method(pool,"connect",async()=>({query,release(){}}));
    assert.equal(await canReadBook(book,new Headers()),false);
    const cookie=`${accessCookieName(id)}=${proof}`;assert.ok(await canReadBook(book,new Headers({cookie})));
    const context={params:Promise.resolve({slug:"locked"})};
    const post=(body:unknown,origin="http://localhost:3000",cookieValue?:string)=>POST(new Request("http://localhost:3000/api/books/locked/access",{method:"POST",headers:{origin,"content-type":"application/json",...(cookieValue?{cookie:cookieValue}:{})},body:JSON.stringify(body)}),context);
    assert.equal((await post({code:"NanaTest20256"},"https://evil.test")).status,403);
    assert.equal((await post({code:"wrong"})).status,403);
    assert.equal((await post({code:123})).status,403);
    assert.equal((await post(null)).status,400);
    assert.equal((await post({code:"a".repeat(3000)})).status,413);
    const response=await post({code:"NanaTest20256"});assert.equal(response.status,200);
    const result=await response.json();assert.equal(result.proof,proof);assert.ok(!JSON.stringify(result).includes("NanaTest20256"));
    const setCookie=response.headers.get("set-cookie")!;assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/SameSite=lax/);assert.doesNotMatch(setCookie,/Expires|Max-Age/);
    assert.equal(response.headers.get("cache-control"),"private, no-store");
    assert.equal((await post({proof})).status,200);assert.equal((await post({},"http://localhost:3000",cookie)).status,200);
    for(const method of ["GET","HEAD"]){
      const handler=method==="HEAD"?file.HEAD:file.GET;
      for(const headers of [{},{range:"bytes=0-4"},{"if-none-match":"*"}] as Record<string,string>[]){
        const denied=await handler(new Request("http://localhost:3000/api/books/locked/file",{method,headers}),context);
        assert.equal(denied.status,401);assert.equal(denied.headers.get("cache-control"),"private, no-store");assert.equal(denied.headers.get("etag"),null);
      }
      const granted=await handler(new Request("http://localhost:3000/api/books/locked/file",{method,headers:{cookie,range:"bytes=0-4","if-none-match":"*"}}),context);
      assert.equal(granted.status,method==="HEAD"?200:206);assert.equal(granted.headers.get("cache-control"),"private, no-store");assert.equal(granted.headers.get("x-pikso-pdf-cache"),"memory-only");
      if(method==="GET")assert.equal(await granted.text(),"%PDF-");
    }
    const version=access.access_version;
    await writeBook(id,{...metadata,title:"Changed",accessCode:"NanaTest20256"});
    const editedAccess=(await getBookAccess(id))!;assert.notEqual(editedAccess.access_version,version);
    assert.ok(await verifyAccessCode(editedAccess,"NanaTest20256"));
    assert.equal(await canReadBook(book,new Headers({cookie})),false);
    assert.equal((await post({proof})).status,403);assert.equal((await post({code:"NanaTest20256"})).status,200);
    const currentProof=issueAccessProof(editedAccess);const currentCookie=`${accessCookieName(id)}=${currentProof}`;
    assert.ok(await canReadBook(book,new Headers({cookie:currentCookie})));
    const currentVersion=editedAccess.access_version;
    failCategories=true;await assert.rejects(writeBook(id,{...metadata,accessCode:"RollbackTest"}));failCategories=false;
    assert.equal((await getBookAccess(id))!.access_version,currentVersion);assert.ok(await canReadBook(book,new Headers({cookie:currentCookie})));
    await writeBook(id,{...metadata,accessCode:"ReplacementTest"});
    assert.notEqual((await getBookAccess(id))!.access_version,currentVersion);assert.equal(await canReadBook(book,new Headers({cookie:currentCookie})),false);
    assert.equal((await post({proof:currentProof})).status,403);assert.equal((await post({code:"NanaTest20256"})).status,403);
    assert.equal((await post({code:"ReplacementTest"})).status,200);
    await writeBook(id,{...metadata,accessCode:""});
    assert.equal((await getPublicBook("locked"))!.access_locked,false);assert.equal((await getBookAccess(id))!.access_code_hash,null);
    assert.equal((await post({})).status,200);
    await writeBook(id,{...metadata,accessCode:"AnotherTest"});assert.equal((await post({proof})).status,403);
    await writeBook(id,{...metadata,status:"draft"});assert.equal((await post({code:"AnotherTest"})).status,404);
    assert.equal((await file.HEAD(new Request("http://localhost:3000/api/books/locked/file",{method:"HEAD",headers:{cookie}}),context)).status,404);
    for(let i=0;i<20;i++)assert.ok(allowAccessAttempt("rate-test",1000));assert.equal(allowAccessAttempt("rate-test",1000),false);assert.ok(allowAccessAttempt("rate-test",62000));
  }finally{mock.restoreAll();delete (globalThis as unknown as {nanaPool?:Pool}).nanaPool;await pool.end();await db.close();await rm(storage,{recursive:true,force:true});delete process.env.STORAGE_DIR;}
});

test("browser helper retains only a lifetime proof, restores sessions and tolerates unavailable storage",async()=>{
  const entries=new Map<string,string>();const storage={getItem:(key:string)=>entries.get(key)??null,setItem:(key:string,value:string)=>{entries.set(key,value);},removeItem:(key:string)=>{entries.delete(key);}};
  const calls:{url:string;init:RequestInit}[]=[];
  const fetcher=(async(url:unknown,init:RequestInit)=>{calls.push({url:String(url),init});return Response.json({ok:true,proof:"signed-test-proof"});}) as typeof fetch;
  await unlockStory("story","id","NanaTestCode",storage,fetcher);
  assert.equal(entries.get(storyAccessKey("id")),"signed-test-proof");assert.ok(!JSON.stringify([...entries]).includes("NanaTestCode"));
  await unlockStory("story","id",undefined,storage,fetcher);
  assert.deepEqual(JSON.parse(String(calls[1].init.body)),{proof:"signed-test-proof"});
  assert.equal(calls[1].init.cache,"no-store");assert.equal(calls[1].init.credentials,"same-origin");assert.ok(!calls[1].url.includes("proof"));
  const denied=(async()=>Response.json({error:"Incorrect"},{status:403})) as typeof fetch;
  await assert.rejects(unlockStory("story","id",undefined,storage,denied),/Incorrect/);assert.equal(entries.has(storyAccessKey("id")),false);
  const unavailable={getItem(){throw new Error("denied");},setItem(){throw new Error("denied");},removeItem(){throw new Error("denied");}};
  await unlockStory("story","id","NanaTestCode",unavailable,fetcher);
});
