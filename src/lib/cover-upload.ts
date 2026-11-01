import { createRequire } from "node:module";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";

const require = createRequire(path.join(process.cwd(), "package.json"));
const pdfAssets = path.dirname(require.resolve("pdfjs-dist/package.json"));
const COVER_SIZE = 900;

/** Render only page one. Contain it on a white square, never stretch or crop. */
export async function createPdfCover(pdfBytes: Uint8Array) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({
    // PDF.js may transfer/detach data; keep the original upload for storage.
    data: new Uint8Array(pdfBytes),
    stopAtErrors: true,
    verbosity: 0,
    cMapUrl: path.join(pdfAssets, "cmaps") + path.sep,
    cMapPacked: true,
    standardFontDataUrl: path.join(pdfAssets, "standard_fonts") + path.sep,
    wasmUrl: path.join(pdfAssets, "wasm") + path.sep,
    iccUrl: path.join(pdfAssets, "iccs") + path.sep,
  });
  try {
    const document = await task.promise;
    // Even an empty-password encrypted PDF can open successfully in PDF.js.
    // Preserve the upload rule that encrypted/restricted documents are rejected.
    if (await document.getPermissions() !== null) {
      throw new Error("PDF terenkripsi tidak didukung.");
    }
    if (document.numPages < 1 || document.numPages > 500) {
      throw new Error("Buku harus memiliki 1–500 halaman.");
    }
    const page = await document.getPage(1);
    const size = page.getViewport({ scale: 1 });
    if (![size.width, size.height].every(value => Number.isFinite(value) && value > 0)) {
      throw new Error("Ukuran halaman pertama PDF tidak valid.");
    }
    const viewport = page.getViewport({ scale: COVER_SIZE / Math.max(size.width, size.height) });
    const canvas = createCanvas(Math.max(1, Math.round(viewport.width)), Math.max(1, Math.round(viewport.height)));
    try {
      await page.render({
        canvas: null,
        // PDF.js uses DOM typings; the Node canvas implements its rendering API.
        canvasContext: canvas.getContext("2d") as unknown as CanvasRenderingContext2D,
        viewport,
        background: "#ffffff",
      }).promise;
      const cover = await sharp(canvas.toBuffer("image/png"))
        .resize(COVER_SIZE, COVER_SIZE, { fit: "contain", background: "#ffffff" })
        .webp({ quality: 82 })
        .toBuffer();
      return { cover, pageCount: document.numPages };
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await task.destroy();
  }
}
