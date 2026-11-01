import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { PoolClient } from "pg";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { parseAdminEnvironment, seedAdmin } from "../scripts/lib/admin-seed.js";

const input={email:"seed@example.test",name:"Test Admin",password:"test-only-random-password-123"};
async function setup() {
  const db=new PGlite();
  await db.exec(await readFile(new URL("../db/001-initial.sql",import.meta.url),"utf8"));
  return db;
}
function client(db:PGlite) {
  return { query: async(text:string,params?:unknown[])=>{
    // PGlite is isolated PostgreSQL WASM and has no competing database sessions.
    if(text.includes("pg_advisory_xact_lock"))return {rows:[]};
    return db.query(text,params);
  }} as unknown as Pick<PoolClient,"query">;
}
test("seed creates a Better Auth credential atomically and rerun preserves password",async()=>{
  const db=await setup();
  try {
    assert.equal(await seedAdmin(client(db),input,hashPassword),"created");
    const first=await db.query<{password:string;role:string;email:string}>(`SELECT a.password,u.role,u.email FROM account a JOIN "user" u ON a."userId"=u.id`);
    assert.equal(first.rows.length,1);assert.equal(first.rows[0].role,"admin");
    assert.notEqual(first.rows[0].password,input.password);
    assert.equal(await verifyPassword({hash:first.rows[0].password,password:input.password}),true);
    assert.equal(await seedAdmin(client(db),{...input,password:"different-password-123456"},()=>{throw new Error("must not rehash existing account");}),"existing");
    const after=await db.query<{password:string}>("SELECT password FROM account");
    assert.equal(after.rows.length,1);assert.equal(after.rows[0].password,first.rows[0].password);
  } finally {await db.close();}
});
test("failed seed rolls back user creation",async()=>{
  const db=await setup();
  try{
    await db.exec(`CREATE FUNCTION reject_account() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$ LANGUAGE plpgsql; CREATE TRIGGER reject_account BEFORE INSERT ON account FOR EACH ROW EXECUTE FUNCTION reject_account();`);
    await assert.rejects(seedAdmin(client(db),input,async()=>"hash"));
    const result=await db.query("SELECT * FROM \"user\"");assert.equal(result.rows.length,0);
  }finally{await db.close();}
});
test("seed refuses an existing account without a usable credential",async()=>{
  const db=await setup();
  try{await db.query('INSERT INTO "user"(id,name,email,role) VALUES($1,$2,$3,$4)',["broken","Broken",input.email,"admin"]);
    await assert.rejects(seedAdmin(client(db),input,hashPassword),/tidak cocok/);
    assert.equal((await db.query("SELECT * FROM account")).rows.length,0);
  }finally{await db.close();}
});
test("admin configuration fails without secrets leaking and normalizes email",()=>{
  assert.throws(()=>parseAdminEnvironment({ADMIN_PASSWORD:"secret-should-not-be-logged"}),error=>error instanceof Error&&!error.message.includes("secret-should-not-be-logged"));
  assert.equal(parseAdminEnvironment({ADMIN_EMAIL:" ADMIN@EXAMPLE.TEST ",ADMIN_PASSWORD:input.password}).email,"admin@example.test");
  assert.equal(parseAdminEnvironment({ADMIN_EMAIL:input.email,ADMIN_PASSWORD:"secret"}).password,"secret");
  assert.throws(()=>parseAdminEnvironment({ADMIN_EMAIL:input.email,ADMIN_PASSWORD:"short"}));
  assert.throws(()=>parseAdminEnvironment({ADMIN_EMAIL:input.email,ADMIN_PASSWORD:"x".repeat(129)}));
});
