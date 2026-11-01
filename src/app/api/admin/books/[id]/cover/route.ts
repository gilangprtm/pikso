import { apiError, authorizeAdmin, HttpError } from "@/lib/api";
import { getAdminBook } from "@/lib/books";
import { serveFile } from "@/lib/serve-file";
import { isUuid } from "@/lib/validation";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await authorizeAdmin(request);
    const { id } = await context.params;
    if (!isUuid(id)) throw new HttpError(404, "Buku tidak ditemukan.");
    const book = await getAdminBook(id);
    if (!book) throw new HttpError(404, "Buku tidak ditemukan.");
    return serveFile(request, "covers", book.cover_path);
  } catch (error) { return apiError(error); }
}
