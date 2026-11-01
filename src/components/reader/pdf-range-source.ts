"use client";
import { PDFDataRangeTransport } from "pdfjs-dist";

export const PDF_CHUNK_SIZE = 256 * 1024;
const MAX_CACHE_BYTES = 64 * 1024 * 1024;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
type ChunkRecord = { id: string; url: string; etag: string; start: number; bytes: ArrayBuffer; usedAt: number };
type ChunkMeta = { id: string; url: string; etag: string; usedAt: number; size: number };
export interface PdfChunkStore {
  get(id: string): Promise<ChunkRecord | undefined>;
  put(record: ChunkRecord): Promise<void>;
  prune(url: string, etag: string): Promise<void>;
}

// Cache failures (private browsing, eviction, quota, unavailable IDB) never block reading.
export class IndexedPdfChunkStore implements PdfChunkStore {
  private db: Promise<IDBDatabase | null>;
  private writes: Promise<void> = Promise.resolve();
  constructor() {
    this.db = new Promise(resolve => {
      try {
        if (typeof indexedDB === "undefined") { resolve(null); return; }
        const request = indexedDB.open("pikso-pdf-chunks-v1", 1);
        let settled = false;
        const finish = (db: IDBDatabase | null) => {
          if (settled) { db?.close(); return; }
          settled = true; clearTimeout(timer); resolve(db);
        };
        const timer = setTimeout(() => finish(null), 1000);
        request.onupgradeneeded = () => {
          request.result.createObjectStore("chunks", { keyPath: "id" });
          request.result.createObjectStore("metadata", { keyPath: "id" });
        };
        request.onsuccess = () => {
          request.result.onversionchange = () => request.result.close();
          finish(request.result);
        };
        request.onerror = request.onblocked = () => finish(null);
      } catch { resolve(null); }
    });
  }
  async get(id: string): Promise<ChunkRecord | undefined> {
    const db = await this.db;
    if (!db) return undefined;
    return new Promise(resolve => {
      try {
        const tx = db.transaction("chunks", "readonly");
        const timer = setTimeout(() => { resolve(undefined); try { tx.abort(); } catch {} }, 1000);
        const request = tx.objectStore("chunks").get(id);
        request.onsuccess = () => { clearTimeout(timer); resolve(request.result); };
        tx.onabort = tx.onerror = () => { clearTimeout(timer); resolve(undefined); };
      } catch { resolve(undefined); }
    });
  }
  private mutate(record?: ChunkRecord, url?: string, etag?: string): Promise<void> {
    this.writes = this.writes.then(async () => {
      const db = await this.db;
      if (!db) return;
      await new Promise<void>(resolve => {
        try {
          const tx = db.transaction(["chunks", "metadata"], "readwrite");
          const store = tx.objectStore("chunks");
          const metadata = tx.objectStore("metadata");
          if (record) {
            store.put(record);
            metadata.put({ id: record.id, url: record.url, etag: record.etag, usedAt: record.usedAt, size: record.bytes.byteLength } satisfies ChunkMeta);
          }
          const timer = setTimeout(() => { resolve(); try { tx.abort(); } catch {} }, 1000);
          const entries: ChunkMeta[] = [];
          metadata.openCursor().onsuccess = event => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (!cursor) {
              let size = entries.reduce((sum, entry) => sum + entry.size, 0);
              entries.sort((a, b) => a.usedAt - b.usedAt);
              for (const entry of entries) {
                if (size <= MAX_CACHE_BYTES) break;
                store.delete(entry.id); metadata.delete(entry.id); size -= entry.size;
              }
              return;
            }
            const value = cursor.value as ChunkMeta;
            if (!Number.isSafeInteger(value.size) || value.size <= 0 || value.usedAt < Date.now() - MAX_AGE_MS || (url === value.url && etag !== value.etag)) { store.delete(value.id); cursor.delete(); }
            else entries.push(value);
            cursor.continue();
          };
          tx.oncomplete = tx.onerror = tx.onabort = () => { clearTimeout(timer); resolve(); };
        } catch { resolve(); }
      });
    }).catch(() => {});
    return this.writes;
  }
  put(record: ChunkRecord) { return this.mutate(record); }
  prune(url: string, etag: string) { return this.mutate(undefined, url, etag); }
}

let browserStore: PdfChunkStore | undefined;
type Settings = {
  signal: AbortSignal;
  onError: () => void;
  onProgress?: (loaded: number, total: number) => void;
  fetcher?: typeof fetch;
  store?: PdfChunkStore;
};

