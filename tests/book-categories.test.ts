import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { bookInput } from "../src/lib/validation";

const book = (slug: string, categories: string[] = []) => ({title:"Cerita",slug,description:"",author:"Studio",categories,status:"published" as const});

test("category validation rejects empty, oversized and non-array input", () => {
  assert.equal(bookInput.safeParse(book("valid",["Petualangan","Fantasi"])).success,true);
  assert.equal(bookInput.safeParse({title:"Cerita",slug:"missing",description:"",author:"",status:"published"}).success,false);
  for (const categories of [[""],["   "],["a".repeat(51)],Array(21).fill("Fantasi"),"Fantasi",null]) {
    assert.equal(bookInput.safeParse({...book("invalid"),categories}).success,false);
  }
});

test("category migration preserves legacy data, deduplicates labels and enforces relations", async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile(new URL("../db/001-initial.sql",import.meta.url),"utf8"));
    const original = await db.query<{id:string}>("INSERT INTO books(slug,title,category,pdf_path,cover_path,pdf_pages) VALUES('old','Lama',' Petualangan, Fantasi, petualangan ','old.pdf','old.webp',1) RETURNING id");
    const migration = await readFile(new URL("../db/002-book-categories.sql",import.meta.url),"utf8");
    await db.exec(migration);
    await db.exec(migration);
    assert.equal((await db.query("SELECT * FROM m_book_category")).rows.length,2);
    assert.equal((await db.query("SELECT * FROM tr_book_category")).rows.length,2);
    assert.equal((await db.query<{category:string}>("SELECT category FROM books")).rows[0].category," Petualangan, Fantasi, petualangan ");
    await assert.rejects(db.query("INSERT INTO m_book_category(name) VALUES('FANTASI')"));
    await assert.rejects(db.query("INSERT INTO m_book_category(name) VALUES('')"));
    await assert.rejects(db.query("DELETE FROM m_book_category"));
    await db.query("DELETE FROM books WHERE id=$1",[original.rows[0].id]);
    assert.equal((await db.query("SELECT * FROM tr_book_category")).rows.length,0);
    assert.equal((await db.query("SELECT * FROM m_book_category")).rows.length,2);
  } finally { await db.close(); }
});

test("book category writes are atomic, reusable on the next book, editable, and admin protected", async () => {
  const db = new PGlite();
  const pool = new Pool({connectionString:"postgresql://test:test@127.0.0.1:1/test"});
  process.env.BETTER_AUTH_SECRET="isolated-category-test-secret-not-production";
  process.env.BETTER_AUTH_URL="http://localhost:3000";
  (globalThis as unknown as {nanaPool:Pool}).nanaPool=pool;
  let failRelation = false;
  const query = async (sql:string, values:unknown[] = []) => {
    if (failRelation && sql.startsWith("INSERT INTO tr_book_category")) throw new Error("isolated relation failure");
    const result = await db.query(sql,values);
    return {...result,rowCount:result.affectedRows ?? result.rows.length};
  };
  mock.method(pool,"query",query);
  mock.method(pool,"connect",async () => ({query,release() {}}));
  try {
    for (const id of ["001-initial","002-book-categories"]) await db.exec(await readFile(new URL(`../db/${id}.sql`,import.meta.url),"utf8"));
    const {writeBook} = await import("../src/lib/book-write");
    const {listBookCategories,getBookCategories} = await import("../src/lib/book-categories");
    const {getAdminBook,getPublicBook,listBooks} = await import("../src/lib/books");
    const {getAuth} = await import("../src/lib/auth");
    let role: string | null = "admin";
    mock.method(getAuth().api,"getSession",async () => role ? {user:{id:"test",role}} : null);
    const {PATCH} = await import("../src/app/api/admin/books/[id]/route");
    const first="11111111-1111-4111-8111-111111111111";
    const second="22222222-2222-4222-8222-222222222222";
    const third="33333333-3333-4333-8333-333333333333";
    const upload={pdf:"test.pdf",cover:"test.webp",pages:1};
    await writeBook(first,book("first",["Petualangan","Fantasi"]),upload);
    assert.deepEqual((await listBookCategories()).map(item=>item.name),["Fantasi","Petualangan"]);
    assert.equal((await getBookCategories(first)).length,2);
    // Simulates the next form consuming the persistent options, with case-insensitive reuse.
    await writeBook(second,book("second",["petualangan","Fantasi","FANTASI"]),upload);
    assert.equal((await listBookCategories()).length,2);
    assert.equal((await getBookCategories(second)).length,2);
    assert.equal((await getPublicBook("first"))?.category,"Fantasi, Petualangan");
    assert.equal((await listBooks(1,true)).total,2);
    function request(categories:unknown, origin="http://localhost:3000", method="PATCH") {
      return new Request(`http://localhost:3000/api/admin/books/${first}`,{method,headers:{origin,"content-type":"application/json"},body:method==="PATCH"?JSON.stringify({...book("first"),categories}):undefined});
    }
    const context={params:Promise.resolve({id:first})};
    role=null; assert.equal((await PATCH(request([]),context)).status,401);
    role="reader"; assert.equal((await PATCH(request([]),context)).status,401);
    role="admin";
    assert.equal((await PATCH(request([],"https://untrusted.test"),context)).status,403);
    assert.equal((await PATCH(request([" "]),context)).status,400);
    assert.equal((await PATCH(request([]),{params:Promise.resolve({id:third})})).status,404);
    assert.equal((await PATCH(request(["Fantasi"]),context)).status,200);
    assert.deepEqual((await getBookCategories(first)).map(item=>item.name),["Fantasi"]);
    assert.equal((await listBookCategories()).length,2);
    failRelation=true;
    assert.equal((await PATCH(request(["Baru"]),context)).status,400);
    assert.deepEqual((await getBookCategories(first)).map(item=>item.name),["Fantasi"]);
    assert.equal((await listBookCategories()).length,2); // failed master insert rolled back
    await assert.rejects(writeBook(third,book("third",["Baru"]),upload));
    assert.equal(await getAdminBook(third),null); // new book rolled back too
    failRelation=false;
    await assert.rejects(writeBook(second,book("first",["Duplikat"]),upload));
    assert.equal((await listBookCategories()).length,2);
    assert.equal((await PATCH(request([]),context)).status,200);
    assert.equal((await getBookCategories(first)).length,0);
    assert.equal((await getAdminBook(first))?.category,"");
    await db.query("DELETE FROM books WHERE id=$1",[first]);
    assert.equal((await listBookCategories()).length,2);
    assert.equal((await getBookCategories(first)).length,0);
    assert.equal((await getBookCategories(second)).length,2);
    await writeBook(second,{...book("second",["Fantasi", "Sains, Alam"]),status:"draft"});
    assert.deepEqual((await getBookCategories(second)).map(item=>item.name),["Fantasi","Sains, Alam"]);
    assert.equal((await listBookCategories()).length,3);
    assert.equal(await getPublicBook("second"),null);
    assert.equal((await listBooks(1)).total,0);
  } finally {
    mock.restoreAll();
    delete (globalThis as unknown as {nanaPool?:Pool}).nanaPool;
    await pool.end();
    await db.close();
  }
});
