import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

type Element={type:unknown;props:Record<string,unknown>};
function component(locked:boolean,stored=false){
  const values:unknown[]=[false,"","",false];const calls:unknown[][]=[];const navigation:string[]=[];
  let state=0;let fail=false;
  const element=(type:unknown,props:Record<string,unknown>)=>({type,props});
  const modules:Record<string,unknown>={
    react:{useState:(value:unknown)=>{const index=state++;return [values[index]??value,(next:unknown)=>{values[index]=next;}];}},
    "react/jsx-runtime":{jsx:element,jsxs:element,Fragment:"Fragment"},
    "next/navigation":{useRouter:()=>({push:(url:string)=>navigation.push(url),refresh:()=>{}})},
    "lucide-react":{ArrowRight:"ArrowRight",LockKeyhole:"Lock",LoaderCircle:"Loader"},
    "@/components/ui/button":{Button:"Button"},"@/components/ui/input":{Input:"Input"},
    "@/components/ui/dialog":Object.fromEntries(["Dialog","DialogContent","DialogDescription","DialogFooter","DialogHeader","DialogTitle"].map(name=>[name,name])),
    "@/lib/story-access-client":{unlockStory:async(...args:unknown[])=>{calls.push(args);if(fail||(!stored&&args[2]===undefined))throw new Error("Kode salah");}},
  };
  const compiled=ts.transpileModule(readFileSync("src/components/books/start-reading.tsx","utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const exports:{StartReading?:(props:unknown)=>Element}={};new Function("require","exports",compiled)((id:string)=>modules[id],exports);
  const render=()=>{state=0;return exports.StartReading!({slug:"story",id:"id",title:"Story",locked});};
  function find(root:Element,type:string):Element|undefined{
    if(root.type===type)return root;
    const children=root.props.children;
    for(const child of Array.isArray(children)?children:[children]){if(child&&typeof child==="object"&&"props" in child){const match=find(child as Element,type);if(match)return match;}}
  }
  return {render,find,values,calls,navigation,setFailure:()=>{fail=true;}};
}
// Direct component/callback checks only; no DOM, browser or lifecycle simulation.
test("Start Reading bypasses modal for open stories and restores remembered access without asking for code",async()=>{
  for(const [locked,stored] of [[false,false],[true,true]]){
    const f=component(locked,stored);const root=f.render();
    const button=f.find(root,"Button")!;(button.props.onClick as ()=>void)();await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(f.navigation,["/books/story/read"]);assert.equal(f.values[0],false);assert.equal(f.calls.length,locked?1:0);
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
