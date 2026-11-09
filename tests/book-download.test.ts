import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";

const localRequire = createRequire(import.meta.url);

function loadServeFile() {
  const source = readFileSync("src/lib/serve-file.ts", "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports: { serveFile?: (request: Request, kind: "books" | "covers", filename: string, options?: { revalidate?: boolean; downloadName?: string }) => Promise<Response> } = {};
  new Function("require", "exports", js)((id: string) => id === "@/lib/storage" ? { absoluteStoragePath: (_kind: string, filename: string) => path.join((globalThis as unknown as { __downloadDir: string }).__downloadDir, filename) } : localRequire(id), exports);
  return exports.serveFile!;
}

test("book file endpoint uses the existing story-access gate and opts into a named PDF download", async () => {
  let allowed = false;
  const optionsSeen: unknown[] = [];
  const source = readFileSync("src/app/api/books/[slug]/file/route.ts", "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports: { GET?: (request: Request, context: { params: Promise<{ slug: string }> }) => Promise<Response>; HEAD?: (request: Request, context: { params: Promise<{ slug: string }> }) => Promise<Response> } = {};
  const modules: Record<string, unknown> = {
    "@/lib/books": { getPublicBook: async (slug: string) => slug === "story" ? { slug, title: "Nana dan Kerajaan di Atas Awan", pdf_path: "story.pdf", access_locked: true } : null },
    "@/lib/book-access": { canReadBook: async () => allowed },
    "@/lib/serve-file": { serveFile: async (_request: Request, kind: string, filename: string, options: unknown) => { optionsSeen.push({ kind, filename, options }); return new Response("pdf", { headers: { "Content-Disposition": `attachment; filename="${(options as { downloadName?: string })?.downloadName ?? ""}"` } }); } },
  };
  new Function("require", "exports", js)((id: string) => modules[id], exports);
  const context = { params: Promise.resolve({ slug: "story" }) };
  const downloadRequest = new Request("http://localhost/api/books/story/file?download=1");
  const downloadResponse = await exports.GET!(downloadRequest, context);
  assert.equal(downloadResponse.status, 200, "download URL is public even for a locked story");
  assert.equal(downloadResponse.headers.get("content-disposition"), 'attachment; filename="Nana dan Kerajaan di Atas Awan.pdf"');
  assert.deepEqual(optionsSeen, [{ kind: "books", filename: "story.pdf", options: { revalidate: false, downloadName: "Nana dan Kerajaan di Atas Awan.pdf" } }]);
  optionsSeen.length = 0;
  const normalRequest = new Request("http://localhost/api/books/story/file");
  assert.equal((await exports.GET!(normalRequest, context)).status, 401);
  assert.equal((await exports.HEAD!(normalRequest, context)).status, 401);
  assert.equal(optionsSeen.length, 0, "unauthorized requests must not serve the PDF");
  allowed = true;
  assert.equal((await exports.GET!(normalRequest, context)).status, 200);
  assert.equal((await exports.HEAD!(normalRequest, context)).status, 200);
  assert.deepEqual(optionsSeen, [
    { kind: "books", filename: "story.pdf", options: { revalidate: false } },
    { kind: "books", filename: "story.pdf", options: { revalidate: false } },
  ]);
});

test("attachment response provides a safe UTF-8 PDF filename without changing range support", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pikso-download-"));
  (globalThis as unknown as { __downloadDir: string }).__downloadDir = root;
  await writeFile(path.join(root, "story.pdf"), Buffer.from("%PDF-test-content"));
  const serveFile = loadServeFile();
  try {
    const response = await serveFile(new Request("http://localhost/api/books/story/file?download=1", { headers: { range: "bytes=0-3" } }), "books", "story.pdf", { revalidate: true, downloadName: "Nana & Kerajaan Áwan.pdf\r\nX-Evil: yes" });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get("content-range"), "bytes 0-3/17");
    const disposition = response.headers.get("content-disposition")!;
    assert.equal(disposition, "attachment; filename=\"Nana & Kerajaan Awan.pdf X-Evil: yes\"; filename*=UTF-8''Nana%20%26%20Kerajaan%20%C3%81wan.pdf%20X-Evil%3A%20yes");
    assert.equal(disposition.includes(String.fromCharCode(13)), false);
    assert.equal(disposition.includes(String.fromCharCode(10)), false);
    assert.equal(await response.text(), "%PDF");
  } finally {
    delete (globalThis as unknown as { __downloadDir?: string }).__downloadDir;
    await rm(root, { recursive: true, force: true });
  }
});
