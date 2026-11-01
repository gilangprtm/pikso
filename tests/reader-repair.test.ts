import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { spawnSync } from "node:child_process";
import ts from "typescript";
import { jsx, jsxs } from "react/jsx-runtime";

test("bundled PDF compatibility API loads the real reference PDF and parses its first page", async () => {
  const bytes = new Uint8Array(readFileSync("docs/reference/Nana dan Kerajaan di Atas Awan.pdf"));
  const task = getDocument({ data: bytes });
  try {
    const pdf = await task.promise;
    assert.equal(pdf.numPages, 15);
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    assert.ok(viewport.width > 0 && viewport.height > 0);
    const operators = await page.getOperatorList();
    assert.ok(operators.fnArray.length > 0);
  } finally {
    await task.destroy();
  }
});

test("public and admin share callback-based PDF error handling and use the legacy worker", () => {
  const reader = readFileSync("src/components/reader/flipbook.tsx", "utf8");
  const loader = readFileSync("src/components/reader/reader-loader.tsx", "utf8");
  const worker = readFileSync("scripts/copy-pdf-worker.mjs", "utf8");
  assert.match(reader, /GlobalWorkerOptions\.workerSrc = `\/pdf\.worker\.min\.mjs\?v=\$\{pdfjs\.version\}-legacy`/);
  assert.match(worker, /pdfjs-dist\/legacy\/build\/pdf\.worker\.min\.mjs/);
  assert.match(reader, /<Document key=\{fileUrl\} suspense=\{false\}/);
  assert.match(reader, /<Page suspense=\{false\}/);
  assert.match(reader, /onRenderError=\{onError\}/);
  assert.match(loader, /class ReaderErrorBoundary extends Component/);
  assert.match(loader, /Buka PDF langsung/);
});

