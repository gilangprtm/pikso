import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

type Element = {type:unknown;props:Record<string,unknown>};
const source=readFileSync("src/components/catalog/catalog-carousel.tsx","utf8");
// Direct element/callback invocation, not browser DOM or React lifecycle simulation.
function fixture(count:number, active=0, minimumSlides=4) {
  const effects:(()=>void|(()=>void))[]=[];const changes:unknown[]=[];const events=new Map<string,()=>void>();
  let selected=active;
  const api={selectedScrollSnap:()=>selected,on:(name:string,fn:()=>void)=>events.set(name,fn),off:(name:string,fn:()=>void)=>{assert.equal(events.get(name),fn);events.delete(name);}};
  let state=0;const element=(type:unknown,props:Record<string,unknown>)=>({type,props});
  const modules:Record<string,unknown>={
    react:{useState:()=>{const index=state++;return index===0?[api,()=>{}]:index===1?[active,(value:unknown)=>changes.push(value)]:[minimumSlides,()=>{}]},useRef:()=>({current:null}),useCallback:(fn:unknown)=>fn,useEffect:(fn:()=>void)=>effects.push(fn)},
    "react/jsx-runtime":{jsx:element,jsxs:element},
    "next/link":{default:"Link"},
    "@/components/ui/carousel":{Carousel:"Carousel",CarouselContent:"Content",CarouselItem:"Item",CarouselNext:"Next",CarouselPrevious:"Previous"},
  };
  const exports:{CatalogCarousel?:(props:unknown)=>Element}={};
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function("require","exports",code)((name:string)=>modules[name],exports);
  const books=Array.from({length:count},(_,i)=>({id:`book-${i}`,slug:`story-${i}`,title:`Story ${i}`}));
  const root=exports.CatalogCarousel!({books});
  const content=root.props.children as Element;
  const slides=content.props.children as Element[];
  return {root,slides,effects,events,changes,select:(index:number)=>{selected=index;events.get("select")!();}};
}

test("catalog swipe-only loop preserves selected-index events and cleanup without controls",()=>{
  const f=fixture(2);
  assert.deepEqual(f.root.props.opts,{align:"center",containScroll:false,loop:true});
  assert.equal(f.slides[0].props.inert,false);assert.equal(f.slides[1].props.inert,true);
  const cleanup=f.effects[0]();f.select(3);f.events.get("reInit")!();assert.deepEqual(f.changes,[3,3]);cleanup?.();assert.equal(f.events.size,0);
  assert.doesNotMatch(source,/CarouselPrevious|CarouselNext|<output|catalog-carousel-controls|catalog-carousel-count/);
});

test("story card contains only its cover while retaining the accessible title and destination",()=>{
  const {slides}=fixture(2);
  const link=((slides[0].props.children as Element).props.children as Element);
  assert.equal(link.props.href,"/books/story-0");
  assert.equal(link.props["aria-label"],"Buka cerita Story 0");
  const cover=link.props.children as Element;
  assert.equal(Array.isArray(cover),false);
  assert.equal(cover.props.className,"book-cover");
  const image=cover.props.children as Element;
  assert.equal(image.type,"img");
  assert.deepEqual(image.props,{src:"/api/books/story-0/cover",alt:"",loading:"lazy",decoding:"async"});
});

test("short pages repeat whole ordered sets, full pages retain twelve unique stories, singleton does not loop",()=>{
  for(const [count,minimum] of [[2,4],[3,4],[4,4],[12,4],[2,10],[12,14]]){
    const f=fixture(count,0,minimum);
    assert.equal(f.slides.length,Math.ceil(minimum/count)*count);
    for(const [index,slide] of f.slides.entries()){
      assert.equal(((slide.props.children as Element).props.children as Element).props.href,`/books/story-${index%count}`);
    }
    assert.deepEqual(f.root.props.opts,{align:"center",containScroll:false,loop:true});
  }
  const single=fixture(1);
  assert.equal(single.slides.length,1);
  assert.deepEqual(single.root.props.opts,{align:"center",containScroll:false,loop:false});
  // Source contract only: actual ResizeObserver/browser geometry is deliberately not simulated.
  assert.match(source,/Math\.ceil\(viewport\.clientWidth \/ slide\.offsetWidth\) \+ 2/);
  assert.match(source,/observer\.observe\(viewport\)/);assert.match(source,/observer\.observe\(slide\)/);
  assert.match(source,/observer\.disconnect\(\)/);
});
