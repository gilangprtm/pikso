import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { mock } from "node:test";
import { PDFDocument, rgb } from "pdf-lib";
import sharp from "sharp";
import { Pool } from "pg";

// Test process only: never connects to the application database or storage.
test("PDF-only upload validates input, stores an automatic square cover and cleans up failed inserts", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pikso-cover-test-"));
  process.env.STORAGE_DIR = root;
  process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
  process.env.BETTER_AUTH_SECRET = "isolated-test-secret-not-for-production-123456";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  let failInsert = false;
  let failRelation = false;
  const inserts: unknown[][] = [];
  const categoryNames: string[] = [];
  const pool = new Pool({connectionString:process.env.DATABASE_URL});
  const query = async (sql:string, values:unknown[]) => {
    if (sql.startsWith("INSERT INTO books")) {
      if (failInsert) throw Object.assign(new Error("duplicate"), {code:"23505"});
      inserts.push(values);
    }
    if (sql.startsWith("INSERT INTO m_book_category")) {
      categoryNames.push(values[0] as string);
      return {rows:[{id:values[0],name:values[0]}],rowCount:1};
    }
    if (sql === "BEGIN") categoryNames.length = 0;
    if (failRelation && sql.startsWith("INSERT INTO tr_book_category")) throw new Error("relation insert failed");
    return {rows:[],rowCount:1};
  };
  mock.method(pool,"connect", async () => ({query, release() {}}));
  (globalThis as unknown as { nanaPool: Pool }).nanaPool = pool;
  try {
    const largeValidPdf = await PDFDocument.create();
    for (let page = 0; page < 501; page++) largeValidPdf.addPage([20, 20]);
    const tooManyPageBytes = await largeValidPdf.save();
    const tooManyPages = new File([new Uint8Array(tooManyPageBytes).buffer as ArrayBuffer], "large.pdf", {type:"application/pdf"});
    const oversizedPdf = new File([new Uint8Array(50 * 1024 * 1024 + 1)], "oversized.pdf", {type:"application/pdf"});
    const {getAuth} = await import("../src/lib/auth");
    let signedIn = true;
    mock.method(getAuth().api, "getSession", async () => signedIn ? {user:{id:"test",role:"admin"}} : null);
    const { POST } = await import("../src/app/api/admin/books/route");
    const pdf = await PDFDocument.create();
    pdf.addPage([200,100]).drawRectangle({x:0,y:0,width:200,height:100,color:rgb(1,0,0)});
    const bytes = new Uint8Array(await pdf.save());
    function request(file?:File, origin="http://localhost:3000") {
      const form=new FormData();
      for(const [key,value] of Object.entries({title:"Test",slug:"test",status:"draft"})) form.set(key,value);
      if(file)form.set("pdf",file);
      form.append("categories","Petualangan");
      form.append("categories","Fantasi");
      return new Request("http://localhost:3000/api/admin/books",{method:"POST",headers:{origin},body:form});
    }
    const file = () => new File([bytes],"story.pdf",{type:"application/pdf"});
    assert.equal((await POST(request(file(),"https://untrusted.test"))).status,403);
    signedIn=false;
    assert.equal((await POST(request(file()))).status,401);
    signedIn=true;
    assert.equal((await POST(request())).status,400);
    assert.equal((await POST(request(new File(["not a PDF"],"bad.pdf",{type:"application/pdf"})))).status,400);
    assert.equal((await POST(request(new File([bytes],"bad.txt",{type:"text/plain"})))).status,400);
    // Oversized uploads return a specific 413 JSON error before PDF parsing/storage.
    const oversizedResponse = await POST(request(oversizedPdf));
    assert.equal(oversizedResponse.status,413);
    assert.match((await oversizedResponse.json()).error,/50\.00 MiB.*50 MiB/);
    // Page limits are still rejected by the single PDF.js open/render pass.
    assert.equal((await POST(request(tooManyPages))).status,400);
    assert.equal(inserts.length,0);
    // A valid PDF padded to exactly 50 MiB must pass the multipart reader too.
    const boundaryPdf = new Uint8Array(50 * 1024 * 1024).fill(32);
    boundaryPdf.set(bytes);
    const response = await POST(request(new File([boundaryPdf],"boundary.pdf",{type:"application/pdf"})));
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{ok:true});
    assert.equal(inserts.length,1);
    assert.deepEqual(categoryNames,["Fantasi","Petualangan"]);
    const covers = await readdir(path.join(root,"covers"));
    const books = await readdir(path.join(root,"books"));
    assert.equal(covers.length,1);
    assert.equal(books.length,1);
    assert.deepEqual(new Uint8Array(await readFile(path.join(root,"books",books[0]))),boundaryPdf);
    const meta=await sharp(await readFile(path.join(root,"covers",covers[0]))).metadata();
    assert.equal(meta.width,900);
    assert.equal(meta.height,900);
    assert.equal(meta.format,"webp");
    assert.equal(inserts[0][5],"draft");
    assert.equal(inserts[0][8],1);
    failInsert=true;
    assert.equal((await POST(request(file()))).status,409);
    assert.deepEqual(await readdir(path.join(root,"covers")),covers);
    assert.deepEqual(await readdir(path.join(root,"books")),books);
    failInsert=false;
    failRelation=true;
    assert.equal((await POST(request(file()))).status,400);
    assert.deepEqual(await readdir(path.join(root,"covers")),covers);
    assert.deepEqual(await readdir(path.join(root,"books")),books);
  } finally {
    mock.restoreAll();
    delete (globalThis as unknown as {nanaPool?:Pool}).nanaPool;
    await pool.end();
    await rm(root,{recursive:true,force:true});
  }
});
