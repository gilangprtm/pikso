import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { once } from "node:events";
import ts from "typescript";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import type * as CacheModule from "../src/components/reader/pdf-range-source";

function loadCache(): typeof CacheModule {
  const js=ts.transpileModule(readFileSync("src/components/reader/pdf-range-source.ts","utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const exports={};new Function("require","exports",js)((id:string)=>{assert.equal(id,"pdfjs-dist");return pdfjs;},exports);return exports as typeof CacheModule;
}
type ByteRecord=NonNullable<Awaited<ReturnType<CacheModule.PdfChunkStore["get"]>>>;
class MemoryStore implements CacheModule.PdfChunkStore {
  records=new Map<string,ByteRecord>();reads=0;
  async get(id:string){this.reads++;const value=this.records.get(id);return value?structuredClone(value):undefined;}
  async put(record:ByteRecord){this.records.set(record.id,structuredClone(record));}
  async prune(url:string,etag:string){for(const [id,value] of this.records)if(value.url===url&&value.etag!==etag)this.records.delete(id);}
}
const fileUrl="/api/books/story/file?v=stable";
function transportBytes(source:Awaited<ReturnType<typeof CacheModule.createCachedPdfSource>>,begin:number,end:number){return new Promise<Uint8Array>(resolve=>{source.range.transportReady((event:{type:string;chunk:Uint8Array})=>{if(event.type==="range")resolve(event.chunk);});source.range.requestDataRange(begin,end);});}
function fixture(bytes:Uint8Array,etag='"v1"'){
  const calls:{method:string;range:string|null}[]=[];
  const fetcher:typeof fetch=async(_url,init)=>{
    assert.equal(init?.cache,"no-store");const headers=new Headers(init?.headers);calls.push({method:init?.method??"GET",range:headers.get("range")});
    if(init?.method==="HEAD")return new Response(null,{headers:{"content-type":"application/pdf","content-length":String(bytes.length),etag}});
    assert.equal(headers.get("if-range"),etag);const match=/bytes=(\d+)-(\d+)/.exec(headers.get("range")!)!;const start=Number(match[1]),end=Number(match[2]);
    return new Response(bytes.slice(start,end+1),{status:206,headers:{"content-type":"application/pdf","content-range":`bytes ${start}-${end}/${bytes.length}`,etag}});
  };return{calls,fetcher};
}

test("fresh PDF.js transport reuses persistent chunks across opens after fresh access HEAD, without full GET",async()=>{
  const {createCachedPdfSource,PDF_CHUNK_SIZE}=loadCache();const store=new MemoryStore();
  const bytes=new Uint8Array(readFileSync("docs/reference/Nana dan Kerajaan di Atas Awan.pdf"));
  let etag='"version1"',published=true,head=0,gets=0,transferred=0;
  const server=createServer((req,res)=>{
    if(!published){res.writeHead(404,{"cache-control":"no-store"});res.end();return;}
    const headers={"content-type":"application/pdf",etag,"accept-ranges":"bytes"};
    if(req.method==="HEAD"){head++;res.writeHead(200,{...headers,"content-length":bytes.length});res.end();return;}
    assert.equal(req.headers["if-range"],etag);const match=/^bytes=(\d+)-(\d+)$/.exec(req.headers.range??"");assert.ok(match,"no full-file GET allowed");
    const start=Number(match[1]),end=Number(match[2]);assert.ok(end-start+1<=PDF_CHUNK_SIZE);gets++;transferred+=end-start+1;
    res.writeHead(206,{...headers,"content-length":end-start+1,"content-range":`bytes ${start}-${end}/${bytes.length}`});res.end(bytes.subarray(start,end+1));
  });server.listen(0,"127.0.0.1");await once(server,"listening");const address=server.address();assert.ok(address&&typeof address!=="string");
  const fetcher:typeof fetch=(url,init)=>fetch(`http://127.0.0.1:${address.port}${url}`,init);
  async function open(){const control=new AbortController();let error=false;let available=0;const source=await createCachedPdfSource(fileUrl,{signal:control.signal,store,fetcher,onError:()=>{error=true;},onProgress:(loaded,total)=>{assert.equal(total,bytes.length);assert.ok(loaded>=available);available=loaded;}});const task=pdfjs.getDocument({...source,rangeChunkSize:PDF_CHUNK_SIZE,disableStream:true,disableAutoFetch:true});
    try{const doc=await task.promise;assert.equal(doc.numPages,15);const operators=await(await doc.getPage(1)).getOperatorList();assert.ok(operators.fnArray.length);assert.equal(error,false);assert.ok(available>0);}finally{await task.destroy();control.abort();}}
  try{
    await open();assert.ok(gets>0);assert.ok(transferred<bytes.length);const coldBytes=transferred,coldGets=gets;await open();assert.equal(head,2);assert.equal(gets,coldGets);assert.equal(transferred,coldBytes);
    console.log(`CHUNK_CACHE cold=${coldBytes}/${bytes.length} bytes (${coldGets} ranges); warm=0 PDF bytes, fresh HEAD`);
    etag='"version2"';await open();assert.ok(gets>coldGets);assert.ok([...store.records.values()].every(record=>record.etag===etag));
    published=false;const reads=store.reads;await assert.rejects(open(),/access/);assert.equal(store.reads,reads);
  }finally{server.close();await once(server,"close");}
});

test("cache validates ranges, copies bytes, falls back on storage failures, rejects protected URLs and denied HEAD",async()=>{
  const {createCachedPdfSource}=loadCache();const data=new Uint8Array(600000).map((_,i)=>i%251),store=new MemoryStore(),f=fixture(data);
  const source=await createCachedPdfSource(fileUrl,{store,fetcher:f.fetcher,signal:new AbortController().signal,onError:()=>assert.fail("unexpected error"),onProgress:()=>{}});
  const output=await transportBytes(source,100,300000);assert.deepEqual(output,data.slice(100,300000));output.fill(255);
  assert.notEqual(new Uint8Array([...store.records.values()][0].bytes)[0],255);source.range.abort();
  const broken:CacheModule.PdfChunkStore={get:async()=>{throw Error();},put:async()=>{throw Error();},prune:async()=>{throw Error();}};
  const network=await createCachedPdfSource(fileUrl,{store:broken,fetcher:f.fetcher,signal:new AbortController().signal,onError:()=>assert.fail(),onProgress:()=>{}});assert.deepEqual(await transportBytes(network,0,10),data.slice(0,10));network.range.abort();
  const before=f.calls.length;await assert.rejects(createCachedPdfSource("/api/admin/books/id/file",{store,fetcher:f.fetcher,signal:new AbortController().signal,onError:()=>{}}),/public/);assert.equal(f.calls.length,before);
  const denied:typeof fetch=async()=>new Response(null,{status:401});const reads=store.reads;await assert.rejects(createCachedPdfSource(fileUrl,{store,fetcher:denied,signal:new AbortController().signal,onError:()=>{}}));assert.equal(store.reads,reads);
});

test("changed or malformed range fails locally once; cancellation aborts in-flight range without retry",async()=>{
  const {createCachedPdfSource}=loadCache();const data=new Uint8Array(1024);const f=fixture(data);let gets=0,errors=0;
  const changed:typeof fetch=(url,init)=>init?.method==="HEAD"?f.fetcher(url,init):Promise.resolve((gets++,new Response(data,{headers:{"content-type":"application/pdf",etag:'"new"'}})));
  const source=await createCachedPdfSource(fileUrl,{store:new MemoryStore(),fetcher:changed,signal:new AbortController().signal,onError:()=>{errors++;},onProgress:()=>{}});
  source.range.requestDataRange(0,10);await new Promise(resolve=>setTimeout(resolve,20));assert.equal(errors,1);assert.equal(gets,1);source.range.abort();
  let rangeSignal:AbortSignal|undefined;const control=new AbortController();
  const slow:typeof fetch=(url,init)=>init?.method==="HEAD"?f.fetcher(url,init):new Promise((_resolve,reject)=>{rangeSignal=init?.signal as AbortSignal;rangeSignal.addEventListener("abort",()=>reject(Error("aborted")),{once:true});});
  const aborted=await createCachedPdfSource(fileUrl,{store:new MemoryStore(),fetcher:slow,signal:control.signal,onError:()=>assert.fail("abort is not an error"),onProgress:()=>{}});aborted.range.requestDataRange(0,10);await new Promise(resolve=>setImmediate(resolve));assert.ok(rangeSignal);control.abort();await new Promise(resolve=>setImmediate(resolve));assert.equal(rangeSignal.aborted,true);aborted.range.abort();
});

test("native IndexedDB adapter degrades safely when storage is unavailable",async()=>{
  const {IndexedPdfChunkStore}=loadCache();const store=new IndexedPdfChunkStore();assert.equal(await store.get("none"),undefined);await store.prune(fileUrl,'"v"');await store.put({id:"x",url:fileUrl,etag:'"v"',start:0,usedAt:Date.now(),bytes:new ArrayBuffer(1)});
});
