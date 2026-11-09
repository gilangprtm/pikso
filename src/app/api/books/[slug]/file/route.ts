import { getPublicBook } from "@/lib/books";
import { serveFile } from "@/lib/serve-file";
import { canReadBook } from "@/lib/book-access";
export const runtime = "nodejs";
async function handleFile(request: Request, context: { params: Promise<{ slug: string }> }) {
  const book = await getPublicBook((await context.params).slug);
  if (!book) return new Response("Buku tidak ditemukan.", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  const locked=book.access_locked;
  const download = new URL(request.url).searchParams.get("download") === "1";
  if (!download && !await canReadBook(book,request.headers)) return new Response("Kode akses diperlukan.", { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const response=await serveFile(request, "books", book.pdf_path, { revalidate: !locked, ...(download ? { downloadName: `${book.title}.pdf` } : {}) });
  if(locked){response.headers.set("Cache-Control","private, no-store");response.headers.set("X-Pikso-Pdf-Cache","memory-only");}
  return response;
}
export const GET = handleFile;
export const HEAD = handleFile;
