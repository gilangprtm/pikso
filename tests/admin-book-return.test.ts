import { test } from "node:test";
import assert from "node:assert/strict";
import { adminBookFormHref, adminBookReturnHref } from "../src/lib/admin-book-return";

test("book form return URL retains admin list state without accepting external or unsafe URLs", () => {
  const list = "/admin/books?page=3&pageSize=25&search=Nana&status=published&sort=title&direction=asc";
  assert.equal(adminBookReturnHref(list), list);
  assert.equal(adminBookFormHref("/admin/books/new", list), `/admin/books/new?returnTo=${encodeURIComponent(list)}`);
  assert.equal(adminBookReturnHref("/admin"), "/admin");
  assert.equal(adminBookReturnHref("/admin/books/e5bad2c3-1f56-46ee-b4c7-37f0e5fa29e3/preview"), "/admin/books");
  assert.equal(adminBookReturnHref("/admin/books?created=1"), "/admin/books");
  for (const unsafe of ["https://evil.test/admin", "//evil.test/admin", "/admin/login", "/admin/books/new", "javascript:alert(1)", ""])
    assert.equal(adminBookReturnHref(unsafe), "/admin/books");
});
