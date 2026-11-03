import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import ts from "typescript";
import postcss from "postcss";

async function catalog(mode: "populated" | "empty" | "unavailable") {
  const queries: unknown[][] = [];
  let carouselProps: unknown;
  const books=Array.from({length:12},(_,i)=>({id:`book-${i}`,slug:`story-${i}`,title:i===0?'Nana <awan> & "teman"':"Judul cerita yang cukup panjang untuk beberapa baris",category:"Petualangan",author:"Pikso",pdf_pages:15}));
  const modules: Record<string,unknown> = {
    "react/jsx-runtime":{Fragment,jsx,jsxs},
    "react":{cache:(fn:unknown)=>fn},
    "next/link":{default:({children,...props}:{children:ReactNode})=>createElement("a",props,children)},
    "@/components/nav":{Nav:()=>createElement("nav",null,"Navigasi")},
    "@/components/pagination":{Pagination:({current,pages,base}:{current:number;pages:number;base:string})=>createElement("nav",{"aria-label":"Pagination", "data-current":current,"data-pages":pages,"data-base":base})},
    "@/components/catalog/catalog-carousel":{CatalogCarousel:(props:unknown)=>{carouselProps=props;return createElement("div",{"data-testid":"catalog-carousel"});}},
    "@/lib/books":{listBooks:async(...args:unknown[])=>{queries.push(args);if(mode==="unavailable")throw new Error("test-only unavailable");return {books:mode==="empty"?[]:books,current:2,pages:3};}},
    "@/lib/validation":{parsePage:(page:string)=>Number(page)||1},
    "@/lib/assets":{assets:{curious:"/assets/characters/nana-penasaran.png"}},
  };
  const compiled=ts.transpileModule(readFileSync("src/app/books/page.tsx","utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const exports:{default?:(props:unknown)=>Promise<ReactNode>}={};
  new Function("require","exports",compiled)((name:string)=>modules[name],exports);
  const html=renderToStaticMarkup(await exports.default!({searchParams:Promise.resolve({page:"2"})}));
  return {html,queries,carouselProps};
}

test("catalog keeps published server pagination and passes only public story identity/title to its horizontal deck",async()=>{
  const {html,queries,carouselProps}=await catalog("populated");
  assert.deepEqual(queries,[[2]]);
  assert.deepEqual(carouselProps,{books:Array.from({length:12},(_,i)=>({id:`book-${i}`,slug:`story-${i}`,title:i===0?'Nana <awan> & "teman"':"Judul cerita yang cukup panjang untuk beberapa baris"}))});
  assert.match(html,/<main class="screen page-screen catalog-screen content-inset-screen">/);
  assert.match(html,/data-testid="catalog-carousel"/);
  assert.match(html,/data-current="2" data-pages="3" data-base="\/books"/);
  assert.match(readFileSync("src/components/pagination.tsx","utf8"),/aria-label="Halaman sebelumnya"[\s\S]*aria-label="Halaman berikutnya"/);
  assert.doesNotMatch(html,/<awan>/);
});

test("catalog empty and unavailable states remain unchanged",async()=>{
  assert.match((await catalog("empty")).html,/Cerita baru segera hadir/);
  assert.match((await catalog("unavailable")).html,/Rak cerita sedang disiapkan/);
});

test("catalog deck shows covers only, retains accessible story links and is swipe-only",()=>{
  const source=readFileSync("src/components/catalog/catalog-carousel.tsx","utf8");
  assert.match(source,/href=\{`\/books\/\$\{book\.slug\}`\}/);
  assert.match(source,/aria-label=\{`Buka cerita \$\{book\.title\}`\}/);
  assert.match(source,/src=\{`\/api\/books\/\$\{book\.slug\}\/cover`\} alt="" loading="lazy" decoding="async"/);
  assert.doesNotMatch(source,/book-meta|<h2/);
  assert.doesNotMatch(source,/CarouselPrevious|CarouselNext|<output|catalog-carousel-controls|catalog-carousel-count/);
  assert.match(source,/aria-hidden=\{index !== active\} inert=\{index !== active\}/);
  assert.match(readFileSync("src/components/ui/carousel.tsx","utf8"),/event\.key === "ArrowLeft"[\s\S]*scrollPrev\(\)[\s\S]*event\.key === "ArrowRight"[\s\S]*scrollNext\(\)/);
  assert.match(readFileSync("src/lib/books.ts","utf8"),/export const PAGE_SIZE = 12;/);
});

test("catalog styles enforce one nonvertical carousel stage and square cover-only cards without a fade overlay",()=>{
  const css=postcss.parse(readFileSync("src/app/globals.css","utf8"));
  const rules=new Map<string,Record<string,string>>();
  css.walkRules(rule=>{
    if(!rule.selector.startsWith(".catalog-screen")||rule.parent?.type!=="root")return;
    const declarations:Record<string,string>={};rule.walkDecls(decl=>{declarations[decl.prop]=decl.value;});rules.set(rule.selector,declarations);
  });
  const carousel=rules.get(".catalog-screen .catalog-carousel")!;
  assert.equal(carousel.flex,"1");assert.equal(carousel["min-height"],"0");
  const viewport=rules.get('.catalog-screen .catalog-carousel [data-slot="carousel-content"]')!;
  assert.equal(viewport.overflow,"hidden");assert.equal(viewport["overflow-y"],undefined);assert.equal(viewport["container-type"],"size");
  const track=rules.get(".catalog-screen .catalog-carousel-track")!;
  assert.equal(track["touch-action"],"pan-y pinch-zoom");
  const slide=rules.get(".catalog-screen .catalog-carousel-slide")!;
  assert.equal(slide["flex-basis"],"min(78vw,480px,calc(100cqh - 24px))");assert.equal(slide["max-height"],"100%");
  assert.equal(track.flex,"0 0 100%");assert.equal(track.width,"100%");assert.equal(track["min-width"],"0");
  assert.equal(rules.get(".catalog-screen .catalog-carousel-slide")!.transition,"none");
  const inactiveCard=rules.get('.catalog-screen .catalog-carousel-slide[data-active="false"] .catalog-carousel-card')!;
  assert.equal(inactiveCard.opacity,".58");assert.equal(inactiveCard.transform,"scale(.88)");
  assert.equal(rules.get(".catalog-screen .catalog-carousel-card")!.transition,"opacity .25s ease,transform .25s ease");
  assert.equal(rules.has(".catalog-screen .catalog-carousel-controls"),false);
  const card=rules.get(".catalog-screen .book-card")!;
  assert.equal(card["aspect-ratio"],"1 / 1");assert.equal(card.position,"relative");assert.equal(card.display,"block");
  assert.equal(card["border-radius"],"18px");assert.equal(card.overflow,"hidden");
  const cover=rules.get(".catalog-screen .book-cover")!;
  assert.equal(cover.position,"absolute");assert.equal(cover.inset,"0");assert.equal(cover["border-radius"],"inherit");
  const image=rules.get(".catalog-screen .book-cover img")!;
  assert.equal(image["object-fit"],"cover");assert.equal(image["border-radius"],"inherit");
  assert.equal(rules.has(".catalog-screen .book-meta"),false);
  assert.equal(rules.has(".catalog-screen .book-meta h2"),false);
  assert.equal(rules.has(".catalog-screen .book-card::after"),false);
  assert.equal(rules.get(".catalog-screen .book-cover::after")!.display,"none");
  const responsive=new Map<string,Record<string,string>>();
  css.walkAtRules("media",media=>media.walkRules(rule=>{
    if(!rule.selector.startsWith(".catalog-screen"))return;
    const declarations:Record<string,string>={};rule.walkDecls(decl=>{declarations[decl.prop]=decl.value;});responsive.set(`${media.params}|${rule.selector}`,declarations);
  }));
  const mobile=responsive.get("(max-width:600px)|.catalog-screen .catalog-carousel-slide")!;
  assert.equal(mobile["flex-basis"],"min(82vw,296px,calc(100cqh - 16px))");
  assert.equal(responsive.get("(max-width:600px)|.catalog-screen")!.padding,"76px 0 calc(80px + env(safe-area-inset-bottom,0px))");
  for(const [selector,declarations] of rules){
    if(selector.endsWith(".catalog-carousel-track")||selector.endsWith(".catalog-carousel-slide")){
      assert.equal(declarations.transform,undefined);
      assert.ok(!declarations.transition||declarations.transition==="none");
    }
  }
  assert.ok(rules.has(".catalog-screen .book-card:focus-visible"));
});
