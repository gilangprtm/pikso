import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, open, stat, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import ts from "typescript";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const localRequire=createRequire(import.meta.url);
function loadServeFile(overrides:Record<string,unknown>={}) {
  const source = readFile("src/lib/serve-file.ts", "utf8");
  return source.then(text => {
    const js = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
    const exports: { serveFile?: (request: Request, kind: "books" | "covers", filename: string, options?: {revalidate?:boolean}) => Promise<Response> } = {};
    new Function("require", "exports", js)((id: string) => id in overrides ? overrides[id] : id === "@/lib/storage" ? { absoluteStoragePath: (_kind: string, filename: string) => path.join((globalThis as unknown as {__readerStorage:string}).__readerStorage, filename) } : localRequire(id), exports);
    return exports.serveFile!;
  });
}

test("PDF file handler serves bounded byte ranges, HEAD, validators and preserves private no-store defaults",async()=>{
  const root=await mkdtemp(path.join(tmpdir(),"pikso-reader-serve-"));
  (globalThis as unknown as {__readerStorage:string}).__readerStorage=root;
  const bytes=Buffer.from(Array.from({length:1024*1024+17},(_,i)=>i%251));
  await writeFile(path.join(root,"book.pdf"),bytes);
  const serveFile=await loadServeFile();
  try{
    const request=(headers:Record<string,string>={},method="GET")=>new Request("http://localhost/file",{method,headers});
    let response=await serveFile(request({range:"bytes=0-65535"}),"books","book.pdf",{revalidate:true});
    assert.equal(response.status,206);assert.equal(response.headers.get("content-range"),`bytes 0-65535/${bytes.length}`);assert.equal(response.headers.get("content-length"),"65536");assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes.subarray(0,65536));
    const etag=response.headers.get("etag")!;assert.match(etag,/^"[a-f0-9]{64}"$/);assert.match(response.headers.get("cache-control")!,/private/);assert.match(response.headers.get("cache-control")!,/must-revalidate/);
    response=await serveFile(request({range:"bytes=-10"}),"books","book.pdf",{revalidate:true});assert.equal(response.status,206);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes.subarray(-10));
    response=await serveFile(request({range:"bytes=0-99999999"}),"books","book.pdf",{revalidate:true});assert.equal(response.status,206);assert.equal(response.headers.get("content-range"),`bytes 0-${bytes.length-1}/${bytes.length}`);await response.body?.cancel();
    response=await serveFile(request({range:"bytes=0-9", "if-range":"\"stale\""}),"books","book.pdf",{revalidate:true});assert.equal(response.status,200);assert.equal(Number(response.headers.get("content-length")),bytes.length);await response.body?.cancel();
    response=await serveFile(request({"if-none-match":etag}),"books","book.pdf",{revalidate:true});assert.equal(response.status,304);assert.equal(response.body,null);
    response=await serveFile(request({range:"bytes=0-9"}),"books","book.pdf",{revalidate:true});const head=await serveFile(request({range:"bytes=0-9"},"HEAD"),"books","book.pdf",{revalidate:true});assert.equal(head.status,200);assert.equal(head.headers.get("content-length"),String(bytes.length));assert.equal(await head.text(),"");await response.body?.cancel();
    response=await serveFile(request({range:"bytes=99999999-"}),"books","book.pdf",{revalidate:true});assert.equal(response.status,416);assert.equal(response.headers.get("content-range"),`bytes */${bytes.length}`);
    response=await serveFile(request(),"covers","book.pdf");assert.equal(response.headers.get("cache-control"),"private, no-store");await response.body?.cancel();
    const cover=await serveFile(request(),"covers","book.pdf",{revalidate:true});const coverEtag=cover.headers.get("etag")!;assert.equal(cover.status,200);assert.equal(cover.headers.get("cache-control"),"private, max-age=0, must-revalidate");await cover.body?.cancel();
    const cachedCover=await serveFile(request({"if-none-match":coverEtag}),"covers","book.pdf",{revalidate:true});assert.equal(cachedCover.status,304);assert.equal(cachedCover.body,null);assert.equal(cachedCover.headers.get("etag"),coverEtag);
    response=await serveFile(request(),"books","missing.pdf",{revalidate:true});assert.equal(response.status,404);
    const modified=(await serveFile(request({},"HEAD"),"books","book.pdf",{revalidate:true})).headers.get("last-modified")!;
    for(const headers of [{"if-none-match":`W/${etag}`},{"if-none-match":`\"other\", ${etag}`},{"if-modified-since":modified}] as Record<string,string>[])assert.equal((await serveFile(request(headers),"books","book.pdf",{revalidate:true})).status,304);
    response=await serveFile(request({"if-none-match":"\"other\"","if-modified-since":modified}),"books","book.pdf",{revalidate:true});assert.equal(response.status,200);await response.body?.cancel();
    response=await serveFile(request({"if-none-match":etag}),"books","book.pdf");assert.equal(response.status,200);assert.equal(response.headers.get("cache-control"),"private, no-store");await response.body?.cancel();
    const dbRows=new Map([["published",{status:"published",pdf_path:"book.pdf"}],["draft",{status:"draft",pdf_path:"book.pdf"}]]);
    assert.match(readFileSync("src/lib/books.ts","utf8"),/WHERE slug = \$1 AND status = 'published'/);
    const routeOverrides:Record<string,unknown>={"@/lib/book-access":{canReadBook:async()=>true},"@/lib/books":{getPublicBook:async(slug:string)=>dbRows.get(slug)?.status==="published"?dbRows.get(slug):null},"@/lib/serve-file":{serveFile:async(_request:Request,_kind:string,_filename:string,options:unknown)=>({status:200,options})}};
    const routeSource=readFileSync("src/app/api/books/[slug]/file/route.ts","utf8");
    const routeJs=ts.transpileModule(routeSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
    const routeExports:Record<string,(request:Request,context:{params:Promise<{slug:string}>})=>Promise<{status:number;options?:unknown}>>={};
    new Function("require","exports",routeJs)((id:string)=>routeOverrides[id],routeExports);
    assert.deepEqual((await routeExports.GET(request(),{params:Promise.resolve({slug:"published"})})).options,{revalidate:true});
    const denied=await routeExports.GET(request(),{params:Promise.resolve({slug:"draft"})});assert.equal(denied.status,404);
    const absent=await routeExports.GET(request(),{params:Promise.resolve({slug:"missing"})});assert.equal(absent.status,404);
    assert.equal(typeof routeExports.HEAD,"function");
    const coverSource=readFileSync("src/app/api/books/[slug]/cover/route.ts","utf8");
    const coverJs=ts.transpileModule(coverSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
    let coverLookup=0;const coverRows=new Map([["published",{status:"published",cover_path:"cover.webp"}],["draft",{status:"draft",cover_path:"draft.webp"}]]);
    const coverOverrides:Record<string,unknown>={"@/lib/books":{getPublicBook:async(slug:string)=>{coverLookup++;const row=coverRows.get(slug);return row?.status==="published"?row:null;}},"@/lib/serve-file":{serveFile:async(_request:Request,kind:string,filename:string,options:unknown)=>({status:200,kind,filename,options})}};
    const coverExports:Record<string,(request:Request,context:{params:Promise<{slug:string}>})=>Promise<{status:number;kind?:string;filename?:string;options?:unknown}>>={};
    new Function("require","exports",coverJs)((id:string)=>coverOverrides[id],coverExports);
    const servedCover=await coverExports.GET(request(),{params:Promise.resolve({slug:"published"})});assert.equal(servedCover.kind,"covers");assert.equal(servedCover.filename,"cover.webp");assert.deepEqual(servedCover.options,{revalidate:true});
    const lookupsBeforeDraft=coverLookup;const draftCover=await coverExports.GET(request({"if-none-match":coverEtag}),{params:Promise.resolve({slug:"draft"})});assert.equal(draftCover.status,404);assert.equal((draftCover as Response).headers.get("cache-control"),"private, no-store");assert.equal(coverLookup,lookupsBeforeDraft+1);
    assert.equal((await coverExports.GET(request(),{params:Promise.resolve({slug:"missing"})})).status,404);
    for(const range of ["bytes=-0","bytes=-","bytes=5-2","bytes=0-1,4-5","bytes=99999999999999999999999-"]){assert.equal((await serveFile(request({range}),"books","book.pdf")).status,416);}
    response=await serveFile(request({range:"bytes=1048576-"}),"books","book.pdf");assert.equal(response.status,206);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes.subarray(1048576));
    response=await serveFile(request({range:"bytes=2-4","if-range":etag}),"books","book.pdf",{revalidate:true});assert.equal(response.status,206);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes.subarray(2,5));
    await writeFile(path.join(root,"book.pdf"),Buffer.from("different version"));
    response=await serveFile(request({"if-none-match":etag}),"books","book.pdf",{revalidate:true});assert.equal(response.status,200);assert.notEqual(response.headers.get("etag"),etag);await response.body?.cancel();
    response=await serveFile(request({"if-none-match":coverEtag}),"covers","book.pdf",{revalidate:true});assert.equal(response.status,200);assert.notEqual(response.headers.get("etag"),coverEtag);assert.equal(await response.text(),"different version");
  }finally{delete (globalThis as unknown as {__readerStorage?:string}).__readerStorage;await rm(root,{recursive:true,force:true});}
});

