import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import type { IndexedPdfChunkStore as Store } from "../src/components/reader/pdf-range-source";

// Native IDB request/transaction contract fixture only; no browser or React lifecycle.
function adapterFixture(){
  const stores=new Map<string,Map<string,unknown>>();const modes:string[]=[];
  const db={close(){},createObjectStore(name:string){stores.set(name,new Map());},transaction(_names:unknown,mode:string){
    modes.push(mode);let pending=0,done=false;
    const tx:{oncomplete?:()=>void;onabort?:()=>void;onerror?:()=>void;abort:()=>void;objectStore:(name:string)=>unknown}={abort(){done=true;tx.onabort?.();},objectStore(name){
      const values=stores.get(name)!;
      function schedule(fn:()=>void){pending++;setImmediate(()=>{if(!done)fn();pending--;if(!pending&&!done)setImmediate(()=>{if(!pending&&!done){done=true;tx.oncomplete?.();}});});}
      return{put(value:{id:string}){schedule(()=>values.set(value.id,structuredClone(value)));},delete(id:string){schedule(()=>values.delete(id));},get(id:string){const req:{result?:unknown;onsuccess?:()=>void}={};schedule(()=>{req.result=structuredClone(values.get(id));req.onsuccess?.();});return req;},openCursor(){
        const req:{onsuccess?:(event:unknown)=>void}={};let entries:[string,unknown][]|undefined;let index=0;const deleted=new Set<string>();
        const advance=()=>schedule(()=>{entries??=[...values.entries()];while(entries[index]&&deleted.has(entries[index][0]))index++;const entry=entries[index++];const cursor=entry?{value:entry[1],delete:()=>{deleted.add(entry[0]);schedule(()=>values.delete(entry[0]));},update:(value:unknown)=>{schedule(()=>values.set(entry[0],structuredClone(value)));},continue:advance}:null;req.onsuccess?.({target:{result:cursor}});});advance();return req;
      }};
    }};return tx;
  }};
  const indexedDB={open(){const req:{result:typeof db;onupgradeneeded?:()=>void;onsuccess?:()=>void}={result:db};setImmediate(()=>{req.onupgradeneeded?.();req.onsuccess?.();});return req;}};
  const js=ts.transpileModule(readFileSync("src/components/reader/pdf-range-source.ts","utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const exports:{IndexedPdfChunkStore?:new()=>Store}={};new Function("require","exports","indexedDB",js)(()=>({PDFDataRangeTransport:class{}}),exports,indexedDB);
  return{store:new exports.IndexedPdfChunkStore!(),stores,modes};
}
test("IndexedDB adapter persists chunks across reads and evicts stale/superseded/oldest metadata atomically",async()=>{
  const {store,stores,modes}=adapterFixture();await store.prune("/file",'"v1"');
  const chunk={id:"kept",url:"/file",etag:'"v1"',start:0,bytes:new Uint8Array([1,2,3]).buffer,usedAt:Date.now()};
  await store.put(chunk);assert.deepEqual(await store.get("kept"),chunk);
  const old={...chunk,id:"expired",url:"/expired-file",usedAt:Date.now()-8*86400000};await store.put(old);
  const metadata=stores.get("metadata")!;const aged=metadata.get("expired") as {usedAt:number};aged.usedAt=Date.now()-8*86400000;metadata.set("expired",aged);
  await store.prune("/file",'"v1"');assert.equal(await store.get("expired"),undefined);
  assert.ok((stores.get("metadata")!.get("kept") as {usedAt:number}).usedAt>Date.now()-60_000,"opening a book refreshes its sliding TTL");
  await store.put({...chunk,id:"old-version",etag:'"old"'});await store.prune("/file",'"v1"');assert.equal(await store.get("old-version"),undefined);assert.deepEqual(await store.get("kept"),chunk);
  const chunks=stores.get("chunks")!;
  metadata.set("large-old",{id:"large-old",url:"/another",etag:'"x"',size:64*1024*1024,usedAt:Date.now()-10000});chunks.set("large-old",{bytes:"fixture metadata only"});
  await store.put({...chunk,id:"new"});assert.equal(chunks.has("large-old"),false);assert.equal(metadata.has("large-old"),false);assert.equal(chunks.has("new"),true);assert.ok(modes.includes("readwrite")&&modes.includes("readonly"));
});
