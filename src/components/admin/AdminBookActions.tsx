"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminBookFormHref } from "@/lib/admin-book-return";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
export function AdminBookActions({ id, title, returnTo = "/admin/books" }: {id:string;title:string;returnTo?:string}) {
  const router=useRouter();const[busy,setBusy]=useState(false);const[error,setError]=useState("");const[open,setOpen]=useState(false);
  async function removeBook() {
    setBusy(true);setError("");
    try {const response=await fetch(`/api/admin/books/${id}`,{method:"DELETE"});if(!response.ok)throw new Error();setOpen(false);router.refresh();}
    catch {setError("Gagal menghapus.");}
    finally {setBusy(false);}
  }
  return <>
    <DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" aria-label={`Aksi ${title}`} title={`Aksi ${title}`} className="size-10 text-muted-foreground"/>}><MoreHorizontal className="size-5"/></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-40">
      <DropdownMenuItem render={<Link href={`/admin/books/${id}/preview`}/>}><Eye/>Lihat</DropdownMenuItem>
      <DropdownMenuItem render={<Link href={adminBookFormHref(`/admin/books/${id}`,returnTo)}/>}><Pencil/>Edit</DropdownMenuItem>
      <AlertDialog open={open} onOpenChange={next=>{if(!busy){setError("");setOpen(next);}}}><AlertDialogTrigger render={<DropdownMenuItem variant="destructive" closeOnClick={false}><Trash2/>Hapus</DropdownMenuItem>}/>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus cerita ini?</AlertDialogTitle><AlertDialogDescription>Hapus “{title}” beserta PDF dan sampulnya? Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader><FieldError>{error}</FieldError><AlertDialogFooter><AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={busy} onClick={removeBook}>{busy?"Menghapus…":"Hapus cerita"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </DropdownMenuContent></DropdownMenu>
  </>;
}
