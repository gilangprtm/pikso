import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Nav } from "@/components/nav";
import { assets } from "@/lib/assets";

export const metadata = { title: "Karakter" };

export default function CharactersPage() {
  return <main className="screen page-screen"><Nav/>
    <header className="page-heading"><div><span className="eyebrow">Teman dari dunia Pikso</span><h1>Kenalan, yuk!</h1></div><p>Setiap karakter punya cerita. Temukan teman kecil untuk petualangan penuh imajinasi.</p></header>
    <section className="character-grid" aria-label="Daftar karakter">
      <Link className="character-card" href="/characters/nana">
        <div className="character-portrait"><span aria-hidden="true">✿</span><img src={assets.nana} alt="Nana menyapa dengan riang"/></div>
        <div className="character-info"><span className="eyebrow">Petualang kecil</span><h2>Nana</h2><p>Bersama Mimi, Nana menemukan keajaiban dalam hal-hal sederhana.</p><span className="book-open">Kenalan dengan Nana <ArrowRight size={14}/></span></div>
      </Link>
    </section>
  </main>;
}
