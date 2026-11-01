import { test } from "node:test";
import assert from "node:assert/strict";
import { adminBooksHref, normalizeAdminBookOptions } from "../src/lib/admin-books-query";

test("admin book query parameters normalize safely and preserve all table state in pagination links", () => {
  assert.deepEqual(normalizeAdminBookOptions({pageSize:25,search:"  Nana  ",status:"draft",sort:"title",direction:"asc"}),{pageSize:25,search:"Nana",status:"draft",sort:"title",direction:"asc"});
  assert.deepEqual(normalizeAdminBookOptions({pageSize:100,search:"x".repeat(150),status:"unknown",sort:"books;drop",direction:"sideways"}),{pageSize:10,search:"x".repeat(100),status:"all",sort:"created_at",direction:"desc"});
  assert.equal(adminBooksHref(normalizeAdminBookOptions({pageSize:50,search:"Nana & Awan",status:"published",sort:"pdf_pages",direction:"asc"}),3),"/admin/books?page=3&pageSize=50&sort=pdf_pages&direction=asc&search=Nana+%26+Awan&status=published");
});
