import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

type Element={type:unknown;props:Record<string,unknown>};
function component(locked:boolean,stored=false,showDownload=false,fetchMock:typeof fetch=async()=>{throw new Error("unexpected fetch");},salesLink=""){
  const values:unknown[]=[false,"","",false,"read",null,null,""];const calls:unknown[][]=[];const navigation:string[]=[];const downloads:string[]=[];const fetchCalls:{url:string;init?:RequestInit}[]=[];const progressHistory:number[]=[];const timerCallbacks:(()=>void)[]=[];
  const refs:{current:unknown}[]=[];let state=0,refIndex=0,cleanup:(()=>void)|undefined;let fail=false;
  const element=(type:unknown,props:Record<string,unknown>)=>({type,props});
  const documentMock={body:{append:(_node:unknown)=>{}},createElement:(tagName:string)=>{let filename="";return {tagName,href:"",set download(value:string){filename=value;},get download(){return filename;},click(){downloads.push(filename);},remove(){}};}};
  const URLMock={createObjectURL:(_blob:Blob)=>"blob:story",revokeObjectURL:(_url:string)=>{}};
  const fetcher:typeof fetch=async(input,init)=>{fetchCalls.push({url:String(input),init});return fetchMock(input,init);};
  const localEntries=new Set<string>();if(stored)localEntries.add("pikso-story-access:id");
  const modules:Record<string,unknown>={
    react:{useState:(value:unknown)=>{const index=state++;return [values[index]??value,(next:unknown)=>{values[index]=next;if(index===6&&typeof next==="number")progressHistory.push(next);}];},useRef:(value:unknown)=>{const index=refIndex++;refs[index]??={current:value};return refs[index];},useEffect:(effect:()=>void|(()=>void))=>{const result=effect();if(!cleanup)cleanup=result||undefined;}},

    "react/jsx-runtime":{jsx:element,jsxs:element,Fragment:"Fragment"},
    "next/navigation":{useRouter:()=>({push:(url:string)=>navigation.push(url),refresh:()=>{}})},
    "lucide-react":{ArrowRight:"ArrowRight",LockKeyhole:"Lock",LoaderCircle:"Loader",Download:"Download"},
    "@/components/ui/button":{Button:"Button"},"@/components/ui/input":{Input:"Input"},
    "@/components/ui/dialog":Object.fromEntries(["Dialog","DialogContent","DialogDescription","DialogFooter","DialogHeader","DialogTitle"].map(name=>[name,name])),
    "@/lib/story-access-client":{storyAccessKey:(id:string)=>`pikso-story-access:${id}`,unlockStory:async(...args:unknown[])=>{calls.push(args);if(fail||(!stored&&args[2]===undefined))throw new Error("Kode salah");}},

  };
  const compiled=ts.transpileModule(readFileSync("src/components/books/start-reading.tsx","utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const exports:{StartReading?:(props:unknown)=>Element}={};new Function("require","exports","window","fetch","document","URL","setTimeout","clearTimeout","localStorage",compiled)((id:string)=>modules[id],exports,{setTimeout:(callback:()=>void)=>{timerCallbacks.push(callback);return timerCallbacks.length;},addEventListener(){},removeEventListener(){}},fetcher,documentMock,URLMock,(callback:()=>void)=>{timerCallbacks.push(callback);return timerCallbacks.length;},(_timer:unknown)=>{}, {getItem:(key:string)=>localEntries.has(key)?"saved-proof":null,setItem:(key:string)=>{localEntries.add(key);},removeItem:(key:string)=>{localEntries.delete(key);}});
  const render=()=>{state=0;refIndex=0;return exports.StartReading!({slug:"story",id:"id",title:"Story",locked,showDownload,salesLink});};
  function find(root:Element,type:string):Element|undefined{
    if(root.type===type)return root;
    const children=root.props.children;
    for(const child of Array.isArray(children)?children:[children]){if(child&&typeof child==="object"&&"props" in child){const match=find(child as Element,type);if(match)return match;}}
  }
  return {render,find,values,calls,navigation,downloads,fetchCalls,progressHistory,timerCallbacks,cleanup:()=>cleanup?.(),setFailure:()=>{fail=true;}};
}
// Direct component/callback checks only; no DOM, browser or lifecycle simulation.
test("Start Reading bypasses modal for open stories and restores remembered access without asking for code",async()=>{
  for(const [locked,stored] of [[false,false],[true,true]]){
    const f=component(locked,stored);const root=f.render();
    const button=f.find(root,"Button")!;(button.props.onClick as ()=>void)();await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(f.navigation,["/books/story/read"]);assert.equal(f.values[0],locked);assert.equal(f.calls.length,locked?1:0);
  }
});
test("locked story opens modal, wrong code stays put and correct code navigates",async()=>{
  const f=component(true);(f.find(f.render(),"Button")!.props.onClick as ()=>void)();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.values[0],true);assert.deepEqual(f.navigation,[]);
  (f.find(f.render(),"Input")!.props.onChange as (event:unknown)=>void)({target:{value:"TestCode"}});
  const form=f.find(f.render(),"form")!;(form.props.onSubmit as (event:unknown)=>void)({preventDefault(){}});await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(f.calls[1],["story","id","TestCode"]);assert.deepEqual(f.navigation,["/books/story/read"]);
  const bad=component(true);bad.setFailure();bad.values[1]="Wrong";
  (bad.find(bad.render(),"form")!.props.onSubmit as (event:unknown)=>void)({preventDefault(){}});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(bad.values[2],"Kode salah");assert.deepEqual(bad.navigation,[]);assert.equal(bad.values[3],false);
});
test("detail download action uses the primary icon Button before Start Reading",()=>{
  const f=component(false,false,true);const actions=f.find(f.render(),"div")!.props.children as Element[];
  const [download,start]=actions.filter((action):action is Element=>Boolean(action));
  assert.equal(download.props.type,"button");assert.equal(download.props.variant,"default");assert.equal(download.props.size,"icon");
  assert.ok(String(download.props.className).includes("button-primary"));
  assert.equal(download.props["aria-label"],"Unduh Story sebagai PDF");
  assert.equal(start.type,"Button");assert.ok((start.props.children as unknown[]).includes("MULAI MEMBACA"));
});
test("detail download starts an in-page PDF transfer and displays measured progress",async()=>{
  const stream=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new Uint8Array(50));controller.enqueue(new Uint8Array(50));controller.close();}});
  const f=component(false,false,true,async()=>new Response(stream,{status:200,headers:{"Content-Length":"100","Content-Type":"application/pdf"}}));
  const button=f.find(f.render(),"Button")!;
  (button.props.onClick as () => void)();
  await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.fetchCalls.length,1);assert.equal(f.fetchCalls[0].url,"/api/books/story/file?download=1");
  assert.equal(f.fetchCalls[0].init?.credentials,"same-origin");assert.equal(f.fetchCalls[0].init?.cache,"no-store");
  assert.deepEqual(f.downloads,[]);assert.ok(f.progressHistory.includes(50));
  const ready=f.find(f.render(),"Button")!;
  assert.equal(ready.props["aria-label"],"Simpan Story sebagai PDF");
  assert.ok((ready.props.children as unknown[]).includes("SIMPAN PDF"));
  (ready.props.onClick as () => void)();
  assert.deepEqual(f.downloads,["Story.pdf"]);
  assert.deepEqual(f.navigation,[]);
});
test("download button replaces its icon with the measured percentage while bytes are transferring",async()=>{
  let streamController:ReadableStreamDefaultController<Uint8Array>|undefined;
  const f=component(false,false,true,async()=>new Response(new ReadableStream<Uint8Array>({start(controller){streamController=controller;}}),{headers:{"Content-Length":"100","Content-Type":"application/pdf"}}));
  (f.find(f.render(),"Button")!.props.onClick as () => void)();
  await new Promise(resolve=>setImmediate(resolve));
  streamController!.enqueue(new Uint8Array(37));await new Promise(resolve=>setImmediate(resolve));
  const progress=f.find(f.render(),"Button")!.props.children as Element;
  assert.equal(progress.type,"span");assert.deepEqual(progress.props.children,[37,"%"]);
  assert.equal(f.find(f.render(),"Button")!.props["aria-label"],"Mengunduh Story: 37%");
  streamController!.close();await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));
});
test("download from a locked story with remembered access starts the in-page transfer",async()=>{
  const f=component(true,true,true,async()=>new Response(new Uint8Array([1,2,3]),{headers:{"Content-Length":"3","Content-Type":"application/pdf"}}));
  const button=f.find(f.render(),"Button")!;(button.props.onClick as () => void)();
  await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(f.calls,[["story","id"]]);assert.equal(f.fetchCalls[0].url,"/api/books/story/file?download=1");assert.deepEqual(f.downloads,[]);
  const ready=f.find(f.render(),"Button")!;assert.equal(ready.props["aria-label"],"Simpan Story sebagai PDF");
  (ready.props.onClick as () => void)();assert.deepEqual(f.downloads,["Story.pdf"]);
});
test("locked story download asks for its code before starting the in-page transfer",async()=>{
  const f=component(true,false,true,async()=>new Response(new Uint8Array([1]),{headers:{"Content-Length":"1","Content-Type":"application/pdf"}}));
  const button=f.find(f.render(),"Button")!;(button.props.onClick as () => void)();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.values[0],true);assert.equal(f.fetchCalls.length,0);
  (f.find(f.render(),"Input")!.props.onChange as (event:unknown)=>void)({target:{value:"NanaAccess"}});
  (f.find(f.render(),"form")!.props.onSubmit as (event:unknown)=>void)({preventDefault(){}});await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(f.calls,[["story","id"],["story","id","NanaAccess"]]);
  assert.equal(f.fetchCalls[0].url,"/api/books/story/file?download=1");assert.deepEqual(f.downloads,[]);
  const ready=f.find(f.render(),"Button")!;(ready.props.onClick as () => void)();assert.deepEqual(f.downloads,["Story.pdf"]);
});
test("leaving the book detail page aborts an in-progress PDF transfer",async()=>{
  let requestSignal:AbortSignal|undefined;
  const f=component(false,false,true,(_input,_init)=>new Promise<Response>((_resolve,reject)=>{
    requestSignal=_init?.signal as AbortSignal;
    requestSignal.addEventListener("abort",()=>reject(new DOMException("Aborted","AbortError")));
  }));
  (f.find(f.render(),"Button")!.props.onClick as () => void)();
  assert.equal(requestSignal?.aborted,false);
  f.cleanup();
  assert.equal(requestSignal?.aborted,true);await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(f.downloads,[]);
});

