import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import sharp from "sharp";
import { canonicalUrl, getPublicSiteUrl, pageMetadata, publicPageMetadata, rootMetadata, siteStructuredData } from "../src/lib/seo";
import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";

function withSite(site: string | undefined, run: () => void) {
  const previous = process.env.SITE_URL;
  const indexing = process.env.SITE_INDEXING;
  delete process.env.SITE_INDEXING;
  if (site === undefined) delete process.env.SITE_URL;
  else process.env.SITE_URL = site;
  try { run(); } finally {
    if (previous === undefined) delete process.env.SITE_URL; else process.env.SITE_URL = previous;
    if (indexing === undefined) delete process.env.SITE_INDEXING; else process.env.SITE_INDEXING = indexing;
  }
}

const origin = "https://stories.example.org";

test("SEO uses only an explicit public HTTPS origin and fails closed without usable production configuration", () => {
  for (const value of [undefined, "", "http://stories.example.org", "https://localhost", "https://127.0.0.1", "https://dev.local", "https://stories.test", "https://stories.invalid", "https://user:password@stories.example.org", "https://stories.example.org/path", "https://stories.example.org?x=1", "https://stories.example.org/#fragment", "https://stories.example.org:3000"]){
    withSite(value, () => {
      assert.equal(getPublicSiteUrl(), null);
      assert.equal(canonicalUrl("/books"), undefined);
      assert.equal(siteStructuredData(), null);
      assert.equal(rootMetadata().metadataBase, undefined);
      assert.deepEqual(rootMetadata().robots, { index: false, follow: true });
      assert.deepEqual(robots(), { rules: { userAgent: "*", disallow: "/" } });
      const metadata = pageMetadata("/books", "Cerita", "Deskripsi");
      assert.equal(metadata.alternates, undefined);
      assert.equal(metadata.openGraph, undefined);
      assert.deepEqual(metadata.robots, { index: false, follow: true });
    });
  }
  withSite(`${origin}/`, () => {
    assert.equal(getPublicSiteUrl()?.origin, origin);
    assert.equal(canonicalUrl("/books?page=2"), `${origin}/books?page=2`);
    assert.equal(canonicalUrl("//other.example.org"), undefined);
    assert.equal(canonicalUrl("/\\other.example.org"), undefined);
    process.env.SITE_INDEXING = "off";
    assert.equal(getPublicSiteUrl(), null);
  });
});

test("public metadata has route-specific titles, descriptions, canonical and complete social cards without inherited home URLs", () => {
  withSite(origin, () => {
    const paths = ["/", "/books", "/characters", "/about", "/characters/nana"];
    const pages = Object.values(publicPageMetadata).map((page, i) => pageMetadata(paths[i], page.title, page.description));
    assert.equal(new Set(pages.map(page => JSON.stringify(page.title))).size, 5);
    assert.equal(new Set(pages.map(page => page.description)).size, 5);
    for (let i = 0; i < pages.length; i++) {
      assert.equal(pages[i].alternates?.canonical, `${origin}${paths[i]}`);
      assert.equal(pages[i].openGraph?.url, `${origin}${paths[i]}`);
      assert.equal(pages[i].openGraph?.siteName, "Pikso");
      assert.equal(pages[i].openGraph?.locale, "id_ID");
      assert.deepEqual(pages[i].robots, { index: true, follow: true });
      assert.equal((pages[i].twitter as { card: string }).card, "summary_large_image");
    }
    const detail = pageMetadata("/books/new-story", "New Story", "Actual description", "/api/books/new-story/cover");
    assert.equal(detail.alternates?.canonical, `${origin}/books/new-story`);
    assert.equal((detail.openGraph?.images as { url: string }[])[0].url, `${origin}/api/books/new-story/cover`);
    assert.equal(rootMetadata().alternates, undefined, "root must not give admin/reader a homepage canonical");
    const data = siteStructuredData()!;
    assert.doesNotMatch(data, /</);
    const schema = JSON.parse(data);
    assert.deepEqual(schema["@graph"].map((entry: Record<string, string>) => entry["@type"]), ["Organization", "WebSite"]);
    assert.equal(schema["@graph"][0].name, "Pikso");
    assert.equal(schema["@graph"][0].logo, `${origin}/icon.png`);
    assert.equal(schema["@graph"][1].name, "Pikso");
    assert.equal(schema["@graph"][1].alternateName, "Pikso Studio");
    assert.equal(schema["@graph"][1].inLanguage, "id-ID");
    assert.equal(schema["@graph"][1].publisher["@id"], schema["@graph"][0]["@id"]);
    const rules = robots();
    assert.equal(rules.sitemap, `${origin}/sitemap.xml`);
    assert.deepEqual(rules.rules, { userAgent: "*", allow: ["/", "/api/books/*/cover"], disallow: ["/admin", "/api/"] });
  });
});

