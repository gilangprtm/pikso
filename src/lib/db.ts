import { Pool } from "pg";

const globalDb = globalThis as unknown as { nanaPool?: Pool };
function databaseUrl() {
  const raw=process.env.DATABASE_URL;
  if(!raw)throw new Error("DATABASE_URL belum dikonfigurasi.");
  const parsed=new URL(raw);
  if(!["postgres:","postgresql:"].includes(parsed.protocol))throw new Error("DATABASE_URL harus memakai protokol PostgreSQL.");
  // Hosting panels may provide escaped placeholders which become corrupted in URL parsers.
  return raw;
}
export function getDb() {
  return globalDb.nanaPool ??= new Pool({ connectionString: databaseUrl(), max: 5, connectionTimeoutMillis: 5000 });
}
