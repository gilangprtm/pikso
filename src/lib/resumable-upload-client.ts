import { MAX_PDF_BYTES, validateUploadSize } from "./validation";
export type PdfUploadProgress = { phase: "uploading" | "ready"; percent: number };
export class UploadRequestError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}
async function jsonRequest(url: string, init: RequestInit = {}, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    let payload;
    try { payload = await response.json(); }
    catch { throw new UploadRequestError(`Respons server tidak valid (HTTP ${response.status}).`, response.status); }
    if (!response.ok) throw new UploadRequestError(typeof payload?.error === "string" ? payload.error : `Upload gagal (HTTP ${response.status}).`, response.status);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new UploadRequestError("Respons server tidak valid.");
    return payload;
  } catch (error) {
    if (signal?.aborted) throw new DOMException("Upload dibatalkan.", "AbortError");
    if (error instanceof UploadRequestError) throw error;
    throw new UploadRequestError("Koneksi upload terputus atau waktu tunggu habis. Tekan Lanjutkan upload; bagian yang tersimpan tidak diulang.");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
const endpoint = (id: string) => `/api/admin/book-uploads/${encodeURIComponent(id)}`;
export function uploadResumeKey(file: File) { return `pikso-upload:${JSON.stringify([file.name, file.size, file.lastModified])}`; }
export async function chunkChecksum(blob: Blob) {
  const bytes = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}
export async function uploadPdfInChunks(file: File, options: {
  signal: AbortSignal;
  sessionId?: string;
  onSession: (id: string) => void;
  onProgress: (value: PdfUploadProgress) => void;
}) {
  validateUploadSize(file.size, MAX_PDF_BYTES);
  if (!file.name.toLowerCase().endsWith(".pdf") || !["application/pdf", "application/octet-stream", ""].includes(file.type)) throw new Error("Pilih file PDF.");
  if (new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== "%PDF-") throw new Error("Isi file bukan PDF yang valid.");
  let id = options.sessionId;
  let status: Record<string, unknown> | undefined;
  if (id) {
    try { status = await jsonRequest(endpoint(id), {}, options.signal); }
    catch (error) {
      if (!(error instanceof UploadRequestError) || ![404, 410].includes(error.status)) throw error;
      id = undefined;
    }
  }
  if (!id) {
    const created = await jsonRequest("/api/admin/book-uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ size: file.size }) }, options.signal);
    if (typeof created.id !== "string") throw new Error("Sesi upload tidak valid.");
    id = created.id;
    options.onSession(id);
    status = { ...created, confirmedChunks: 0, hashes: [] };
  }
  const chunkBytes = Number(status?.chunkBytes);
  const confirmed = Number(status?.confirmedChunks);
  if (Number(status?.size) !== file.size || !Number.isSafeInteger(chunkBytes) || chunkBytes < 1 || chunkBytes > 4 * 1024 * 1024 || !Number.isSafeInteger(confirmed) || confirmed < 0 || confirmed > Math.ceil(file.size / chunkBytes)) throw new Error("Status upload tidak sesuai file.");
  if (status?.completed) {
    if (status.sourceChecksum !== await chunkChecksum(file)) throw new Error("PDF berbeda dari sesi yang sudah disimpan. Buang upload lama sebelum membuat buku baru.");
    return id;
  }
  // Same filename/size is not proof of equal contents: verify every resumed part.
  for (let index = 0; index < confirmed; index++) {
    const hash = await chunkChecksum(file.slice(index * chunkBytes, (index + 1) * chunkBytes));
    if (!Array.isArray(status?.hashes) || status.hashes[index] !== hash) throw new Error("Isi PDF berbeda dari upload sebelumnya. Batalkan upload dan pilih PDF kembali.");
  }
  options.onProgress({ phase: "uploading", percent: Math.floor(Math.min(file.size, confirmed * chunkBytes) / file.size * 100) });
  for (let index = confirmed; index < Math.ceil(file.size / chunkBytes); index++) {
    if (options.signal.aborted) throw new DOMException("Upload dibatalkan.", "AbortError");
    const part = file.slice(index * chunkBytes, (index + 1) * chunkBytes);
    const checksum = await chunkChecksum(part);
    for (let attempt = 0; ; attempt++) {
      try {
        const result = await jsonRequest(`${endpoint(id)}/chunks/${index}`, { method: "PUT", headers: { "Content-Type": "application/octet-stream", "X-Chunk-SHA256": checksum }, body: part }, options.signal);
        if (result.index !== index || result.checksum !== checksum) throw new UploadRequestError("Konfirmasi bagian upload tidak sesuai.", 422);
        break;
      } catch (error) {
        if (options.signal.aborted || !(error instanceof UploadRequestError) || ![0, 408, 429, 499, 500, 502, 503, 504, 524].includes(error.status) || attempt >= 2) throw error;
        // Only idempotent chunk PUTs retry automatically, never book creation.
        await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt));
      }
    }
    options.onProgress({ phase: "uploading", percent: Math.floor(Math.min(file.size, (index + 1) * chunkBytes) / file.size * 100) });
  }
  options.onProgress({ phase: "ready", percent: 100 });
  return id;
}
export async function cancelPdfUpload(id: string) { await jsonRequest(endpoint(id), { method: "DELETE" }); }
export async function finalizeUploadedBook(uploadId: string, metadata: unknown) {
  try {
    const result = await jsonRequest("/api/admin/books/finalize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...metadata as object, uploadId }) });
    if (result.ok !== true) throw new UploadRequestError("Konfirmasi penyimpanan tidak valid.");
    return result;
  } catch (error) {
    if (error instanceof UploadRequestError && (error.status === 0 || error.status >= 500 || error.status === 499)) throw new Error("Konfirmasi penyimpanan terputus. Tekan Simpan cerita lagi untuk memeriksa dan menyelesaikan sesi yang sama tanpa membuat buku ganda.");
    throw error;
  }
}
