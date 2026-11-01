import { test } from "node:test";
import assert from "node:assert/strict";
import { boundedFormData, HttpError } from "../src/lib/api";
import { MAX_PDF_BYTES, UploadSizeError, validateUploadSize } from "../src/lib/validation";

test("PDF size limit accepts 50 MiB and the reference size but rejects an extra byte", () => {
  assert.equal(MAX_PDF_BYTES, 50 * 1024 * 1024);
  assert.doesNotThrow(() => validateUploadSize(32_647_158, MAX_PDF_BYTES));
  assert.doesNotThrow(() => validateUploadSize(MAX_PDF_BYTES, MAX_PDF_BYTES));
  assert.throws(() => validateUploadSize(MAX_PDF_BYTES + 1, MAX_PDF_BYTES), UploadSizeError);
  assert.throws(() => validateUploadSize(0, MAX_PDF_BYTES), UploadSizeError);
});

test("multipart reader enforces total request limit via header and streamed bytes", async () => {
  const overLimit = (error: unknown) => error instanceof HttpError && error.status === 413;
  await assert.rejects(boundedFormData(new Request("http://localhost/upload", {
    method: "POST", headers: { "content-length": String(56 * 1024 * 1024 + 1) }, body: "x",
  })), overLimit);
  // A small override exercises the same bounded stream path without allocating 56 MiB.
  await assert.rejects(boundedFormData(new Request("http://localhost/upload", {
    method: "POST", body: new Uint8Array(17),
  }), 16), overLimit);
});
