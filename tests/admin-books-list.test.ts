import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";

test("server book table paginates and sorts the whole catalog, filters safely and preserves public listing", async () => {
  const db = new PGlite();
  const pool = new Pool({connectionString:"postgresql://test:test@127.0.0.1:1/test"});
  (globalThis as unknown as {nanaPool:Pool}).nanaPool=pool;
  mock.method(pool,"query",async (sql:string,values:unknown[]=[]) => {
    const result=await db.query(sql,[...values]);return {...result,rowCount:result.rows.length};
  });
  try {
    for(const id of ["001-initial","002-book-categories","003-book-access-codes"]) await db.exec(await readFile(new URL(`../db/${id}.sql`,import.meta.url),"utf8"));
    for(let i=1;i<=32;i++) await db.query("INSERT INTO books(slug,title,author,status,pdf_path,cover_path,pdf_pages,created_at) VALUES($1,$2,$3,$4,'file.pdf','cover.webp',$5,'2026-01-01')",[`book-${i}`,`Buku ${String(i).padStart(2,"0")}`,i===2?"Penulis Khusus":"Studio",i%2?"published":"draft",i]);
    await db.query("INSERT INTO m_book_category(name) VALUES('Fantasi')");
    await db.query("INSERT INTO tr_book_category(book_id,book_category_id) SELECT b.id,c.id FROM books b,m_book_category c WHERE b.slug='book-30'");
    const {listBooks} = await import("../src/lib/books");
    const first=await listBooks(1,true,{sort:"pdf_pages",direction:"asc"});
    assert.equal(first.total,32);assert.equal(first.pages,4);assert.equal(first.books.length,10);assert.equal(first.books[0].pdf_pages,1);
    const second=await listBooks(2,true,{sort:"pdf_pages",direction:"asc"});assert.equal(second.books[0].pdf_pages,11);
    const last=await listBooks(99,true,{sort:"pdf_pages",direction:"asc"});assert.equal(last.current,4);assert.equal(last.books.length,2);assert.equal(last.books[0].pdf_pages,31);
    const descending=await listBooks(1,true,{sort:"pdf_pages",direction:"desc"});assert.equal(descending.books[0].pdf_pages,32);
    for(const pageSize of [25,50]){const result=await listBooks(1,true,{pageSize});assert.equal(result.books.length,Math.min(pageSize,32));}
    assert.equal((await listBooks(1,true,{search:"bUkU 31"})).books[0].pdf_pages,31);
    assert.equal((await listBooks(1,true,{search:"Penulis Khusus"})).books[0].pdf_pages,2);
    assert.equal((await listBooks(1,true,{search:"fantasi",status:"draft"})).books[0].pdf_pages,30);
    assert.equal((await listBooks(1,true,{search:"fantasi",status:"published"})).total,0);
    assert.equal((await listBooks(1,true,{search:"%"})).total,0);
    assert.equal((await listBooks(1,true,{search:"_"})).total,0);
    assert.equal((await listBooks(1,true,{search:"' OR 1=1 --"})).total,0);
    assert.equal((await listBooks(-1,true)).current,1);
    const category=await listBooks(1,true,{sort:"category",direction:"desc"});assert.equal(category.books[0].category,"Fantasi");
    const invalid=await listBooks(1,true,{pageSize:999,sort:"__proto__",direction:"DESC; DROP TABLE books"});assert.equal(invalid.books.length,10);
    const publicList=await listBooks(1,false,{pageSize:50,status:"draft",search:"missing",sort:"pdf_pages",direction:"asc"});assert.equal(publicList.total,16);assert.equal(publicList.pages,2);assert.equal(publicList.pageSize,12);assert.equal(publicList.books.length,12);assert.ok(publicList.books.every(book=>book.status==="published"));
    assert.equal((await listBooks(1,false)).pageSize,12);
    const publicLastPage=await listBooks(2,false);assert.equal(publicLastPage.current,2);assert.equal(publicLastPage.books.length,4);assert.ok(publicLastPage.books.every(book=>book.status==="published"));
    await db.query("DELETE FROM books");const empty=await listBooks(4,true);assert.equal(empty.current,1);assert.equal(empty.pages,1);assert.equal(empty.total,0);
  } finally {mock.restoreAll();delete(globalThis as unknown as {nanaPool?:Pool}).nanaPool;await pool.end();await db.close();}
});
