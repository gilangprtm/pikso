import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { jsx, jsxs } from "react/jsx-runtime";
import { adminBookReturnHref } from "../src/lib/admin-book-return";

// Functional handler harness only: no DOM, browser or simulated React lifecycle.
function formHarness(mode: "create" | "edit", ok: boolean) {
  const calls: unknown[][] = [];
  const metadata = { title:"Test",slug:"test",author:"Studio",description:"",categories:[],status:"published" };
  const states = [metadata,"",false,{phase:"ready",percent:100},"upload-session",{name:"test.pdf"}];
  let state = 0;
  const modules: Record<string, unknown> = {
    react: {useState: () => { const index=state++; return [states[index], (value:unknown) => { calls.push(["state",index,value]); }]; },useRef: () => ({current:"resume-key"}),useEffect() {}},
    "react/jsx-runtime": {jsx,jsxs},
    "next/navigation": {useRouter: () => ({push: (url:string) => calls.push(["navigate",url]), refresh: () => calls.push(["refresh"])}),useSearchParams: () => new URLSearchParams({returnTo:"/admin/books?page=3&status=published"})},
    "@/lib/admin-book-return": {adminBookReturnHref},
    "@/lib/resumable-upload-client": {finalizeUploadedBook: async (...args:unknown[]) => { calls.push(["finalize",...args]); if(!ok)throw new Error("Save failed"); }},
    "@/lib/validation": {MAX_PDF_BYTES:52428800},
    sonner: {toast:{success:(message:string) => calls.push(["toast",message])}},
  };
  const source = readFileSync("src/components/admin/book-form.tsx","utf8");
  const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const exports: {BookForm?: (props:unknown) => {props:{children:{props:{onSubmit:(event:unknown)=>Promise<void>}}}}} = {};
  const load = (name:string) => modules[name] ?? new Proxy({}, {get: (_,key) => (...args:unknown[]) => ({type:String(key),props:args[0]})});
  const fetch = async (_url:string, init:{body:string}) => {calls.push(["patch",JSON.parse(init.body)]);return {ok,json:async()=>ok?{ok:true}:{error:"Save failed"}};};
  new Function("require","exports","fetch",compiled)(load,exports,fetch);
  const tree=exports.BookForm!({mode,id:"test-book"});
  return {calls,metadata,submit:()=>tree.props.children.props.onSubmit({preventDefault(){}})};
}

for (const mode of ["create","edit"] as const) {
  test(`${mode} success returns to originating list and emits toast after save`,async()=>{
    const harness=formHarness(mode,true);await harness.submit();
    const events=harness.calls.filter(([event])=>["finalize","patch","toast","navigate"].includes(String(event)));
    assert.deepEqual(events.map(([event])=>event),[mode==="create"?"finalize":"patch","toast","navigate"]);
    assert.deepEqual(events[0].at(-1),harness.metadata);
    assert.equal(events[2][1],"/admin/books?page=3&status=published");
    assert.match(String(events[1][1]),/berhasil/);
  });
  test(`${mode} failure keeps form open and never shows success toast`,async()=>{
    const harness=formHarness(mode,false);await harness.submit();
    assert.ok(harness.calls.some(([event,index,value])=>event==="state"&&index===1&&value==="Save failed"));
    assert.ok(!harness.calls.some(([event])=>event==="toast"||event==="navigate"));
  });
}
