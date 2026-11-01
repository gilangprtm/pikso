import { randomUUID } from "node:crypto";
import { mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";

const storageRoot = path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR || "./storage");
function directory(kind: "books" | "covers") { return path.join(/* turbopackIgnore: true */ storageRoot, kind); }
export function absoluteStoragePath(kind: "books" | "covers", filename: string) {
  if (!/^[0-9a-f-]+\.(pdf|webp)$/i.test(filename)) throw new Error("Invalid storage filename");
  return path.join(/* turbopackIgnore: true */ directory(kind), filename);
}
export async function saveUpload(kind: "books" | "covers", bytes: Uint8Array, extension: "pdf" | "webp") {
  const dir = directory(kind);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const filename = `${randomUUID()}.${extension}`;
  const target = absoluteStoragePath(kind, filename);
  const handle = await open(/* turbopackIgnore: true */ target, "wx", 0o600);
  try { await handle.writeFile(bytes); }
  catch (error) { await handle.close();await unlink(target).catch(()=>{});throw error; }
  await handle.close();
  return { filename, target };
}
export async function removeStoredFile(kind: "books" | "covers", filename: string) {
  await unlink(absoluteStoragePath(kind, filename)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}
