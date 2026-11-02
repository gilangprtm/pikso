import { createHmac, timingSafeEqual } from "node:crypto";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { getDb } from "@/lib/db";

type AccessBook = { id: string; access_code_hash: string | null; access_version: string };
export const accessCookieName = (id: string) => `pikso-access-${id}`;
export const hashAccessCode = (code: string) => hashPassword(code);
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
  return !!book.access_code_hash && verifyPassword({ hash: book.access_code_hash, password: code });
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
