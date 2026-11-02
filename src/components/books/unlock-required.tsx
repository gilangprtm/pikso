"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { StartReading } from "./start-reading";
import { unlockStory } from "@/lib/story-access-client";
export function UnlockRequired({id,slug,title}:{id:string;slug:string;title:string}) {
  const [checking,setChecking]=useState(true);
  useEffect(()=>{
    let current=true;
    void unlockStory(slug,id).then(()=>{if(current)window.location.reload();}).catch(()=>{if(current)setChecking(false);});
    return()=>{current=false;};
  },[id,slug]);
  return <main className="reader-screen grid place-items-center"><section className="reader-error text-center"><h1>{title}</h1><p role="status">{checking?"Memeriksa akses tersimpan…":"Masukkan kode akses untuk membaca cerita ini."}</p>{!checking&&<StartReading id={id} slug={slug} title={title} locked/>}<p className="mt-5"><Link href={`/books/${slug}`}>Kembali ke cerita</Link></p></section></main>;
}