function loadPageMetadata(file: string, modules: Record<string, unknown>) {
  const compiled = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports: { generateMetadata?: (props: unknown) => Promise<ReturnType<typeof pageMetadata>> } = {};
  new Function("require", "exports", compiled)((name: string) => modules[name] ?? {}, exports);
  return exports.generateMetadata!;
}

test("catalog canonical preserves pagination and story metadata uses published lookup, actual copy and safe missing-book robots", async () => {
  const previous = process.env.SITE_URL;
  const indexing = process.env.SITE_INDEXING;
  process.env.SITE_URL = origin; delete process.env.SITE_INDEXING;
  try {
    const seo = await import("../src/lib/seo");
    const catalogModules = { "react": { cache: (fn: unknown) => fn }, "@/lib/seo": seo, "@/lib/validation": await import("../src/lib/validation"), "@/lib/books": { listBooks: async (page: number) => ({ current: Math.min(page, 2) }) } };
    const catalog = loadPageMetadata("src/app/books/page.tsx", catalogModules);
    for (const page of [undefined, "1", "-3", "banana"]) {
      const metadata = await catalog({ searchParams: Promise.resolve({ page }) });
      assert.equal(metadata.alternates?.canonical, `${origin}/books`);
    }
    const pageTwo = await catalog({ searchParams: Promise.resolve({ page: "2" }) });
    assert.equal(pageTwo.alternates?.canonical, `${origin}/books?page=2`);
    assert.equal(pageTwo.openGraph?.url, `${origin}/books?page=2`);
    assert.equal((await catalog({ searchParams: Promise.resolve({ page: "999" }) })).alternates?.canonical, `${origin}/books?page=2`, "out-of-range pages canonicalize to the actual last page");
    const unavailable = loadPageMetadata("src/app/books/page.tsx", { ...catalogModules, "@/lib/books": { listBooks: async () => { throw new Error("unavailable"); } } });
    assert.deepEqual((await unavailable({ searchParams: Promise.resolve({}) })).robots, { index: false, follow: true });
    process.env.SITE_INDEXING = "off";
    let disabledQueries = 0;
    const disabled = loadPageMetadata("src/app/books/page.tsx", { ...catalogModules, "@/lib/books": { listBooks: async () => { disabledQueries++; throw new Error("must not query"); } } });
    assert.deepEqual((await disabled({ searchParams: Promise.resolve({}) })).robots, { index: false, follow: true });
    assert.equal(disabledQueries, 0);
    delete process.env.SITE_INDEXING;
    let requested = "";
    const detail = loadPageMetadata("src/app/books/[slug]/page.tsx", { "@/lib/seo": seo, "@/lib/books": { getPublicBook: async (slug: string) => { requested = slug; return slug === "published" ? { slug, title: "Buku Baru", description: "" } : null; } } });
    const metadata = await detail({ params: Promise.resolve({ slug: "published" }) });
    assert.equal(requested, "published");
    assert.equal(metadata.alternates?.canonical, `${origin}/books/published`);
    assert.match(metadata.description!, /Pikso Studio/);
    const missing = await detail({ params: Promise.resolve({ slug: "draft" }) });
    assert.deepEqual(missing.robots, { index: false, follow: false });
  } finally {
    if (previous === undefined) delete process.env.SITE_URL; else process.env.SITE_URL = previous;
    if (indexing === undefined) delete process.env.SITE_INDEXING; else process.env.SITE_INDEXING = indexing;
  }
});

