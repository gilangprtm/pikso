import { getDb } from "@/lib/db";
import { saveBookCategories } from "@/lib/book-categories";
import { bookInput } from "@/lib/validation";
import type { z } from "zod";

type BookInput = z.infer<typeof bookInput>;
type Upload = { pdf: string; cover: string; pages: number };

// Book metadata, master categories and selections commit or roll back together.
export async function writeBook(id: string, input: BookInput, upload?: Upload) {
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    if (upload) {
      await client.query(
        "INSERT INTO books(id,slug,title,description,author,status,pdf_path,cover_path,pdf_pages) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [id,input.slug,input.title,input.description,input.author,input.status,upload.pdf,upload.cover,upload.pages],
      );
    } else {
      const result = await client.query(
        "UPDATE books SET title=$1,slug=$2,description=$3,author=$4,status=$5,updated_at=now() WHERE id=$6 RETURNING id",
        [input.title,input.slug,input.description,input.author,input.status,id],
      );
      if (!result.rowCount) { await client.query("ROLLBACK"); return false; }
    }
    await saveBookCategories(client, id, input.categories);
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
