import { test } from "node:test";
import assert from "node:assert/strict";
import { bookInput } from "../src/lib/validation";

const valid = {title:"Book",slug:"book",description:"",author:"",categories:[],status:"draft"};
test("sales link accepts blank and trims absolute http(s) URLs",()=>{
  assert.equal(bookInput.parse({...valid,salesLink:""}).salesLink,"");
  assert.equal(bookInput.parse({...valid,salesLink:"  https://shop.example/access  "}).salesLink,"https://shop.example/access");
  assert.equal(bookInput.parse({...valid,salesLink:"http://shop.example"}).salesLink,"http://shop.example");
});
test("sales link rejects unsafe, relative, malformed and oversized URLs",()=>{
  for(const salesLink of ["javascript:alert(1)","data:text/html,hello","/relative","//shop.example","not a URL","https://"+"a".repeat(2048)+".com"])
    assert.equal(bookInput.safeParse({...valid,salesLink}).success,false,salesLink.slice(0,30));
});
