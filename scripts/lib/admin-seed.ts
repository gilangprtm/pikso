import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { PoolClient } from "pg";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "../../src/lib/password-policy.js";

const adminInput = z.object({
  email: z.email().transform(value => value.toLowerCase()),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
});
export function parseAdminEnvironment(env: Record<string, string | undefined>) {
  const parsed = adminInput.safeParse({
    email: env.ADMIN_EMAIL?.trim(),
    name: env.ADMIN_NAME ?? "Admin Nana",
    password: env.ADMIN_PASSWORD,
  });
  // Do not log Zod's original input: it can contain passwords.
  if (!parsed.success) throw new Error(`Isi ADMIN_EMAIL yang valid, ADMIN_NAME (1–100 karakter), dan ADMIN_PASSWORD (${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} karakter).`);
  return parsed.data;
}
type AdminInput = z.infer<typeof adminInput>;
export async function seedAdmin(client: Pick<PoolClient, "query">, input: AdminInput, hash: (password: string) => Promise<string>) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock(817324002)");
    const existing = await client.query<{ id: string; role: string; has_credential: boolean }>(
      `SELECT u.id,u.role,EXISTS(SELECT 1 FROM account a WHERE a."userId"=u.id AND a."providerId"='credential' AND a.password IS NOT NULL) AS has_credential FROM "user" u WHERE lower(u.email)=$1`,
      [input.email],
    );
    if (existing.rows.length) {
      if (existing.rows.length !== 1 || existing.rows[0].role !== "admin" || !existing.rows[0].has_credential) {
        throw new Error("Email sudah digunakan oleh akun yang tidak cocok. Seed tidak mengubah akun atau password yang ada.");
      }
      await client.query("COMMIT");
      return "existing" as const;
    }
    const passwordHash = await hash(input.password);
    const id = randomUUID();
    await client.query('INSERT INTO "user"(id,name,email,"emailVerified",role) VALUES($1,$2,$3,true,\'admin\')', [id,input.name,input.email]);
    await client.query('INSERT INTO account(id,"accountId","providerId","userId",password) VALUES($1,$2,\'credential\',$2,$3)', [randomUUID(),id,passwordHash]);
    await client.query("COMMIT");
    return "created" as const;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
