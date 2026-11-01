import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
export function Pagination({ current, pages, base }: { current: number; pages: number; base: string }) {
  return <nav className="pagination" aria-label="Halaman koleksi">
    {current > 1 ? <Link aria-label="Halaman sebelumnya" href={`${base}?page=${current - 1}`}><ChevronLeft size={18}/></Link> : <span aria-disabled="true"><ChevronLeft size={18}/></span>}
    <p>Halaman <strong>{current}</strong> dari {pages}</p>
    {current < pages ? <Link aria-label="Halaman berikutnya" href={`${base}?page=${current + 1}`}><ChevronRight size={18}/></Link> : <span aria-disabled="true"><ChevronRight size={18}/></span>}
  </nav>;
}
