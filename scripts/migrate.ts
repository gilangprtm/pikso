import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

async function main() {
  if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL wajib diisi.");
  const db=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:5000});
  try {
    const client=await db.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(817324001)");
      await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
      const messages: string[] = [];
      for (const id of ["001-initial", "002-book-categories", "003-book-access-codes"]) {
        const {rowCount}=await client.query("SELECT id FROM schema_migrations WHERE id=$1",[id]);
        if(!rowCount){
          await client.query(await readFile(path.join(process.cwd(),"db",`${id}.sql`),"utf8"));
          await client.query("INSERT INTO schema_migrations(id) VALUES($1)",[id]);
        }
        messages.push(rowCount ? `${id} already applied; no changes.` : `Applied ${id}`);
      }
      await client.query("COMMIT");
      messages.forEach(message => console.log(message));
    } catch(error) {await client.query("ROLLBACK");throw error;}
    finally{client.release();}
  } finally {await db.end();}
}
main().catch(()=>{console.error("Migration gagal. Periksa konfigurasi/koneksi database; tidak ada kredensial yang dicetak.");process.exitCode=1;});
