"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { assets } from "@/lib/assets";
import { Download } from "lucide-react";

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
        <h1>Petualanganmu siap diunduh!</h1>
        <p>Unduhan akan dicoba secara otomatis. Jika Safari belum memulai unduhan, ketuk tombol Unduh PDF.</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <a className="button-primary" href={fileUrl} target="_blank" rel="noopener noreferrer"><Download size={16} aria-hidden="true" />Unduh PDF</a>
          <Link className="button-primary" href={`/books/${encodeURIComponent(slug)}`}>Kembali ke cerita</Link>
        </div>
        <p className="mt-4">Safari mungkin meminta konfirmasi sebelum menyimpan PDF.</p>
      </div>
      <iframe ref={frame} name="pikso-download-frame" title="Unduhan PDF" hidden />
    </main>
  );
}
