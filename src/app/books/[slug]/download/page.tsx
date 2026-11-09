"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Download } from "lucide-react";
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
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <a className="button-primary" href={fileUrl} target="pikso-download-frame">
            <Download size={16} aria-hidden="true" /> Unduh PDF
          </a>
          <Link className="button-primary" href={`/books/${encodeURIComponent(slug)}`}>Kembali ke cerita</Link>
        </div>
        <p className="mt-4">Periksa daftar unduhan browser untuk melihat hasilnya.</p>
      </div>
      <iframe ref={frame} name="pikso-download-frame" title="Unduhan PDF" hidden />
    </main>
  );
}
