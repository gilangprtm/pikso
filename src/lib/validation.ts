import { z } from "zod";

export const bookInput = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi.").max(120),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug hanya huruf kecil, angka, dan tanda hubung."),
  description: z.string().trim().max(1500),
  author: z.string().trim().max(100),
  categories: z.array(z.string().trim().min(1, "Nama kategori wajib diisi.").max(50, "Nama kategori maksimal 50 karakter.")).max(20, "Pilih maksimal 20 kategori."),
  accessCode: z.string().max(128, "Kode akses maksimal 128 karakter.").default(""),
  removeAccessCode: z.boolean().default(false),
  status: z.enum(["draft", "published"]),
});
export function parsePage(value: unknown) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, 100000) : 1;
}
export function safeError(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "Data tidak valid.";
  return "Proses gagal. Periksa data atau coba lagi.";
}
export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export const MAX_PDF_BYTES = 50 * 1024 * 1024;
export class UploadSizeError extends Error {}
export function validateUploadSize(size: number, limit: number) {
  if (size <= 0) throw new UploadSizeError("File PDF kosong. Pilih file PDF yang berisi data.");
  if (size > limit) {
    throw new UploadSizeError(`Ukuran file ${(size / 1024 / 1024).toFixed(2)} MiB melebihi batas ${limit / 1024 / 1024} MiB. Kecilkan PDF sebelum mengunggah.`);
  }
}