// Functional callback/tree harness: no DOM, browser or simulated React lifecycle.
function readerHarness(progress={loaded:0,total:0},adminPreview=true,cacheFactory:unknown=async()=>({range:{abort(){}},length:1000})) {
  const calls: unknown[][] = [];
  const effects:(()=>void|(()=>void))[]=[];
  let index = 0;
  const values = [0, 0, "", {width:300,height:420,single:true}, 0.707, 1, false, progress, null, 0];
  const modules: Record<string, unknown> = {
    react: {
      forwardRef: (fn: unknown) => fn,
      useCallback: (fn: unknown) => fn,
      useEffect(fn:()=>void|(()=>void)) {effects.push(fn);},
      useRef: (value:unknown) => ({current:value}),
      useState: () => {const current=index++;return [values[current],(v:unknown)=>calls.push([current,typeof v==="function"?v(values[current]):v])];}
    },
    "react/jsx-runtime": {jsx,jsxs},
    "react-pdf": {Document:"Document", Page:"Page",pdfjs:{version:"6.3.289",GlobalWorkerOptions:{}}},
    "react-pageflip": {default:"Flipbook"},
    "./pdf-range-source": {createCachedPdfSource:cacheFactory},
    "./prefetch-pages": {prefetchNextPages:async()=>{}}, 
    "next/link": {default:"a"},
    "@/components/ui/button": {Button:"button"},
    "lucide-react": new Proxy({}, {get:(_,name)=>String(name)}),
  };
  const compiled=ts.transpileModule(readFileSync("src/components/reader/flipbook.tsx","utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const exports: {Flipbook?: (props:unknown)=>{props:{children:{props:{children:unknown}}[]}}} = {};
  new Function("require","exports",compiled)((name:string)=>modules[name],exports);
  const tree=exports.Flipbook!({fileUrl:adminPreview?"/api/admin/books/id/file":"/api/books/story/file?v=stable",title:"Book",pageCount:15,adminPreview});
  return {calls,effects,document:tree.props.children[1].props.children as {props:{loading:unknown;suspense:boolean;onLoadSuccess:(pdf:unknown)=>Promise<void>;onLoadError:()=>void;onSourceError:()=>void;onLoadProgress:(progress:{loaded:number;total:number})=>void;options:{disableStream:boolean;disableAutoFetch:boolean;rangeChunkSize:number}}}};
}

test("reader catches rejected first-page loads and invalid dimensions instead of leaking rejected promises",async()=>{
  for(const getPage of [async()=>{throw new Error("page failed");},async()=>({getViewport:()=>({width:0,height:1})})]) {
    const h=readerHarness();
    assert.equal(h.document.props.suspense,false);
    await assert.doesNotReject(()=>h.document.props.onLoadSuccess({numPages:15,getPage}));
    assert.ok(h.calls.some(([field,value])=>field===2&&String(value).includes("Halaman buku")));
    assert.ok(!h.calls.some(([field,value])=>field===0&&value===15));
  }
});

test("reader accepts valid dimensions and routes document/source errors to the local fallback",async()=>{
  const h=readerHarness();
  await h.document.props.onLoadSuccess({numPages:15,getPage:async()=>({getViewport:()=>({width:600,height:800})})});
  assert.ok(h.calls.some(([field,value])=>field===0&&value===15));
  assert.ok(h.calls.some(([field,value])=>field===4&&value===0.75));
  h.document.props.onLoadError();h.document.props.onSourceError();
  assert.equal(h.calls.filter(([field,value])=>field===2&&String(value).includes("PDF")).length,2);
});

test("reader derives a byte-based percentage from the authorized HEAD endpoint without showing byte counts",async()=>{
  const h=readerHarness();
  assert.equal(h.document.props.options.disableStream,true);assert.equal(h.document.props.options.disableAutoFetch,true);
  h.document.props.onLoadProgress({loaded:262144,total:0});
  assert.ok(h.calls.some(([field,value])=>field===7&&(value as {loaded:number;total:number}).loaded===262144&&(value as {total:number}).total===0));
  assert.match(readFileSync("src/components/reader/flipbook.tsx","utf8"),/fetch\(fileUrl,\{method:"HEAD",cache:"no-store",signal:controller\.signal\}\)/);
  assert.match(readFileSync("src/components/reader/flipbook.tsx","utf8"),/Memuat cerita… \$\{percent\}%/);
  assert.doesNotMatch(readFileSync("src/components/reader/flipbook.tsx","utf8"),/Data PDF dimuat:|MB|<progress/);
  const loader=JSON.stringify(readerHarness({loaded:250,total:1000}).document.props.loading);
  assert.ok(loader.includes("25%"));assert.ok(loader.includes("Halaman dibaca bertahap"));
  assert.ok(!loader.includes("Buka PDF langsung")&&!loader.includes("Coba lagi")&&!loader.includes("MB")&&!loader.includes('"type":"progress"'));
  assert.ok(JSON.stringify(readerHarness({loaded:1001,total:1000}).document.props.loading).includes("100%"));
  assert.ok(JSON.stringify(readerHarness({loaded:250,total:0}).document.props.loading).includes("Menyiapkan halaman cerita"));
  const priorFetch=globalThis.fetch;let request:RequestInfo|URL|undefined;let signal:AbortSignal|undefined;
  globalThis.fetch=async(input,init)=>{request=input;signal=init?.signal as AbortSignal;return new Response(null,{status:200,headers:{"content-type":"application/pdf","content-length":"1000"}});};
  try{const cleanup=h.effects[0]();await new Promise(resolve=>setImmediate(resolve));assert.equal(request,"/api/admin/books/id/file");assert.equal(signal?.aborted,false);assert.ok(h.calls.some(([field,value])=>field===7&&(value as {total:number}).total===1000));cleanup?.();assert.equal(signal?.aborted,true);}
  finally{globalThis.fetch=priorFetch;}
});

test("public reader initializes cached ranges while admin preview bypasses persistent cache",async()=>{
  let receivedUrl="";let signal:AbortSignal|undefined;let aborted=false;
  const h=readerHarness(undefined,false,async(url:string,settings:{signal:AbortSignal})=>{
    receivedUrl=url;signal=settings.signal;return{range:{abort:()=>{aborted=true;}},length:1000};
  });
  const cleanup=h.effects[0]();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(receivedUrl,"/api/books/story/file?v=stable");assert.equal(signal?.aborted,false);
  assert.ok(h.calls.some(([field,value])=>field===8&&Boolean(value)));
  cleanup?.();assert.equal(signal?.aborted,true);assert.equal(aborted,true);
  let cacheCalls=0;const admin=readerHarness(undefined,true,()=>{cacheCalls++;});
  const oldFetch=globalThis.fetch;globalThis.fetch=async()=>new Response(null,{headers:{"content-length":"1000"}});
  try{const stop=admin.effects[0]();await new Promise(resolve=>setImmediate(resolve));assert.equal(cacheCalls,0);stop?.();}finally{globalThis.fetch=oldFetch;}
});

test("fresh process loads compatibility API and worker when optional modern typed-array/Map/Promise.try methods are missing",()=>{
  const script=`
    import {readFile} from 'node:fs/promises';
    delete Map.prototype.getOrInsertComputed;
    delete Promise.try;
    delete Uint8Array.prototype.toHex;
    delete Uint8Array.fromBase64;
    const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task=pdfjs.getDocument({data:new Uint8Array(await readFile('docs/reference/Nana dan Kerajaan di Atas Awan.pdf'))});
    try {
      const pdf=await task.promise;
      const page=await pdf.getPage(1);
      const ops=await page.getOperatorList();
      if(pdf.numPages!==15||!ops.fnArray.length)throw new Error('PDF parse failed');
      console.log('COMPAT_OK');
    } finally {await task.destroy();}
  `;
  const result=spawnSync(process.execPath,["--input-type=module","-e",script],{encoding:"utf8",timeout:30000});
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.match(result.stdout,/COMPAT_OK/);
});

test("reader error boundary offers the exact supplied public/admin URL and retry without exposing diagnostics",()=>{
  const compiled=ts.transpileModule(readFileSync("src/components/reader/reader-loader.tsx","utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  class Component {props:unknown;state:unknown;constructor(props:unknown){this.props=props;}setState(state:unknown){this.state=state;}}
  const exports: {ReaderLoader?:(props:unknown)=>{type:new(props:unknown)=>{state:{failed:boolean};render:()=>unknown};props:unknown}} = {};
  const modules: Record<string,unknown>={react:{Component},"react/jsx-runtime":{jsx,jsxs},"next/dynamic":{default:()=>"Reader"}};
  new Function("require","exports",compiled)((name:string)=>modules[name],exports);
  for(const fileUrl of ["/api/books/story/file","/api/admin/books/id/file"]){
    const tree=exports.ReaderLoader!({fileUrl,title:"Book",pageCount:15,backHref:"/books/story"});
    const boundary=new tree.type(tree.props);
    boundary.state={failed:true};
    const rendered=boundary.render() as {props:{children:{props:{children:{type:string;props:{href?:string;children?:unknown;onClick?:()=>void}}[]}}}};
    const elements=rendered.props.children.props.children;
    assert.equal(elements.find(item=>item.type==="a"&&item.props.href===fileUrl)?.props.href,fileUrl);
    assert.ok(!JSON.stringify(rendered).includes("stack"));
    elements.find(item=>item.type==="button")!.props.onClick!();
    assert.equal(boundary.state.failed,false);
  }
});
