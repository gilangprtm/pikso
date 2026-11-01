import { test } from "node:test";
import assert from "node:assert/strict";
import { uploadBook, type BookUploadProgress } from "../src/lib/book-upload-request";

class MockUploadRequest {
  static current: MockUploadRequest;
  upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null; onload: (() => void) | null } = { onprogress: null, onload: null };
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  onload: (() => void) | null = null;
  status = 200;
  responseText = '{"ok":true}';
  timeout = 0;
  opened: [string, string] | null = null;
  sent: FormData | null = null;
  constructor() { MockUploadRequest.current = this; }
  open(method: string, url: string) { this.opened = [method, url]; }
  send(body: FormData) { this.sent = body; }
}

test("book upload reports transfer progress and processing, and never retries uncertain outcomes", async () => {
  const original = globalThis.XMLHttpRequest;
  Object.assign(globalThis, { XMLHttpRequest: MockUploadRequest });
  try {
    const oversized = new FormData();
    oversized.set("pdf", new File([new Uint8Array(50 * 1024 * 1024 + 1)], "oversized.pdf", { type: "application/pdf" }));
    const before = MockUploadRequest.current;
    await assert.rejects(uploadBook(oversized, () => assert.fail("must not start upload")), /50\.00 MiB.*50 MiB/);
    assert.equal(MockUploadRequest.current, before, "oversized files must not create or send an HTTP request");

    const form = new FormData();
    form.set("title", "Uji");
    form.set("pdf", new File([new Uint8Array(50 * 1024 * 1024)], "boundary.pdf", { type: "application/pdf" }));
    const progress: BookUploadProgress[] = [];
    const result = uploadBook(form, value => progress.push(value));
    const request = MockUploadRequest.current;
    assert.deepEqual(request.opened, ["POST", "/api/admin/books"]);
    assert.equal(request.timeout, 180_000);
    assert.equal(request.sent, form);
    request.upload.onprogress?.({ lengthComputable: true, loaded: 25, total: 100 });
    assert.deepEqual(progress.at(-1), { phase: "uploading", percent: 25 });
    request.upload.onload?.();
    assert.deepEqual(progress.at(-1), { phase: "processing" });
    request.onload?.();
    await result;
    assert.equal(request.sent, form, "the write request is sent once; no retry is issued");

    const uncertainResult = uploadBook(form, () => {});
    MockUploadRequest.current.onerror?.();
    await assert.rejects(uncertainResult, /Respons penyimpanan belum dapat dipastikan/);
    assert.equal(MockUploadRequest.current.sent, form);

    const timeoutResult = uploadBook(form, () => {});
    MockUploadRequest.current.ontimeout?.();
    await assert.rejects(timeoutResult, /Waktu tunggu habis.*Periksa daftar buku/);

    const malformedResult = uploadBook(form, () => {});
    MockUploadRequest.current.responseText = "upstream response lost";
    MockUploadRequest.current.onload?.();
    await assert.rejects(malformedResult, /belum dapat dipastikan/);

    for (const status of [413, 502, 504, 524]) {
      const proxyResult = uploadBook(form, () => {});
      MockUploadRequest.current.status = status;
      MockUploadRequest.current.responseText = `<html>Proxy error ${status}</html>`;
      MockUploadRequest.current.onload?.();
      await assert.rejects(proxyResult, new RegExp(`HTTP ${status}`));
    }

    const rejectedResult = uploadBook(form, () => {});
    MockUploadRequest.current.status = 400;
    MockUploadRequest.current.responseText = '{"error":"Data tidak valid."}';
    MockUploadRequest.current.onload?.();
    await assert.rejects(rejectedResult, /Data tidak valid/);
  } finally {
    Object.assign(globalThis, { XMLHttpRequest: original });
  }
});