test("sitemap includes all published stories beyond page one, excludes drafts/private paths, and never hides database errors", async () => {
  const previous = process.env.SITE_URL;
  const indexing = process.env.SITE_INDEXING;
  const db = new PGlite();
  const pool = new Pool({ connectionString: "postgresql://test:test@127.0.0.1:1/test" });
  (globalThis as unknown as { nanaPool: Pool }).nanaPool = pool;
  let queries = 0;
  mock.method(pool, "query", async (sql: string, values: unknown[] = []) => {
    queries++;
    const result = await db.query(sql, [...values]); return { ...result, rowCount: result.rows.length };
  });
  try {
    delete process.env.SITE_URL; delete process.env.SITE_INDEXING;
    assert.deepEqual(await sitemap(), []); assert.equal(queries, 0);
    process.env.SITE_URL = origin;
    await db.exec(await readFile(new URL("../db/001-initial.sql", import.meta.url), "utf8"));
    for (let i = 0; i < 29; i++) await db.query("INSERT INTO books(slug,title,status,pdf_path,cover_path,pdf_pages,updated_at) VALUES($1,'Story',$2,'private.pdf','private.webp',1,'2026-10-31')", [`story-${i}`, i < 27 ? "published" : "draft"]);
    const result = await sitemap();
    assert.equal(result.length, 32);
    assert.equal(result.filter(item => item.url.includes("/books/story-")).length, 27);
    assert.ok(result.every(item => item.url.startsWith(origin)));
    assert.ok(result.every(item => !/story-2[78]$|\/read|\/admin|\/api|private\./.test(item.url)));
    assert.ok(result.filter(item => item.lastModified).every(item => new Date(item.lastModified!).toISOString() === "2026-10-31T00:00:00.000Z"));
    process.env.SITE_INDEXING = "off";
    assert.deepEqual(await sitemap(), []);
    delete process.env.SITE_INDEXING;
    mock.method(pool, "query", async () => { throw new Error("test database unavailable"); });
    await assert.rejects(sitemap(), /test database unavailable/);
  } finally {
    mock.restoreAll(); delete (globalThis as unknown as { nanaPool?: Pool }).nanaPool;
    await pool.end(); await db.close();
    if (previous === undefined) delete process.env.SITE_URL; else process.env.SITE_URL = previous;
    if (indexing === undefined) delete process.env.SITE_INDEXING; else process.env.SITE_INDEXING = indexing;
  }
});

test("public SEO uses runtime metadata while admin and reader stay noindex; original layout and navigation are preserved", () => {
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  assert.match(layout, /export const dynamic = "force-dynamic"/);
  assert.match(layout, /generateMetadata\(\)/);
  assert.match(layout, /<html lang="id"><body><TooltipProvider>/);
  for (const file of ["src/app/robots.ts", "src/app/sitemap.ts"]) assert.match(readFileSync(file, "utf8"), /export const dynamic = "force-dynamic"/);
  for (const file of ["src/app/admin/(workspace)/layout.tsx", "src/app/admin/login/page.tsx", "src/app/books/[slug]/read/page.tsx"]) assert.match(readFileSync(file, "utf8"), /index\s*:\s*false/);
  assert.match(readFileSync("src/app/page.tsx", "utf8"), /application\/ld\+json/);
  assert.match(readFileSync(".env.example", "utf8"), /SITE_URL=/);
  assert.match(readFileSync(".env.example", "utf8"), /SITE_INDEXING=off/);
  assert.match(readFileSync("docs/coolify-docker.md", "utf8"), /saat runtime/);
  assert.match(readFileSync("docs/seo.md", "utf8"), /Google Search Console/);
});

test("generated icon assets and social card have real valid pixel dimensions", async () => {
  const icon = await sharp("src/app/icon.png").metadata();
  assert.equal(icon.width, 1254); assert.equal(icon.height, 1254); assert.equal(icon.format, "png");
  const apple = await sharp("src/app/apple-icon.png").metadata();
  assert.equal(apple.width, 180); assert.equal(apple.height, 180);
  const ico = readFileSync("src/app/favicon.ico");
  assert.equal(ico.readUInt16LE(0), 0); assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 1); assert.equal(ico[6], 48); assert.equal(ico[7], 48);
  const social = await sharp("public/assets/brand/pikso-social.png").metadata();
  assert.equal(social.width, 1200); assert.equal(social.height, 630); assert.equal(social.format, "png");
});
