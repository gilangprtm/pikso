import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { MAX_PDF_BYTES } from "@/lib/validation";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function authorizeAdmin(request: Request) {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000").origin;
  if (!["GET", "HEAD"].includes(request.method) && origin !== expectedOrigin) throw new HttpError(403, "Origin tidak diizinkan.");
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user || session.user.role !== "admin") throw new HttpError(401, "Silakan login sebagai admin.");
  return session;
}
export async function boundedBytes(request: Request, maxBytes: number) {
  const sizeError = `Upload terlalu besar (maksimal total request ${maxBytes / 1024 / 1024} MiB).`;
  if (Number(request.headers.get("content-length")) > maxBytes) throw new HttpError(413, sizeError);
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Body kosong.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) { await reader.cancel(); throw new HttpError(413, sizeError); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
// Leave room for multipart boundaries and metadata in addition to the PDF.
export async function boundedFormData(request: Request, maxBytes = MAX_PDF_BYTES + 6 * 1024 * 1024) {
  const bytes = await boundedBytes(request, maxBytes);
  return new Response(bytes, { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
}
export async function boundedJson(request: Request, maxBytes = 16 * 1024): Promise<unknown> {
  const bytes = await boundedBytes(request, maxBytes);
  try { return JSON.parse(bytes.toString("utf8")); }
  catch { throw new HttpError(400, "JSON tidak valid."); }
}
export function apiError(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("API request failed:", error instanceof Error ? error.name : "Unknown error");
  return NextResponse.json({ error: "Proses gagal. Periksa data atau coba lagi." }, { status: 400 });
}
