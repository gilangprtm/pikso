"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Sparkles } from "lucide-react";
export function Nav() {
  const pathname = usePathname();
  return <header className="site-header">
    <Link href="/" aria-label="Pikso, beranda" className="brand">pikso<span>✿</span></Link>
    <nav aria-label="Navigasi utama" className="nav-pill">
      {[ ["/", "Beranda"], ["/books", "Cerita"], ["/characters", "Karakter"], ["/about", "Tentang"] ].map(([href, label]) => {
        const active = pathname === href || (href === "/characters" && pathname.startsWith("/characters/"));
        return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={active ? "active" : ""}>{label}</Link>;
      })}
    </nav>
    <Link href="/books" className="nav-cta"><Sparkles size={15}/> Mari membaca <ArrowUpRight size={15}/></Link>
  </header>;
}
