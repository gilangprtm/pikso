import { createHash, randomUUID } from "node:crypto";
import { link, mkdir, open, readFile, readdir, rename, rm, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { MAX_PDF_BYTES, validateUploadSize } from "@/lib/validation";
import { getDb } from "@/lib/db";
import { removeStoredFile } from "@/lib/storage";

export const UPLOAD_CHUNK_BYTES = 1024 * 1024;
export const UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ACTIVE_PER_OWNER = 3;
const MAX_RESERVED_BYTES = 512 * 1024 * 1024;
// Local, persistent, single-process deployment; never exposed by a static route.
const root = path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR || "./storage", "upload-sessions");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Prepared = { pdf: string; cover: string; pages: number; sourceChecksum: string };
type Session = { ownerId: string; size: number; expiresAt: number; completed?: boolean; prepared?: Prepared; metadataHash?: string };
export class UploadSessionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const runtime = globalThis as typeof globalThis & { piksoUploadLocks?: Map<string, Promise<unknown>>; piksoUploadSweep?: ReturnType<typeof setInterval> };
// Next route bundles must share the same locks, not separate module-local maps.
const locks = runtime.piksoUploadLocks ??= new Map<string, Promise<unknown>>();
// Serialize mutation/finalization and quota admission in this single Node process.
export async function withUploadLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  locks.set(key, current);
  try { return await current; }
  finally { if (locks.get(key) === current) locks.delete(key); }
}
function directory(id: string) {
  if (!uuid.test(id)) throw new UploadSessionError(400, "Sesi upload tidak valid.");
  return path.join(/* turbopackIgnore: true */ root, id);
}
function partPath(id: string, index: number) { return path.join(directory(id), `${index}.part`); }
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
async function writePrivate(filename: string, bytes: string | Uint8Array) {
  const handle = await open(/* turbopackIgnore: true */ filename, "wx", 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); }
  finally { await handle.close(); }
}
async function writeSession(id: string, session: Session) {
  const temp = path.join(directory(id), `${randomUUID()}.tmp`);
  try {
    await writePrivate(temp, JSON.stringify(session));
    await rename(temp, path.join(directory(id), "session.json"));
    const dir = await open(directory(id), "r");
    try { await dir.sync(); } finally { await dir.close(); }
  } finally { await unlink(temp).catch(() => {}); }
}
async function readRaw(id: string): Promise<Session> {
  return JSON.parse(await readFile(path.join(directory(id), "session.json"), "utf8"));
}
export async function readUploadSession(ownerId: string, id: string) {
  directory(id);
  let session: Session;
  try { session = await readRaw(id); }
  catch { throw new UploadSessionError(404, "Sesi upload tidak ditemukan atau sudah kedaluwarsa."); }
  if (session.ownerId !== ownerId) throw new UploadSessionError(404, "Sesi upload tidak ditemukan.");
  if (session.expiresAt <= Date.now()) throw new UploadSessionError(410, "Sesi upload sudah kedaluwarsa. Pilih ulang PDF.");
  return session;
}
async function removeSession(id: string, session?: Session) {
  if (session?.prepared && !session.completed) {
    // A prior COMMIT may have succeeded with a lost response. Reconcile before
    // deleting any prepared files; DB unavailability preserves them for safety.
    const result = await getDb().query("SELECT id FROM books WHERE id=$1", [id]);
    if (!result.rows[0]) await Promise.all([removeStoredFile("books", session.prepared.pdf), removeStoredFile("covers", session.prepared.cover)]);
  }
  await rm(directory(id), { recursive: true, force: true });
}
// Runs on admission and periodically while this process lives. A prepared upload
// is reconciled with the DB before cleanup; committed book files are never removed.
export async function purgeExpiredUploads(now = Date.now()) {
  await mkdir(root, { recursive: true, mode: 0o700 });
  for (const id of await readdir(root)) {
    if (!uuid.test(id) || locks.has(id)) continue;
    await withUploadLock(id, async () => {
      try {
        let session: Session | undefined;
        let expired: boolean;
        try { session = await readRaw(id); expired = session.expiresAt <= now; }
        catch { expired = (await stat(directory(id))).mtimeMs + UPLOAD_TTL_MS <= now; }
        if (expired) await removeSession(id, session);
      } catch { /* Preserve prepared data if DB reconciliation is unavailable. */ }
    });
  }
}
export async function createUploadSession(ownerId: string, size: number) {
  if (!Number.isSafeInteger(size)) throw new UploadSessionError(400, "Ukuran file tidak valid.");
  validateUploadSize(size, MAX_PDF_BYTES);
  return withUploadLock("admission", async () => {
    await purgeExpiredUploads();
    if (!runtime.piksoUploadSweep) {
      runtime.piksoUploadSweep = setInterval(() => { void purgeExpiredUploads().catch(() => console.error("Upload expiry cleanup failed")); }, 60 * 60 * 1000);
      runtime.piksoUploadSweep.unref();
    }
    let active = 0, reserved = 0;
    for (const id of await readdir(root)) {
      if (!uuid.test(id)) continue;
      try {
        const session = await readRaw(id);
        if (!session.completed) { reserved += session.size; if (session.ownerId === ownerId) active++; }
      } catch { /* Ignore incomplete directories, removed by expiry maintenance. */ }
    }
    if (active >= MAX_ACTIVE_PER_OWNER) throw new UploadSessionError(429, "Maksimal 3 upload aktif. Batalkan upload sebelumnya atau tunggu kedaluwarsa.");
    if (reserved + size > MAX_RESERVED_BYTES) throw new UploadSessionError(507, "Kuota penyimpanan sementara penuh. Coba lagi nanti.");
    const id = randomUUID();
    const session = { ownerId, size, expiresAt: Date.now() + UPLOAD_TTL_MS };
    await mkdir(directory(id), { mode: 0o700 });
    await writeSession(id, session);
    return { id, size, chunkBytes: UPLOAD_CHUNK_BYTES, expiresAt: session.expiresAt };
  });
}
export async function getUploadStatus(ownerId: string, id: string) {
  const session = await readUploadSession(ownerId, id);
  const hashes: string[] = [];
  if (!session.completed) {
    for (let index = 0; index < Math.ceil(session.size / UPLOAD_CHUNK_BYTES); index++) {
      try {
        const bytes = await readFile(partPath(id, index));
        if (bytes.length !== Math.min(UPLOAD_CHUNK_BYTES, session.size - index * UPLOAD_CHUNK_BYTES)) break;
        hashes.push(digest(bytes));
      } catch { break; }
    }
  }
  return { id, size: session.size, chunkBytes: UPLOAD_CHUNK_BYTES, confirmedChunks: hashes.length, hashes, completed: !!session.completed, sourceChecksum: session.prepared?.sourceChecksum, expiresAt: session.expiresAt };
}
export async function storeUploadChunk(ownerId: string, id: string, index: number, bytes: Uint8Array, checksum: string) {
  return withUploadLock(id, async () => {
    const session = await readUploadSession(ownerId, id);
    if (session.completed) throw new UploadSessionError(409, "Upload ini sudah digunakan untuk menyimpan buku.");
    if (!Number.isSafeInteger(index) || index < 0 || index >= Math.ceil(session.size / UPLOAD_CHUNK_BYTES)) throw new UploadSessionError(400, "Nomor bagian upload tidak valid.");
    if (bytes.length !== Math.min(UPLOAD_CHUNK_BYTES, session.size - index * UPLOAD_CHUNK_BYTES)) throw new UploadSessionError(400, "Ukuran bagian upload tidak sesuai.");
    if (index > 0 && !(await stat(partPath(id, index - 1)).catch(() => null))) throw new UploadSessionError(409, "Kirim bagian upload secara berurutan.");
    const actual = digest(bytes);
    if (!/^[a-f0-9]{64}$/i.test(checksum) || actual !== checksum.toLowerCase()) throw new UploadSessionError(422, "Pemeriksaan integritas bagian upload gagal.");
    const temp = path.join(directory(id), `${randomUUID()}.tmp`);
    try {
      await writePrivate(temp, bytes);
      // Atomic no-overwrite publication. A lost response can safely repeat this PUT.
      try { await link(temp, partPath(id, index)); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        if (!(await readFile(partPath(id, index))).equals(Buffer.from(bytes))) throw new UploadSessionError(409, "Bagian ini sudah tersimpan dengan isi berbeda.");
      }
    } finally { await unlink(temp).catch(() => {}); }
    return { index, checksum: actual };
  });
}
export async function assembleUpload(ownerId: string, id: string) {
  const session = await readUploadSession(ownerId, id);
  if (session.completed) throw new UploadSessionError(409, "Upload sudah selesai digunakan.");
  const parts: Buffer[] = [];
  for (let index = 0; index < Math.ceil(session.size / UPLOAD_CHUNK_BYTES); index++) {
    const bytes = await readFile(partPath(id, index)).catch(() => null);
    if (!bytes || bytes.length !== Math.min(UPLOAD_CHUNK_BYTES, session.size - index * UPLOAD_CHUNK_BYTES)) throw new UploadSessionError(409, "Upload belum lengkap. Lanjutkan bagian yang tersisa.");
    parts.push(bytes);
  }
  return Buffer.concat(parts);
}
export async function deleteUploadSession(ownerId: string, id: string) {
  return withUploadLock(id, async () => {
    const session = await readUploadSession(ownerId, id);
    await removeSession(id, session);
  });
}
// Called under the session lock by finalization, before the database write.
export async function prepareUploadSession(ownerId: string, id: string, prepared: Prepared, metadataHash: string) {
  const session = await readUploadSession(ownerId, id);
  await writeSession(id, { ...session, prepared, metadataHash });
}
export async function clearPreparedUpload(ownerId: string, id: string) {
  const session = await readUploadSession(ownerId, id);
  delete session.prepared; delete session.metadataHash;
  await writeSession(id, session);
}
export async function completeUploadSession(ownerId: string, id: string) {
  const session = await readUploadSession(ownerId, id);
  await writeSession(id, { ...session, completed: true });
  for (const name of await readdir(directory(id))) {
    if (/^\d+\.part$/.test(name)) await unlink(path.join(directory(id), name));
  }
}
