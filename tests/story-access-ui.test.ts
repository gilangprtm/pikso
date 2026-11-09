import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

type Element={type:unknown;props:Record<string,unknown>};
function component(locked:boolean,stored=false,showDownload=false,salesLink=""){
  const values:unknown[]=[];const calls:unknown[][]=[];const navigation:string[]=[];
  let state=0,cleanup:(()=>void)|undefined;let fail=false;
  const element=(type:unknown,props:Record<string,unknown>)=>({type,props});
  const localEntries=new Set<string>();if(stored)localEntries.add("pikso-story-access:id");
  const modules:Record<string,unknown>={
    react:{useState:(value:unknown)=>{const index=state++;if(!(index in values))values[index]=value;return [values[index],(next:unknown)=>{values[index]=next;}];},useEffect:(effect:()=>void|(()=>void))=>{const result=effect();if(!cleanup)cleanup=result||undefined;}},

    "react/jsx-runtime":{jsx:element,jsxs:element,Fragment:"Fragment"},
    "next/navigation":{useRouter:()=>({push:(url:string)=>navigation.push(url),refresh:()=>{}})},
    "lucide-react":{ArrowRight:"ArrowRight",LockKeyhole:"Lock",LoaderCircle:"Loader",Download:"Download"},
    "@/components/ui/button":{Button:"Button",buttonVariants:({variant="default",size="default",className=""}:{variant?:string;size?:string;className?:string})=>`${variant} ${size} ${className}`},"@/components/ui/input":{Input:"Input"},
    "@/components/ui/dialog":Object.fromEntries(["Dialog","DialogContent","DialogDescription","DialogFooter","DialogHeader","DialogTitle"].map(name=>[name,name])),
    "@/lib/story-access-client":{storyAccessKey:(id:string)=>`pikso-story-access:${id}`,unlockStory:async(...args:unknown[])=>{calls.push(args);if(fail||(!stored&&args[2]===undefined))throw new Error("Kode salah");}},

  };
  const compiled=ts.transpileModule(readFileSync("src/components/books/start-reading.tsx","utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const unexpected=()=>{throw new Error("download must use a user-activated anchor");};
  const exports:{StartReading?:(props:unknown)=>Element}={};new Function("require","exports","window","fetch","document","URL","localStorage",compiled)((id:string)=>modules[id],exports,{location:{assign:unexpected},addEventListener(){},removeEventListener(){}},unexpected,{createElement:unexpected},{createObjectURL:unexpected}, {getItem:(key:string)=>localEntries.has(key)?"saved-proof":null,setItem:(key:string)=>{localEntries.add(key);},removeItem:(key:string)=>{localEntries.delete(key);}});
  const render=()=>{state=0;return exports.StartReading!({slug:"story",id:"id",title:"Story",locked,showDownload,salesLink});};
  function find(root:Element,type:string):Element|undefined{
    if(root.type===type)return root;
    const children=root.props.children;
    for(const child of Array.isArray(children)?children:[children]){if(child&&typeof child==="object"&&"props" in child){const match=find(child as Element,type);if(match)return match;}}
  }
  return {render,find,values,calls,navigation,cleanup:()=>cleanup?.(),setFailure:()=>{fail=true;}};
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
  assert.equal(f.values[1],true);assert.deepEqual(f.navigation,[]);
  (f.find(f.render(),"Input")!.props.onChange as (event:unknown)=>void)({target:{value:"TestCode"}});
  const form=f.find(f.render(),"form")!;(form.props.onSubmit as (event:unknown)=>void)({preventDefault(){}});await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(f.calls[1],["story","id","TestCode"]);assert.deepEqual(f.navigation,["/books/story/read"]);
  const bad=component(true);bad.setFailure();bad.values[2]="Wrong";bad.values[1]=true;
  (bad.find(bad.render(),"form")!.props.onSubmit as (event:unknown)=>void)({preventDefault(){}});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(bad.values[3],"Kode salah");assert.deepEqual(bad.navigation,[]);assert.equal(bad.values[1],true);
});
test("unlocked detail download is a styled native attachment anchor before Start Reading",()=>{
  const f=component(false,false,true);const actions=f.find(f.render(),"div")!.props.children as Element[];
  const [download,start]=actions.filter((action):action is Element=>Boolean(action));
  assertNativeDownload(download);assert.deepEqual(f.calls,[]);assert.deepEqual(f.navigation,[]);
  assert.ok(String(download.props.className).startsWith("default icon "));
  assert.equal(download.props.target,undefined);assert.ok(String(download.props.className).includes("book-download-button"));
  assert.equal(download.props["aria-label"],"Unduh Story sebagai PDF");
  assert.equal(start.type,"Button");assert.ok((start.props.children as unknown[]).includes("MULAI MEMBACA"));
  const source=readFileSync("src/components/books/start-reading.tsx","utf8");
  assert.doesNotMatch(source,/window\.location\.assign|createObjectURL|\.click\(\)/);
});
test("locked invalid code keeps the gate and exposes no attachment anchor",async()=>{
  const f=component(true,false,true);(f.find(f.render(),"Button")!.props.onClick as () => void)();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.find(f.render(),"a"),undefined);
  f.setFailure();(f.find(f.render(),"Input")!.props.onChange as (event:unknown)=>void)({target:{value:"Wrong"}});
  (f.find(f.render(),"form")!.props.onSubmit as (event:unknown)=>void)({preventDefault(){}});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.values[3],"Kode salah");assert.equal(f.find(f.render(),"a"),undefined);assert.equal(f.values[1],true);
});
function assertNativeDownload(link:Element|undefined){
  assert.ok(link);assert.equal(link.type,"a");assert.equal(link.props.href,"/api/books/story/file?download=1");
  assert.equal(link.props.download,true);assert.equal(link.props.target,undefined);assert.equal(link.props.onClick,undefined);
  assert.equal(link.props["aria-label"],"Unduh Story sebagai PDF");assert.equal(link.props.title,"Unduh cerita (PDF)");
}
test("locked remembered proof is validated before exposing a direct download link; reopening revalidates",async()=>{
  const f=component(true,true,true);assert.equal(f.find(f.render(),"a"),undefined);
  (f.find(f.render(),"Button")!.props.onClick as () => void)();
  assert.equal(f.find(f.render(),"a"),undefined);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(f.calls,[["story","id"]]);assertNativeDownload(f.find(f.render(),"a"));assert.equal(f.values[1],true);assert.deepEqual(f.navigation,[]);
  (f.find(f.render(),"Dialog")!.props.onOpenChange as (open:boolean)=>void)(false);
  assert.equal(f.find(f.render(),"a"),undefined);
  f.setFailure();(f.find(f.render(),"Button")!.props.onClick as () => void)();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.find(f.render(),"a"),undefined);assert.equal(f.values[1],true);assert.ok(f.find(f.render(),"Input"));
  assert.deepEqual(f.calls,[["story","id"],["story","id"]]);
});
test("locked valid code exposes a second-tap native download without navigating or auto-clicking",async()=>{
  const f=component(true,false,true);(f.find(f.render(),"Button")!.props.onClick as () => void)();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.values[1],true);assert.equal(f.find(f.render(),"a"),undefined);
  (f.find(f.render(),"Input")!.props.onChange as (event:unknown)=>void)({target:{value:"NanaAccess"}});
  (f.find(f.render(),"form")!.props.onSubmit as (event:unknown)=>void)({preventDefault(){}});
  assert.equal(f.find(f.render(),"a"),undefined);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(f.calls,[ ["story","id"], ["story","id","NanaAccess"] ]);
  assertNativeDownload(f.find(f.render(),"a"));assert.equal(f.values[1],true);assert.equal(f.find(f.render(),"form"),undefined);assert.deepEqual(f.navigation,[]);
});

test("sales link appears only on locked stories with a configured URL and opens safely",()=>{
  for(const [locked,salesLink,expected] of [[true,"https://shop.example/access",true],[true,"",false],[false,"https://shop.example/access",false]] as const){
    const f=component(locked,false,false,salesLink);const tree=f.render();
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
