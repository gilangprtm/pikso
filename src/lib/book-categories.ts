import type { PoolClient } from "pg";
import { getDb } from "@/lib/db";

export type BookCategory = { id: string; name: string };

export async function listBookCategories() {
  const result = await getDb().query<BookCategory>(
    "SELECT id, name FROM m_book_category ORDER BY name_key, id",
  );
  return result.rows;
}

export async function getBookCategories(bookId: string) {
  const result = await getDb().query<BookCategory>(
    "SELECT c.id, c.name FROM tr_book_category bc JOIN m_book_category c ON c.id = bc.book_category_id WHERE bc.book_id = $1 ORDER BY c.name_key, c.id",
    [bookId],
  );
  return result.rows;
}

// Called inside the same transaction as the book write, never independently.
export async function saveBookCategories(client: PoolClient, bookId: string, names: string[]) {
  const categories: BookCategory[] = [];
  // Stable order avoids competing saves locking the same master rows in reverse order.
  const ordered = [...new Set(names.map(value => value.trim()).filter(Boolean))]
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  for (const name of ordered) {
    const result = await client.query<BookCategory>(
      "INSERT INTO m_book_category(name) VALUES($1) ON CONFLICT (name_key) DO UPDATE SET name = m_book_category.name RETURNING id, name",
      [name],
    );
    categories.push(result.rows[0]);
  }
  await client.query("DELETE FROM tr_book_category WHERE book_id = $1", [bookId]);
  for (const category of categories) {
    await client.query(
      "INSERT INTO tr_book_category(book_id, book_category_id) VALUES($1, $2) ON CONFLICT DO NOTHING",
      [bookId, category.id],
    );
  }
  return categories;
}
