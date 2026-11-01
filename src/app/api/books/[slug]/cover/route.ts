import { getPublicBook } from "@/lib/books";
import { serveFile } from "@/lib/serve-file";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const book = await getPublicBook((await context.params).slug);
  if (!book) return new Response("Buku tidak ditemukan.", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  return serveFile(request, "covers", book.cover_path, { revalidate: true });
}