test("file streams read only on demand in 64KiB bounds and close descriptors after cancellation",async()=>{
  const root=await mkdtemp(path.join(tmpdir(),"pikso-reader-io-"));
  (globalThis as unknown as {__readerStorage:string}).__readerStorage=root;
  await writeFile(path.join(root,"book.pdf"),Buffer.alloc(1024*1024));
  const reads:number[]=[];let closes=0;
  const serveFile=await loadServeFile({"node:fs/promises":{stat,open:async(...args:Parameters<typeof open>)=>{
    const file=await open(...args);
    return {read:async(buffer:Buffer,offset:number,length:number,position:number)=>{reads.push(length);return file.read(buffer,offset,length,position);},close:async()=>{closes++;await file.close();}};
  }}});
  try{
    const response=await serveFile(new Request("http://local/file"),"books","book.pdf");
    assert.equal(reads.length,0,"creating a response must not read the whole PDF");
    const reader=response.body!.getReader();const result=await reader.read();assert.equal(result.value!.length,65536);
    assert.deepEqual(reads,[65536]);await reader.cancel();assert.equal(closes,1);
    const partial=await serveFile(new Request("http://local/file",{headers:{range:"bytes=100-109"}}),"books","book.pdf");
    assert.equal((await partial.arrayBuffer()).byteLength,10);assert.deepEqual(reads,[65536,10]);assert.equal(closes,2);
  }finally{delete (globalThis as unknown as {__readerStorage?:string}).__readerStorage;await rm(root,{recursive:true,force:true});}
});

