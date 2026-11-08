import { open, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { absoluteStoragePath } from "@/lib/storage";

type Options = { revalidate?: boolean; downloadName?: string };
type ByteRange = { start: number; end: number };

function attachmentDisposition(filename: string) {
  const safeName = Array.from(filename, character => {
    const code = character.codePointAt(0)!;
    return code === 47 || code === 92 ? "_" : code < 32 || code === 127 ? " " : character;
  }).join("").trim().split(" ").filter(Boolean).join(" ") || "book.pdf";
  const fallback = Array.from(safeName.normalize("NFKD"), character => {
    const code = character.codePointAt(0)!;
    return code >= 0x300 && code <= 0x36f ? "" : code >= 0x20 && code <= 0x7e && code !== 34 ? character : "_";
  }).join("");
  const encoded = encodeURIComponent(safeName).replaceAll("'", "%27").replaceAll("(", "%28").replaceAll(")", "%29").replaceAll("*", "%2A");
  return `attachment; filename=\"${fallback}\"; filename*=UTF-8''${encoded}`;
}


function parseRange(header: string | null, size: number): ByteRange | null | "invalid" {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return "invalid";
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0 || size === 0) return "invalid";
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start < 0 || start >= size || requestedEnd < start) return "invalid";
  return { start, end: Math.min(requestedEnd, size - 1) };
}

export async function serveFile(request: Request, kind: "books" | "covers", filename: string, options: Options = {}) {
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    const filePath = absoluteStoragePath(kind, filename);
    const metadata = await stat(filePath, { bigint: true });
    if (!metadata.isFile()) throw new Error("Not a file");
    const etag = `"${createHash("sha256").update(`${filename}:${metadata.size}:${metadata.mtimeNs}`).digest("hex")}"`;
    const modified = new Date(Number(metadata.mtimeMs));
    const lastModified = modified.toUTCString();
    const headers = new Headers({
      "Content-Type": kind === "books" ? "application/pdf" : "image/webp",
      "Content-Disposition": options.downloadName ? attachmentDisposition(options.downloadName) : "inline",
      "Cache-Control": options.revalidate ? "private, max-age=0, must-revalidate" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
      "Content-Length": String(metadata.size),
      ETag: etag,
      "Last-Modified": lastModified,
    });
    const method = request.method.toUpperCase();
    if (method !== "GET" && method !== "HEAD") return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
    if (options.revalidate) {
      const condition = request.headers.get("if-none-match");
      const candidates = condition?.split(",").map(value => value.trim().replace(/^W\//, ""));
      const since = request.headers.get("if-modified-since");
      const unchanged = condition !== null
        ? candidates?.includes(etag) || candidates?.includes("*")
        : since !== null && Number.isFinite(Date.parse(since)) && Math.floor(modified.getTime() / 1000) <= Math.floor(Date.parse(since) / 1000);
      if (unchanged) return new Response(null, { status: 304, headers });
    }
    let rangeHeader = method === "GET" ? request.headers.get("range") : null;
    const ifRange = request.headers.get("if-range");
    if (ifRange && ifRange !== etag && ifRange !== lastModified) rangeHeader = null;
    const range = parseRange(rangeHeader, Number(metadata.size));
    if (range === "invalid") return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${metadata.size}`, "Accept-Ranges": "bytes", "Cache-Control": "private, no-store", ETag: etag } });
    const start = range?.start ?? 0;
    const end = range?.end ?? Number(metadata.size) - 1;
    const length = range ? end - start + 1 : Number(metadata.size);
    headers.set("Content-Length", String(length));
    if (range) headers.set("Content-Range", `bytes ${start}-${end}/${metadata.size}`);
    if (method === "HEAD" || length === 0) return new Response(null, { status: range ? 206 : 200, headers });

    handle = await open(filePath, "r");
    const file = handle;
    handle = undefined;
    let position = start;
    let closed = false;
    const close = async () => {
      if (closed) return;
      closed = true;
      await file.close();
    };
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, end - position + 1));
          const { bytesRead } = await file.read(buffer, 0, buffer.length, position);
          if (closed) return;
          if (bytesRead === 0) throw new Error("Unexpected end of file");
          position += bytesRead;
          controller.enqueue(buffer.subarray(0, bytesRead));
          if (position > end) { await close(); controller.close(); }
        } catch (error) {
          await close().catch(() => {});
          controller.error(error);
        }
      },
      cancel: close,
    }, { highWaterMark: 0 });
    return new Response(body, { status: range ? 206 : 200, headers });
  } catch {
    await handle?.close().catch(() => {});
    return new NextResponse("File tidak ditemukan.", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
}
