import { getDb } from "@/lib/db";
import { normalizeAdminBookOptions, type AdminBookListOptions } from "@/lib/admin-books-query";
// The legacy column remains for recovery only; all current reads use the relation.
const bookSelection = `books.id, books.slug, books.title, books.description, books.author, books.status, books.pdf_path, books.cover_path, books.pdf_pages, books.sales_link, books.created_at, books.updated_at, (books.access_code_hash IS NOT NULL) AS access_locked, COALESCE((SELECT string_agg(c.name, ', ' ORDER BY c.name_key, c.id) FROM tr_book_category bc JOIN m_book_category c ON c.id = bc.book_category_id WHERE bc.book_id = books.id), '') AS category`;

export type Book = {
  id: string; slug: string; title: string; description: string; author: string;
  category: string; status: "draft" | "published"; pdf_path: string; cover_path: string;
  pdf_pages: number; sales_link: string; created_at: Date; updated_at: Date; access_locked: boolean;
};
export const PAGE_SIZE = 12;
export async function listBooks(page: number, admin = false, options: AdminBookListOptions = {}) {
  const db = getDb();
  const settings = normalizeAdminBookOptions(options);
  const pageSize = admin ? settings.pageSize : PAGE_SIZE;
  const conditions: string[] = admin ? [] : ["books.status = 'published'"];
  const values: (string | number)[] = [];
  if (admin && settings.status !== "all") {
    values.push(settings.status);
    conditions.push(`books.status = $${values.length}`);
  }
  if (admin && settings.search) {
    // Treat SQL wildcard characters as literal search text.
    values.push(`%${settings.search.replace(/[\\%_]/g, "\\$&")}%`);
    conditions.push(`(books.title ILIKE $${values.length} OR books.author ILIKE $${values.length} OR EXISTS (SELECT 1 FROM tr_book_category bc JOIN m_book_category c ON c.id = bc.book_category_id WHERE bc.book_id = books.id AND c.name ILIKE $${values.length}))`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const count = await db.query<{ count: string }>(`SELECT count(*) FROM books ${where}`, values);
  const total = Number(count.rows[0].count);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Number.isSafeInteger(page) && page > 0 ? page : 1, pages);
  const sortColumns = { title: "books.title", author: "books.author", category: "category", status: "books.status", pdf_pages: "books.pdf_pages", created_at: "books.created_at" } as const;
  const order = admin ? sortColumns[settings.sort] : "books.created_at";
  const direction = admin && settings.direction === "asc" ? "ASC" : "DESC";
  values.push(pageSize, (current - 1) * pageSize);
  const result = await db.query<Book>(`SELECT ${bookSelection} FROM books ${where} ORDER BY ${order} ${direction}, books.id ASC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
  return { books: result.rows, total, pages, current, pageSize };
}
export async function getPublicBook(slug: string) {
  const result = await getDb().query<Book>(`SELECT ${bookSelection} FROM books WHERE slug = $1 AND status = 'published'`, [slug]);
  return result.rows[0] ?? null;
}
// Sitemap needs every published identity, not a paginated catalog or private paths.
export async function listPublishedBookUrls() {
  return (await getDb().query<Pick<Book, "slug" | "updated_at">>(
    "SELECT slug, updated_at FROM books WHERE status = 'published' ORDER BY slug",
  )).rows;
}
export async function getAdminBook(id: string) {
  const result = await getDb().query<Book>(`SELECT ${bookSelection} FROM books WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}
