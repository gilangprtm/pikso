import { NextResponse } from "next/server";
import { apiError, authorizeAdmin, HttpError } from "@/lib/api";
import { writeBook } from "@/lib/book-write";
import { getDb } from "@/lib/db";
import { bookInput, isUuid, safeError } from "@/lib/validation";
import { getAdminBook } from "@/lib/books";
import { removeStoredFile } from "@/lib/storage";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    await authorizeAdmin(request);
    const { id } = await context.params;
    if (!isUuid(id)) throw new HttpError(404, "Buku tidak ditemukan.");
    const data = bookInput.safeParse(await request.json());
    if (!data.success) throw new HttpError(400, safeError(data.error));
    const b = data.data;
    if (!await writeBook(id, b)) throw new HttpError(404, "Buku tidak ditemukan.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "Slug tersebut sudah digunakan." }, { status: 409 });
    return apiError(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    await authorizeAdmin(request);
    const { id } = await context.params;
    if (!isUuid(id)) throw new HttpError(404, "Buku tidak ditemukan.");
    const book = await getAdminBook(id);
    if (!book) throw new HttpError(404, "Buku tidak ditemukan.");
    await getDb().query("DELETE FROM books WHERE id=$1", [id]);
    // Database row is removed first: an interrupted cleanup cannot expose a deleted book.
    await Promise.all([removeStoredFile("books", book.pdf_path), removeStoredFile("covers", book.cover_path)]).catch(() => console.error("File cleanup pending for deleted book", id));
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
