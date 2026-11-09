"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { assets } from "@/lib/assets";

export default function DownloadPage() {
  const { slug } = useParams<{ slug: string }>();
  const frame = useRef<HTMLIFrameElement>(null);
  const fileUrl = `/api/books/${encodeURIComponent(slug)}/file?download=1`;

  useEffect(() => {
    // Keep the explanation page visible while the browser handles the attachment.
    if (frame.current) frame.current.src = fileUrl;
  }, [fileUrl]);

  return (
    <main className="screen grid place-items-center px-6">
      <div className="empty-state">
        <img src={assets.curious} alt="" />
        <h1>Petualanganmu sedang diunduh!</h1>
        <p>Silakan tunggu sebentar. Jika unduhan belum dimulai, ketuk tombol di bawah.</p>
        <Link className="button-primary mt-5" href={`/books/${encodeURIComponent(slug)}`}>Kembali ke cerita</Link>
        <p className="mt-4">Jika unduhan tidak dimulai, kembali ke cerita dan tekan ikon unduh sekali lagi.</p>
      </div>
      <iframe ref={frame} name="pikso-download-frame" title="Unduhan PDF" hidden />
    </main>
  );
}
