import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { getDb } from "@/lib/db";

type AccessBook = { id: string; access_code_hash: string | null; access_version: string };
export const accessCookieName = (id: string) => `pikso-access-${id}`;
// Encrypted codes are recoverable only by authenticated admins. Legacy password hashes remain verifiable.
function encryptionKey() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Access encryption is not configured");
  return createHash("sha256").update("pikso-book-code:v1:").update(secret).digest();
}
export function decryptAccessCode(value: string | null): string | null {
  if (!value?.startsWith("enc:v1:")) return null;
  try {
    const data = Buffer.from(value.slice(7), "base64url");
    if (data.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), data.subarray(0,12));
    decipher.setAuthTag(data.subarray(12,28));
    return Buffer.concat([decipher.update(data.subarray(28)),decipher.final()]).toString("utf8");
  } catch { return null; }
}
export function hashAccessCode(code: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
  const encrypted = Buffer.concat([cipher.update(code,"utf8"),cipher.final()]);
  return "enc:v1:" + Buffer.concat([nonce,cipher.getAuthTag(),encrypted]).toString("base64url");
}
export async function getBookAccess(id: string): Promise<AccessBook | null> {
  const result = await getDb().query<AccessBook>("SELECT id,access_code_hash,access_version FROM books WHERE id=$1", [id]);
  return result.rows[0] ?? null;
}
function signature(book: AccessBook) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Access signing is not configured");
  return createHmac("sha256", secret).update(`pikso-story-access:v1:${book.id}:${book.access_version}`).digest("base64url");
}
export function issueAccessProof(book: AccessBook) { return `v1.${signature(book)}`; }
export function validAccessProof(book: AccessBook, proof?: string | null) {
  if (!proof || !/^v1\.[A-Za-z0-9_-]{43}$/.test(proof)) return false;
  const expected = Buffer.from(issueAccessProof(book));
  const actual = Buffer.from(proof);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export async function verifyAccessCode(book: AccessBook, code: string) {
  if (!book.access_code_hash) return false;
  if (book.access_code_hash.startsWith("enc:v1:")) return decryptAccessCode(book.access_code_hash) === code;
  return verifyPassword({ hash: book.access_code_hash, password: code });
}
export function cookieProof(headers: Headers, id: string) {
  const prefix = `${accessCookieName(id)}=`;
  return headers.get("cookie")?.split(";").map(value => value.trim()).find(value => value.startsWith(prefix))?.slice(prefix.length);
}
export async function canReadBook(book: { id: string; access_locked?: boolean }, headers: Headers) {
  if (!book.access_locked) return true;
  const access = await getBookAccess(book.id);
  return !!access && (!access.access_code_hash || validAccessProof(access, cookieProof(headers, book.id)));
}

// Bound expensive password verification on this single-host app. No IP/proof/code logging.
const attempts = new Map<string, { count: number; reset: number }>();
export function clearAccessAttempts(key:string) { attempts.delete(key); }
export function allowAccessAttempt(key: string, now = Date.now()) {
  for (const [id, item] of attempts) if (item.reset <= now) attempts.delete(id);
  let item = attempts.get(key);
  if (!item) {
    if (attempts.size >= 1000) return false;
    item = { count: 0, reset: now + 60_000 }; attempts.set(key, item);
  }
  return ++item.count <= 20;
}