/** Fresh HEAD authorizes every open, including cache hits. No offline/admin caching. */
export async function createCachedPdfSource(fileUrl: string, settings: Settings) {
  // Never create or read persistent storage for protected/admin or unrelated endpoints.
  if (!/^\/api\/books\/[^/?#]+\/file(?:\?[^#]*)?$/.test(fileUrl)) throw new Error("Not a public PDF endpoint");
  const fetcher = settings.fetcher ?? fetch;
  const response = await fetcher(fileUrl, { method: "HEAD", cache: "no-store", signal: settings.signal });
  const length = Number(response.headers.get("content-length"));
  const etag = response.headers.get("etag");
  if (!response.ok || !response.headers.get("content-type")?.includes("application/pdf") || !Number.isSafeInteger(length) || length <= 0 || length > 50 * 1024 * 1024 || !etag || !/^"[^"\r\n]+"$/.test(etag)) throw new Error("PDF access or metadata unavailable");
  if (settings.signal.aborted) throw new Error("Aborted");
  const store = settings.store ?? (browserStore ??= new IndexedPdfChunkStore());
  const resource = fileUrl.split("?")[0];
  await store.prune(resource, etag).catch(() => {});
  if (settings.signal.aborted) throw new Error("Aborted");
  const controller = new AbortController();
  const pending = new Map<number, Promise<Uint8Array>>();
  let failed = false;
  let delivered = 0;
  const abort = () => controller.abort();
  settings.signal.addEventListener("abort", abort, { once: true });

  const loadChunk = (start: number): Promise<Uint8Array> => {
    const existing = pending.get(start);
    if (existing) return existing;
    const task = (async () => {
      const end = Math.min(length, start + PDF_CHUNK_SIZE);
      const id = JSON.stringify([resource, etag, start]);
      const cached = await store.get(id).catch(() => undefined);
      if (controller.signal.aborted) throw new Error("Aborted");
      if (cached && cached.url === resource && cached.etag === etag && cached.start === start && cached.bytes instanceof ArrayBuffer && cached.bytes.byteLength === end - start && cached.usedAt >= Date.now() - MAX_AGE_MS) {
        void store.put({ ...cached, usedAt: Date.now() }).catch(() => {});
        return new Uint8Array(cached.bytes);
      }
      const response = await fetcher(fileUrl, {
        headers: { Range: `bytes=${start}-${end - 1}`, "If-Range": etag },
        cache: "no-store", signal: controller.signal,
      });
      if (response.status !== 206 || response.headers.get("etag") !== etag || response.headers.get("content-range") !== `bytes ${start}-${end - 1}/${length}` || !response.headers.get("content-type")?.includes("application/pdf")) {
        await response.body?.cancel();
        throw new Error("PDF access or version changed");
      }
      const bytes = await response.arrayBuffer();
      if (controller.signal.aborted || bytes.byteLength !== end - start) throw new Error("Incomplete PDF range");
      // Copy for IDB ownership: PDF.js may transfer the delivered buffer to its worker.
      void store.put({ id, url: resource, etag, start, bytes: bytes.slice(0), usedAt: Date.now() }).catch(() => {});
      return new Uint8Array(bytes);
    })();
    pending.set(start, task);
    void task.finally(() => pending.delete(start)).catch(() => {});
    return task;
  };

  class CachedRangeTransport extends PDFDataRangeTransport {
    constructor() { super(length, new Uint8Array(0), true); }
    override requestDataRange(begin: number, end: number): void {
      void (async () => {
        if (!Number.isSafeInteger(begin) || !Number.isSafeInteger(end) || begin < 0 || end <= begin || end > length) throw new Error("Invalid PDF range");
        const result = new Uint8Array(end - begin);
        // Sequential chunks bound concurrent I/O even when PDF.js asks for a large range.
        for (let start = Math.floor(begin / PDF_CHUNK_SIZE) * PDF_CHUNK_SIZE; start < end; start += PDF_CHUNK_SIZE) {
          const bytes = await loadChunk(start);
          const from = Math.max(start, begin); const to = Math.min(start + bytes.length, end);
          result.set(bytes.subarray(from - start, to - start), from - begin);
        }
        if (!controller.signal.aborted) {
          delivered = Math.min(length, delivered + result.byteLength);
          settings.onProgress?.(delivered, length);
          this.onDataRange(begin, result);
        }
      })().catch(() => {
        if (controller.signal.aborted || failed) return;
        failed = true; settings.onError(); this.abort();
      });
    }
    override abort(): void {
      controller.abort(); pending.clear();
      settings.signal.removeEventListener("abort", abort);
    }
  }
  return { range: new CachedRangeTransport(), length };
}
