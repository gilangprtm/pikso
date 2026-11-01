import { MAX_PDF_BYTES, validateUploadSize } from "./validation";

export type BookUploadProgress =
  | { phase: "uploading"; percent: number | null }
  | { phase: "processing" };

// Upload progress measures bytes sent, not PDF processing or database commit.
// Never automatically retry a write: a lost response may follow a successful save.
export function uploadBook(form: FormData, onProgress: (progress: BookUploadProgress) => void) {
  return new Promise<void>((resolve, reject) => {
    const pdf = form.get("pdf");
    if (pdf instanceof File) validateUploadSize(pdf.size, MAX_PDF_BYTES);
    const request = new XMLHttpRequest();
    const uncertain = "Respons penyimpanan belum dapat dipastikan. Periksa daftar buku sebelum mencoba lagi agar tidak membuat buku ganda.";
    request.open("POST", "/api/admin/books");
    request.timeout = 180_000;
    request.upload.onprogress = event => onProgress({ phase: "uploading", percent: event.lengthComputable ? Math.min(100, Math.round(event.loaded / event.total * 100)) : null });
    request.upload.onload = () => onProgress({ phase: "processing" });
    request.onerror = () => reject(new Error(`Koneksi terputus. ${uncertain}`));
    request.ontimeout = () => reject(new Error(`Waktu tunggu habis. ${uncertain}`));
    request.onabort = () => reject(new Error(uncertain));
    request.onload = () => {
      let payload: { ok?: boolean; error?: string };
      try { payload = JSON.parse(request.responseText); }
      catch {
        reject(new Error(request.status >= 500
          ? `Server atau proxy gagal merespons (HTTP ${request.status}). ${uncertain}`
          : `Respons tidak dikenali (HTTP ${request.status}). ${uncertain}`));
        return;
      }
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(typeof payload?.error === "string"
          ? `Gagal menyimpan (HTTP ${request.status}): ${payload.error}`
          : `Gagal menyimpan (HTTP ${request.status}). ${uncertain}`));
      } else if (payload?.ok !== true) {
        reject(new Error(uncertain));
      } else resolve();
    };
    onProgress({ phase: "uploading", percent: 0 });
    request.send(form);
  });
}