test("PDF.js parses first page through demand-driven HTTP ranges without transferring the full reference file",async()=>{
  const root=await mkdtemp(path.join(tmpdir(),"pikso-reader-pdf-"));
  (globalThis as unknown as {__readerStorage:string}).__readerStorage=root;
  const pdfBytes=await readFile("docs/reference/Nana dan Kerajaan di Atas Awan.pdf");
  await writeFile(path.join(root,"book.pdf"),pdfBytes);
  const serveFile=await loadServeFile();const ranges:{header:string|null;status:number;bytes:number}[]=[];
  const server:Server=createServer(async(req,res)=>{
    const headers=new Headers();if(req.headers.range)headers.set("range",req.headers.range);
    const response=await serveFile(new Request(`http://localhost${req.url}`,{method:req.method,headers}),"books","book.pdf",{revalidate:true});
    res.writeHead(response.status,Object.fromEntries(response.headers));
    const record={header:req.headers.range??null,status:response.status,bytes:0};ranges.push(record);
    const counter=new Transform({transform(chunk,_encoding,callback){record.bytes+=chunk.length;callback(null,chunk);}});
    if(response.body)await pipeline(Readable.fromWeb(response.body as import("node:stream/web").ReadableStream),counter,res).catch(()=>{});
    else res.end();
  });
  server.listen(0,"127.0.0.1");await once(server,"listening");
  const address=server.address();assert.ok(address&&typeof address!=="string");
  const task=getDocument({url:`http://127.0.0.1:${address.port}/book.pdf`,rangeChunkSize:256*1024,disableStream:true,disableAutoFetch:true});
  try{
    const pdf=await task.promise;assert.equal(pdf.numPages,15);
    const page=await pdf.getPage(1);const operators=await page.getOperatorList();assert.ok(operators.fnArray.length>0);
    assert.ok(ranges.some(item=>item.header),JSON.stringify(ranges));assert.ok(ranges.filter(item=>item.header).every(item=>item.status===206),JSON.stringify(ranges));
    const transferred=ranges.reduce((sum,item)=>sum+item.bytes,0);
    assert.ok(transferred<pdfBytes.length,`transferred ${transferred} of ${pdfBytes.length}`);
    console.log(`REFERENCE_HTTP first-page operators: ${transferred}/${pdfBytes.length} bytes, ${ranges.filter(item=>item.header).length} ranges`);
  }finally{await task.destroy();server.close();await once(server,"close");delete (globalThis as unknown as {__readerStorage?:string}).__readerStorage;await rm(root,{recursive:true,force:true});}
});

test("shared reader uses demand-loaded ranges, truthful progress, existing failure recovery, and no byte-count loading copy",()=>{
  const reader=readFileSync("src/components/reader/flipbook.tsx","utf8");
  assert.match(reader,/rangeChunkSize:256\*1024,disableStream:true,disableAutoFetch:true,disableRange:false/);
  assert.match(reader,/onLoadProgress=\{onProgress\}/);assert.match(reader,/fetch\(fileUrl,\{method:"HEAD"/);
  assert.match(reader,/Memuat cerita… \$\{percent\}%/);assert.match(reader,/Menyiapkan halaman cerita…/);
  assert.doesNotMatch(reader,/Data PDF dimuat:|\bMB\b|Pemuatan lebih lama dari biasanya/);
  assert.match(reader,/index>=Math\.max\(0,page-1\)&&index<=page\+1/);
  assert.match(reader,/devicePixelRatio=\{Math\.min\(window\.devicePixelRatio\|\|1,1\.5\)\}/);
  assert.match(reader,/Halaman buku tidak dapat ditampilkan/);assert.match(reader,/Buka PDF langsung/);
});
