"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Download, LockKeyhole, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { storyAccessKey, unlockStory } from "@/lib/story-access-client";

type StartReadingProps = {
  slug: string;
  id: string;
  title: string;
  locked: boolean;
  showDownload?: boolean;
  salesLink?: string;
};

export function StartReading({ slug, id, title, locked, showDownload = false, salesLink = "" }: StartReadingProps) {
  const router = useRouter();
  const navigate = () => {
    router.push(`/books/${slug}/read`);
    router.refresh();
  };
  const [hasSavedAccess,setHasSavedAccess]=useState(false);
  useEffect(()=>{
    const key=storyAccessKey(id);
    const refresh=()=>{try{setHasSavedAccess(!!localStorage.getItem(key));}catch{setHasSavedAccess(false);}};
    refresh();window.addEventListener("storage",refresh);
    return()=>window.removeEventListener("storage",refresh);
  },[id]);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<"read" | "download">("read");
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadReady, setDownloadReady] = useState<{ blob: Blob; filename: string } | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const downloadController = useRef<AbortController | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      downloadController.current?.abort();
    };
  }, []);

  function savePdf(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadPdf(controller: AbortController) {
    setDownloadProgress(0);
    setDownloadReady(null);
    setDownloadError("");
    try {
      const response = await fetch(`/api/books/${slug}/file?download=1`, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error("PDF belum dapat diunduh.");

      const total = Number(response.headers.get("Content-Length"));
      const disposition = response.headers.get("Content-Disposition");
      const filename = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const safeFilename = filename ? decodeURIComponent(filename) : `${title}.pdf`;
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;
          chunks.push(value);
          received += value.byteLength;
          if (total > 0) setDownloadProgress(Math.min(99, Math.floor((received / total) * 100)));
        }
      } catch (cause) {
        await reader.cancel().catch(() => {});
        throw cause;
      }

      const blob = new Blob(chunks.map(chunk => chunk.slice().buffer as ArrayBuffer), { type: response.headers.get("Content-Type") ?? "application/pdf" });
      if (mountedRef.current) setDownloadReady({ blob, filename: safeFilename });
    } catch (cause) {
      if (!controller.signal.aborted) setDownloadError(cause instanceof Error ? cause.message : "Unduhan PDF gagal.");
    } finally {
      if (downloadController.current === controller) downloadController.current = null;
      if (!controller.signal.aborted) {
        setBusy(false);
        setDownloadProgress(null);
      }
    }
  }

  function beginDownload() {
    if (downloadController.current) return;
    const controller = new AbortController();
    downloadController.current = controller;
    setBusy(true);
    void downloadPdf(controller);
  }

  async function start() {
    setPendingAction("read");
    if (!locked) {
      navigate();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await unlockStory(slug, id);
      setHasSavedAccess(true);
      navigate();
    } catch {
      setBusy(false);
      setCode("");
      setOpen(true);
    }
  }

  async function download() {
    setPendingAction("download");
    if (!locked) return;
    setBusy(true);
    setError("");
    try {
      await unlockStory(slug, id);
      if (!mountedRef.current) return;
      setOpen(false);
      setBusy(false);
      beginDownload();
    } catch {
      if (!mountedRef.current) return;
      setBusy(false);
      setCode("");
      setOpen(true);
    }
  }

  async function go(accessCode: string) {
    setBusy(true);
    setError("");
    try {
      await unlockStory(slug, id, accessCode);
      if (!mountedRef.current) return;
      setHasSavedAccess(true);
      if (pendingAction === "download") {
        setOpen(false);
        setBusy(false);
        beginDownload();
      } else {
        navigate();
      }
    } catch (cause) {
      if (!mountedRef.current) return;
      setError(cause instanceof Error ? cause.message : "Kode akses belum dapat diperiksa.");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="book-detail-actions">
        {showDownload ? (
          <Button
            type="button"
            variant="default"
            size={downloadReady ? "default" : "icon"}
            className={`button-primary book-download-button mt-5${downloadReady ? " book-download-ready" : ""}`}
            aria-label={downloadReady ? `Simpan ${title} sebagai PDF` : downloadProgress !== null ? `Mengunduh ${title}: ${downloadProgress}%` : `Unduh ${title} sebagai PDF`}
            title={downloadReady ? "Simpan PDF ke perangkat" : "Unduh cerita (PDF)"}
            onClick={() => {
              if (downloadReady) {
                savePdf(downloadReady.blob, downloadReady.filename);
                setDownloadReady(null);
                setDownloadProgress(null);
              } else if (locked) {
                void download();
              } else {
                beginDownload();
              }
            }}
            disabled={busy}
          >
            {downloadReady ? (
              "SIMPAN PDF"
            ) : downloadProgress !== null ? (
              <span aria-live="polite" aria-label={`Unduhan ${downloadProgress}%`}>{downloadProgress}%</span>
            ) : (
              <Download size={19} aria-hidden="true" />
            )}
          </Button>
        ) : null}
        {downloadError ? <p className="book-download-error" role="alert">{downloadError}</p> : null}
        <Button type="button" className="button-primary mt-5" onClick={() => void start()} disabled={busy}>
          {locked&&!hasSavedAccess ? <LockKeyhole size={16} /> : null}
          MULAI MEMBACA
          <ArrowRight size={17} />
        </Button>
      </div>
      <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
        <DialogContent showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>Kode akses cerita</DialogTitle>
            <DialogDescription>{title} memerlukan kode akses untuk dibaca.</DialogDescription>
          </DialogHeader>
          <form onSubmit={event => { event.preventDefault(); void go(code); }} className="grid gap-3">
            <Input
              autoFocus
              autoComplete="off"
              aria-label="Kode akses"
              aria-invalid={!!error}
              value={code}
              maxLength={128}
              onChange={event => { setCode(event.target.value); setError(""); }}
              placeholder="Masukkan kode akses"
              disabled={busy}
            />
            {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
            <DialogFooter className="m-0 mt-1 border-0 bg-transparent p-0 sm:justify-end">
              <Button type="submit" disabled={busy || !code.length}>
                {busy ? <><LoaderCircle className="animate-spin" />Memeriksa…</> : "Buka cerita"}
              </Button>
            </DialogFooter>
          </form>
          {locked && salesLink ? <a href={salesLink} target="_blank" rel="noopener noreferrer" className="inline-flex w-full justify-center rounded-md border px-4 py-2 text-sm">Dapatkan Kode Akses</a> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
