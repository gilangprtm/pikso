import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postcss from "postcss";

const css=postcss.parse(readFileSync("src/app/globals.css","utf8"));
const selectors=[".page-screen.content-inset-screen",".studio-screen.content-inset-screen"];

test("only requested public routes opt in to centered content; home, details and nav remain unchanged",()=>{
  for(const route of ["books","characters","about"]){
    assert.match(readFileSync(`src/app/${route}/page.tsx`,"utf8"),/className="[^"]* content-inset-screen"/);
  }
  for(const file of ["src/app/page.tsx","src/app/books/[slug]/page.tsx","src/app/characters/nana/page.tsx","src/components/nav.tsx"]){
    assert.doesNotMatch(readFileSync(file,"utf8"),/content-inset-screen/);
  }
});

test("desktop content uses home max-width/inset geometry without constraining backgrounds or header",()=>{
  let matches=0;
  css.walkRules(rule=>{
    if(!rule.selectors.some(selector=>selectors.includes(selector)))return;
    const parent=rule.parent;
    assert.ok(parent?.type==="atrule" && "params" in parent);
    const declarations:Record<string,string>={};rule.walkDecls(d=>{declarations[d.prop]=d.value;});
    assert.deepEqual(Object.keys(declarations),["padding-inline"]);
    assert.deepEqual(rule.selectors,selectors);
    if(parent.params==="(min-width:901px)"){
      assert.equal(declarations["padding-inline"],"max(8vw,calc((100vw - 1540px)/2 + 8vw))");
    }else{
      assert.equal(parent.params,"(min-width:601px) and (max-width:900px)");
      assert.equal(declarations["padding-inline"],"7%");
    }
    matches++;
  });
  assert.equal(matches,2);
  // Arithmetic contract, not a rendered-layout/browser assertion.
  for(const width of [1024,1280,1440,1796,1920,2560]){
    const homeStart=Math.max(0,(width-1540)/2)+width*.08;
    const pageInset=Math.max(width*.08,(width-1540)/2+width*.08);
    assert.equal(pageInset,homeStart);
    assert.ok(width-2*pageInset>0);
  }
});
