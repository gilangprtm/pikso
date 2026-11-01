import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { apiError, authorizeAdmin, boundedFormData, HttpError } from "@/lib/api";
import { bookInput, MAX_PDF_BYTES, safeError, UploadSizeError, validateUploadSize } from "@/lib/validation";
import { removeStoredFile, saveUpload } from "@/lib/storage";
import { createPdfCover } from "@/lib/cover-upload";
import { writeBook } from "@/lib/book-write";

export const runtime = "nodejs";
export const maxDuration = 60;
const formError = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
export async function POST(request: Request) {
  const startedAt = Date.now();
  let stage = "authorization";
  const enterStage = (next: string) => {
    stage = next;
    console.info("Admin book upload stage", { stage, durationMs: Date.now() - startedAt });
  };
  let storedCover: Awaited<ReturnType<typeof saveUpload>> | undefined;
  let storedPdf: Awaited<ReturnType<typeof saveUpload>> | undefined;
  try {
    await authorizeAdmin(request);
    enterStage("receive-body");
    const form = await boundedFormData(request);
    const parsed = bookInput.safeParse({ title: form.get("title"), slug: form.get("slug"), description: form.get("description") ?? "", author: form.get("author") ?? "", categories: form.getAll("categories"), status: form.get("status") ?? "draft" });
    if (!parsed.success) return formError(safeError(parsed.error));
    const pdf = form.get("pdf");
    if (!(pdf instanceof File)) return formError("File cerita PDF wajib diunggah.");
    if (!pdf.name.toLowerCase().endsWith(".pdf") || !["application/pdf", "application/octet-stream"].includes(pdf.type)) return formError("File cerita harus PDF.");
    validateUploadSize(pdf.size, MAX_PDF_BYTES);
    enterStage("read-pdf");
    const pdfBytes = new Uint8Array(await pdf.arrayBuffer());
    if (new TextDecoder().decode(pdfBytes.slice(0, 5)) !== "%PDF-") return formError("Isi file bukan PDF yang valid.");
    // PDF.js validates/opens the document, counts pages, and renders page one in a
    // single parse, avoiding the duplicate work of a second PDF parser.
    enterStage("validate-and-render-pdf");
    const { cover, pageCount } = await createPdfCover(pdfBytes);
    enterStage("store-files");
    storedCover = await saveUpload("covers", cover, "webp");
    storedPdf = await saveUpload("books", pdfBytes, "pdf");
    enterStage("database-write");
    await writeBook(randomUUID(), parsed.data, { pdf: storedPdf.filename, cover: storedCover.filename, pages: pageCount });
    console.info("Admin book upload completed", { stage: "complete", durationMs: Date.now() - startedAt });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const details = error && typeof error === "object" ? error as { name?: unknown; code?: unknown } : {};
    console.error("Admin book upload failed", {
      stage,
      durationMs: Date.now() - startedAt,
      errorName: typeof details.name === "string" ? details.name : "Unknown",
      errorCode: typeof details.code === "string" ? details.code : undefined,
    });
    await Promise.all([
      storedPdf ? removeStoredFile("books", storedPdf.filename) : Promise.resolve(),
      storedCover ? removeStoredFile("covers", storedCover.filename) : Promise.resolve(),
    ]).catch(()=>console.error("Upload cleanup needs attention"));
    if (error instanceof HttpError) return apiError(error);
    if ((error as {code?:string}).code === "23505") return formError("Slug tersebut sudah digunakan.",409);
    if (error instanceof UploadSizeError) return formError(error.message, 413);
    return formError(safeError(error), 400);
  }
}
