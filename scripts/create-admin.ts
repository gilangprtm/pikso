import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import { parseAdminEnvironment, seedAdmin } from "./lib/admin-seed.js";

async function main() {
  if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL wajib diisi.");
  if(!process.env.BETTER_AUTH_SECRET||process.env.BETTER_AUTH_SECRET.length<32||process.env.BETTER_AUTH_SECRET.includes("REPLACE_"))throw new Error("Isi BETTER_AUTH_SECRET dengan secret acak minimal 32 karakter.");
  // Explicit temporary bootstrap credentials requested by the Owner.
  // Do not use this known password on a publicly accessible production site.
  const input=parseAdminEnvironment({
    ADMIN_EMAIL:"admin@pikso.test",
    ADMIN_NAME:"Admin Pikso",
    ADMIN_PASSWORD:"password",
  });
  const db=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:5000});
  try {
    const client=await db.connect();
    try {
      const status=await seedAdmin(client,input,hashPassword);
      console.log(status==="created" ? "Admin berhasil dibuat. Pendaftaran publik tetap dinonaktifkan." : "Akun admin dengan email tersebut sudah ada; tidak ada perubahan pada akun atau password.");
    } finally { client.release(); }
  } finally { await db.end(); }
}
main().catch(error=>{
  const message=error instanceof Error && (error.message.startsWith("Isi ")||error.message.startsWith("Email ")||error.message.startsWith("DATABASE_URL")) ? error.message : "Seed gagal. Periksa koneksi database dan jalankan migration terlebih dahulu. Tidak ada kredensial yang dicetak.";
  console.error(message);process.exitCode=1;
});