test("sales link appears only on locked stories with a configured URL and opens safely",()=>{
  for(const [locked,salesLink,expected] of [[true,"https://shop.example/access",true],[true,"",false],[false,"https://shop.example/access",false]] as const){
    const f=component(locked,false,false,undefined,salesLink);const tree=f.render();
    const visit=(node:Element):Element|undefined=>{if(node.type==="a"&&node.props.children==="Dapatkan Kode Akses")return node;const children=node.props.children;for(const child of Array.isArray(children)?children:[children])if(child&&typeof child==="object"&&"props" in child){const found=visit(child as Element);if(found)return found;}};
    const link=visit(tree);assert.equal(Boolean(link),expected);
    if(link){assert.equal(link.props.href,salesLink);assert.equal(link.props.target,"_blank");assert.equal(link.props.rel,"noopener noreferrer");}
  }
});

test("reader page never supplies ReaderLoader to an ungranted locked request",async()=>{
  let allowed=false;let locked=true;
  const row={id:"id",slug:"story",title:"Story",pdf_path:"file.pdf",pdf_pages:1};
  const element=(type:unknown,props:Record<string,unknown>)=>({type,props});
  const modules:Record<string,unknown>={
    "react/jsx-runtime":{jsx:element,jsxs:element},"node:crypto":{createHash:()=>({update:()=>({digest:()=>"12345678901234567890"})})},
    "next/headers":{cookies:async()=>({get:()=>undefined})},"next/navigation":{notFound:()=>{throw new Error("not-found");}},
    "@/lib/books":{getPublicBook:async()=>({...row,access_locked:locked})},
    "@/lib/book-access":{accessCookieName:()=>"test",canReadBook:async()=>!locked||allowed},
    "@/components/reader/reader-loader":{ReaderLoader:"ReaderLoader"},"@/components/books/unlock-required":{UnlockRequired:"UnlockRequired"},
  };
  const source=readFileSync("src/app/books/[slug]/read/page.tsx","utf8");
  const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const exports:{default?:(props:unknown)=>Promise<Element>}={};new Function("require","exports",js)((name:string)=>modules[name],exports);
  const props={params:Promise.resolve({slug:"story"})};assert.equal((await exports.default!(props)).type,"UnlockRequired");
  allowed=true;assert.equal((await exports.default!(props)).type,"ReaderLoader");
  locked=false;allowed=false;assert.equal((await exports.default!(props)).type,"ReaderLoader");
});
