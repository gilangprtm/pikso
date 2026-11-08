import { getDb } from "@/lib/db";
import { saveBookCategories } from "@/lib/book-categories";
import { bookInput } from "@/lib/validation";
import type { z } from "zod";
import { hashAccessCode } from "@/lib/book-access";

type BookInput = z.input<typeof bookInput>;
type Upload = { pdf: string; cover: string; pages: number };

// Book metadata, master categories and selections commit or roll back together.
export async function writeBook(id: string, input: BookInput, upload?: Upload) {
  const changeAccess = true;
  const accessHash = input.accessCode ? hashAccessCode(input.accessCode) : null;
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    if (upload) {
      await client.query(
        "INSERT INTO books(id,slug,title,description,author,status,pdf_path,cover_path,pdf_pages,access_code_hash,sales_link) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
        [id,input.slug,input.title,input.description,input.author,input.status,upload.pdf,upload.cover,upload.pages,accessHash,input.salesLink ?? ""],
      );
    } else {
      const result = await client.query(
        "UPDATE books SET title=$1,slug=$2,description=$3,author=$4,status=$5,sales_link=$9,updated_at=now(),access_code_hash=CASE WHEN $7 THEN $8 ELSE access_code_hash END,access_version=CASE WHEN $7 THEN gen_random_uuid() ELSE access_version END WHERE id=$6 RETURNING id",
        [input.title,input.slug,input.description,input.author,input.status,id,changeAccess,accessHash,input.salesLink ?? ""],
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
