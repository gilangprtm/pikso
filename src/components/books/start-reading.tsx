"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { unlockStory } from "@/lib/story-access-client";
export function StartReading({slug,id,title,locked}:{slug:string;id:string;title:string;locked:boolean}) {
  const router=useRouter();
  const navigate=()=>{router.push(`/books/${slug}/read`);router.refresh();};
  const [open,setOpen]=useState(false);const [code,setCode]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  async function go(accessCode:string) {
    setBusy(true);setError("");
    try { await unlockStory(slug,id,accessCode); navigate(); }
    catch(cause){setError(cause instanceof Error?cause.message:"Kode akses belum dapat diperiksa.");setBusy(false);}
  }
  async function start(){
    if(!locked){navigate();return;}
    setBusy(true);setError("");
    try{await unlockStory(slug,id);navigate();}
    catch{setBusy(false);setCode("");setOpen(true);}
  }
  return <>
    <Button type="button" className="button-primary mt-5" onClick={()=>void start()} disabled={busy}>{locked?<LockKeyhole size={16}/>:null} MULAI MEMBACA <ArrowRight size={17}/></Button>
    <Dialog open={open} onOpenChange={value=>{if(!busy)setOpen(value);}}>
      <DialogContent showCloseButton={!busy}>
        <DialogHeader><DialogTitle>Kode akses cerita</DialogTitle><DialogDescription>{title} memerlukan kode akses untuk dibaca.</DialogDescription></DialogHeader>
        <form onSubmit={event=>{event.preventDefault();void go(code);}} className="grid gap-3">
          <Input autoFocus autoComplete="off" aria-label="Kode akses" aria-invalid={!!error} value={code} maxLength={128} onChange={event=>{setCode(event.target.value);setError("");}} placeholder="Masukkan kode akses" disabled={busy}/>
          {error?<p className="text-sm text-destructive" role="alert">{error}</p>:null}
          <DialogFooter className="m-0 mt-1 border-0 bg-transparent p-0 sm:justify-end"><Button type="submit" disabled={busy||!code.length}>{busy?<><LoaderCircle className="animate-spin"/>Memeriksa…</>:"Buka cerita"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
