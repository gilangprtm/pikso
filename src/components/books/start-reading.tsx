"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Download, LockKeyhole, LoaderCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
  const downloadHref = `/api/books/${slug}/file?download=1`;
  const [unlockForDownload, setUnlockForDownload] = useState(false);

  async function start() {
    setUnlockForDownload(false);
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

  async function go(accessCode: string) {
    setBusy(true);
    setError("");
    try {
      await unlockStory(slug, id, accessCode);
      setHasSavedAccess(true);
      if (unlockForDownload) {
        setOpen(false);
        setBusy(false);
        setUnlockForDownload(false);
      } else {
        navigate();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Kode akses belum dapat diperiksa.");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="book-detail-actions">
        {showDownload ? (
          <a
            href={downloadHref}
            download={`${title}.pdf`}
            onClick={event => {
              if (locked && !hasSavedAccess) {
                event.preventDefault();
                setUnlockForDownload(true);
                setCode("");
                setError("");
                setOpen(true);
              }
            }}
            className={buttonVariants({ variant: "default", size: "icon", className: "button-primary book-download-button mt-5" })}
            aria-label={`Unduh ${title} sebagai PDF`}
            title="Unduh cerita (PDF)"
          >
            <Download size={19} aria-hidden="true" />
          </a>
        ) : null}
        <Button type="button" className="button-primary mt-5" onClick={() => void start()} disabled={busy}>
          {locked&&!hasSavedAccess ? <LockKeyhole size={16} /> : null}
          MULAI MEMBACA
          <ArrowRight size={17} />
        </Button>
      </div>
      <Dialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); } }}>
        <DialogContent showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>Kode akses cerita</DialogTitle>
            <DialogDescription>{`${title} memerlukan kode akses untuk dibaca.`}</DialogDescription>
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
            <DialogFooter className="m-0 mt-1 flex-col-reverse gap-2 border-0 bg-transparent p-0 sm:flex-row sm:items-center sm:justify-end">
              {locked && salesLink ? <a href={salesLink} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center rounded-md border px-4 py-2 text-sm sm:w-auto">Dapatkan Kode Akses</a> : null}
              <Button type="submit" disabled={busy || !code.length}>
                {busy ? <><LoaderCircle className="animate-spin" />Memeriksa…</> : "Buka cerita"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
