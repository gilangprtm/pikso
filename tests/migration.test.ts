import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

async function migrate(db:PGlite) {
  await db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  let changed = false;
  for (const id of ["001-initial", "002-book-categories", "003-book-access-codes"]) {
    const found=await db.query("SELECT id FROM schema_migrations WHERE id=$1",[id]);
    if(!found.rows.length){await db.exec(await readFile(new URL(`../db/${id}.sql`,import.meta.url),"utf8"));await db.query("INSERT INTO schema_migrations(id) VALUES($1)",[id]);changed=true;}
  }
  return changed;
}
test("initial PostgreSQL migration runs once, has auth and books schema, and leaves existing book schema on rerun",async()=>{
  const db=new PGlite();
  try {
    assert.equal(await migrate(db),true);
    assert.equal(await migrate(db),false);
    const columns=await db.query<{table_name:string;column_name:string}>("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'");
    for(const table of ["user","session","account","verification","books","schema_migrations","m_book_category","tr_book_category"])assert.ok(columns.rows.some(row=>row.table_name===table),`missing ${table}`);
    assert.ok(columns.rows.some(row=>row.table_name==="books"&&row.column_name==="access_code_hash"));
    assert.ok(columns.rows.some(row=>row.table_name==="books"&&row.column_name==="access_version"));
    const book=await db.query<{id:string;slug:string;title:string;description:string;author:string;category:string;status:string;pdf_path:string;cover_path:string;pdf_pages:number}>("INSERT INTO books(slug,title,pdf_path,cover_path,pdf_pages) VALUES('tiny-test','Test','a.pdf','b.webp',1) RETURNING *");
    assert.equal(book.rows[0].status,"draft");
    await assert.rejects(db.query("INSERT INTO books(slug,title,pdf_path,cover_path,pdf_pages) VALUES('tiny-test','duplicate','a.pdf','b.webp',1)"));
    await assert.rejects(db.query("INSERT INTO books(slug,title,pdf_path,cover_path,pdf_pages) VALUES('bad-pages','Bad','a.pdf','b.webp',0)"));
  }finally{await db.close();}
});
test("schema enforces auth relations and book publication status",async()=>{
  const db=new PGlite();
  try {
    await migrate(db);
    await db.query('INSERT INTO "user"(id,name,email) VALUES($1,$2,$3)',["user1","Owner","owner@example.test"]);
    await assert.rejects(db.query("INSERT INTO session(id,\"expiresAt\",token,\"userId\") VALUES($1,now(),$2,$3)",["s","token","missing"]));
    await assert.rejects(db.query("INSERT INTO books(slug,title,status,pdf_path,cover_path,pdf_pages) VALUES('bad','Bad','public','a.pdf','b.webp',1)"));
  }finally{await db.close();}
});
