import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as runtime from "react/jsx-runtime";
import ts from "typescript";
import postcss from "postcss";

test("detail page keeps separate cover and normal-flow book copy, back/read links and missing-book guard",async()=>{
  const queries:string[]=[];
  const book={slug:"nana-awan",title:"Nana <awan> & teman",category:"Petualangan",author:"Pikso",description:"Petualangan di kerajaan awan.",pdf_pages:15};
  const icon=()=>createElement("svg",{"aria-hidden":true});
  const modules:Record<string,unknown>={
    "react/jsx-runtime":runtime,
    "next/link":{default:({children,...props}:{children:ReactNode})=>createElement("a",props,children)},
    "next/navigation":{notFound:()=>{throw new Error("test-not-found");}},
    "lucide-react":{ArrowLeft:icon,ArrowRight:icon,BookOpen:icon,Clock3:icon},
    "@/components/nav":{Nav:()=>createElement("nav",null,"Navigasi")},
    "@/lib/books":{getPublicBook:async(slug:string)=>{queries.push(slug);return slug==="missing"?null:book;}},
  };
  const source=readFileSync("src/app/books/[slug]/page.tsx","utf8");
  const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const exports:{default?:(props:unknown)=>Promise<ReactNode>}={};
  new Function("require","exports",js)((name:string)=>modules[name],exports);
  const html=renderToStaticMarkup(await exports.default!({params:Promise.resolve({slug:book.slug})}));
  assert.deepEqual(queries,[book.slug]);
  assert.match(html,/<div class="book-detail-cover"><img[^>]*src="\/api\/books\/nana-awan\/cover"[^>]*\/><\/div><div class="book-detail-copy">/);
  assert.match(html,/<h1>Nana &lt;awan&gt; &amp; teman<\/h1>/);
  assert.match(html,/href="\/books"/);assert.match(html,/href="\/books\/nana-awan\/read"/);
  for(const text of ["Petualangan","Pikso","15","MULAI MEMBACA"])assert.ok(html.includes(text));
  await assert.rejects(exports.default!({params:Promise.resolve({slug:"missing"})}),/test-not-found/);
});

test("detail mobile styles give cover a bounded square owner, isolate image sizing and enable scrolling",()=>{
  const css=postcss.parse(readFileSync("src/app/globals.css","utf8"));
  function rule(selector:string,media?:string){
    const result:Record<string,string>={};
    css.walkRules(r=>{
      const parent=r.parent;
      if(!r.selectors.includes(selector))return;
      if(media ? parent?.type!=="atrule"||!("params" in parent)||parent.params!==media : parent?.type!=="root")return;
      r.walkDecls(d=>{result[d.prop]=d.value;});
    });return result;
  }
  const mobile="(max-width:600px)";
  const screen=rule(".book-detail-screen",mobile);
  assert.equal(screen.display,"block");assert.equal(screen["overflow-y"],"auto");
  assert.match(screen.padding,/78px \+ env\(safe-area-inset-bottom/);
  const grid=rule(".book-detail-card",mobile);
  assert.equal(grid["grid-template-columns"],"minmax(0,1fr)");assert.equal(grid.gap,"18px");
  const cover=rule(".book-detail-cover",mobile);
  assert.equal(cover.position,"relative");assert.equal(cover.width,"min(100%,260px)");
  assert.equal(cover.height,"auto");assert.equal(cover["aspect-ratio"],"1");assert.equal(cover.overflow,"hidden");
  const image=rule(".book-detail-cover img",mobile);
  for(const [key,value] of Object.entries({position:"absolute",inset:"0",width:"100%",height:"100%","object-fit":"contain"}))assert.equal(image[key],value);
  // Desktop sizing remains unchanged; only the mobile image is removed from intrinsic grid sizing.
  assert.equal(rule(".book-detail-cover").height,"min(62vh,560px)");
  assert.equal(rule(".book-detail-cover img")["object-fit"],"contain");
  assert.equal(rule(".book-detail-copy h1",mobile)["overflow-wrap"],"anywhere");
  assert.equal(rule(".book-detail-copy h1",mobile)["line-height"],"1.08");
  // Copy remains a sibling in normal flow, not an overlay like catalog cards.
  assert.equal(rule(".book-detail-copy").position,undefined);
  assert.equal(rule(".book-detail-copy",mobile).position,undefined);
});
