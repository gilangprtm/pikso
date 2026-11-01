import Link from "next/link";
import { assets } from "@/lib/assets";
export default function NotFound() { return <main className="screen grid place-items-center"><div className="empty-state"><img src={assets.curious} alt=""/><h1>Halaman ini belum ditemukan.</h1><p>Mungkin petualangan kita ada di tempat lain.</p><Link className="button-primary mt-5" href="/books">Kembali ke cerita</Link></div></main>; }
