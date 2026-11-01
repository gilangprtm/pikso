import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import type * as CacheModule from "../src/components/reader/pdf-range-source";

const compiled=ts.transpileModule(readFileSync("src/components/reader/prefetch-pages.ts","utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const exports:{prefetchNextPages?:(pdf:unknown,currentPage:number,signal:AbortSignal)=>Promise<void>}={};
new Function("require","exports",compiled)((id:string)=>id==="pdfjs-dist"?{}:undefined,exports);
const prefetchNextPages=exports.prefetchNextPages!;

test("visible page prefetches only the next two page contents, sequentially",async()=>{
  const calls:string[]=[];let active=0;let maxActive=0;
  const pdf={numPages:6,getPage:async(number:number)=>{
    calls.push(`page:${number}`);
    return {getOperatorList:async()=>{active++;maxActive=Math.max(maxActive,active);calls.push(`content:${number}`);await Promise.resolve();active--;}};
  }};
  await prefetchNextPages(pdf as never,2,new AbortController().signal);
  assert.deepEqual(calls,["page:3","content:3","page:4","content:4"]);
  assert.equal(maxActive,1);
});

test("prefetch honors document end and cancellation without touching pages",async()=>{
  const calls:number[]=[];const pdf={numPages:2,getPage:async(number:number)=>{calls.push(number);return{getOperatorList:async()=>{}};}};
  await prefetchNextPages(pdf as never,2,new AbortController().signal);
  const controller=new AbortController();controller.abort();
  await prefetchNextPages(pdf as never,1,controller.signal);
  assert.deepEqual(calls,[]);
});

test("prefetch stops scheduling after in-flight content finishes on navigation, and contains optional errors",async()=>{
  const calls:number[]=[];const controller=new AbortController();
  const pdf={numPages:6,getPage:async(number:number)=>{calls.push(number);return{getOperatorList:async()=>{controller.abort();}};}};
  await prefetchNextPages(pdf,1,controller.signal);assert.deepEqual(calls,[2]);
  calls.length=0;
  await assert.doesNotReject(()=>prefetchNextPages({numPages:6,getPage:async(number:number)=>{calls.push(number);throw Error("optional page failed");}},1,new AbortController().signal));
  assert.deepEqual(calls,[2]);
});

test("real PDF.js prefetch downloads future content without opening or rendering those pages",async()=>{
  const cacheJs=ts.transpileModule(readFileSync("src/components/reader/pdf-range-source.ts","utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const cacheExports={};new Function("require","exports",cacheJs)(()=>pdfjs,cacheExports);
  const {createCachedPdfSource,PDF_CHUNK_SIZE}=cacheExports as typeof CacheModule;
  const bytes=new Uint8Array(readFileSync("docs/reference/Nana dan Kerajaan di Atas Awan.pdf"));
  let transferred=0,gets=0;
  const fetcher:typeof fetch=async(_url,init)=>{
    if(init?.method==="HEAD")return new Response(null,{headers:{"content-type":"application/pdf","content-length":String(bytes.length),etag:'"prefetch-version"'}});
    const range=new Headers(init?.headers).get("range");
    const match=/^bytes=(\d+)-(\d+)$/.exec(range??"");assert.ok(match,"only bounded range GETs");
    const start=Number(match[1]),end=Number(match[2]);assert.ok(end-start+1<=PDF_CHUNK_SIZE);
    gets++;transferred+=end-start+1;
    return new Response(bytes.slice(start,end+1),{status:206,headers:{"content-type":"application/pdf",etag:'"prefetch-version"',"content-range":`bytes ${start}-${end}/${bytes.length}`}});
  };
  const controller=new AbortController();
  const source=await createCachedPdfSource("/api/books/story/file",{signal:controller.signal,fetcher,store:{get:async()=>undefined,put:async()=>{},prune:async()=>{}},onError:()=>assert.fail("unexpected source error")});
  const task=pdfjs.getDocument({...source,rangeChunkSize:PDF_CHUNK_SIZE,disableStream:true,disableAutoFetch:true});
  try{
    const pdf=await task.promise;await(await pdf.getPage(1)).getOperatorList();const firstBytes=transferred;
    await prefetchNextPages(pdf,1,controller.signal);const afterPrefetch=gets;
    assert.ok(transferred>firstBytes,"background preparation must fetch future page content");
    const totalPrefetched=transferred;
    for(const number of [2,3])assert.ok((await(await pdf.getPage(number)).getOperatorList()).fnArray.length);
    assert.equal(gets,afterPrefetch,"prepared future contents need no new network range");
    assert.ok(transferred<bytes.length,"bounded lookahead does not predownload the whole reference PDF");
    console.log(`PAGE_PREFETCH first=${firstBytes}, after-next-two=${totalPrefetched}/${bytes.length}; reopen-content additional GETs=0`);
  }finally{controller.abort();await task.destroy();}
});

test("shared reader keeps pageflip in portrait mode and starts prefetch after visible page render",()=>{
  const reader=readFileSync("src/components/reader/flipbook.tsx","utf8");
  assert.match(reader,/style=\{\{width:dimensions\.width,height:dimensions\.height\}\}/);
  assert.match(reader,/usePortrait/);
  assert.match(reader,/onRenderSuccess=\{\(\)=>\{setRendered\(true\);onReady\(number\);\}\}/);
  assert.match(reader,/!rendered&&<div style=\{\{position:"absolute",inset:0\}\}/);
  assert.match(reader,/void prefetchNextPages\(pdf,page\+1,controller\.signal\)/);
  assert.match(reader,/index>=Math\.max\(0,page-1\)&&index<=page\+1/);
});
