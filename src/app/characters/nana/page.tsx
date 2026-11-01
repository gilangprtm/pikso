import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Nav } from "@/components/nav";
import { assets } from "@/lib/assets";

export const metadata = { title: "Kenalan dengan Nana" };

export default function NanaPage() {
  return <main className="screen about-screen"><Nav/>
    <section className="about-copy"><Link className="character-back" href="/characters"><ArrowLeft size={14}/> Semua karakter</Link><span className="eyebrow">Halo, teman kecil!</span><h1>Aku Nana.<br/>Ayo <em>bertualang!</em></h1><p>Bersama Mimi, kelinci kecil sahabatku, setiap hari selalu punya cerita. Tentang keberanian, persahabatan, dan keajaiban di sekitar kita.</p><p>Tak perlu pergi jauh untuk menemukan dunia baru. Kadang, petualangan dimulai dari satu halaman.</p><Link className="button-primary mt-5" href="/books">TEMUKAN CERITAMU <ArrowRight size={17}/></Link></section>
    <div className="about-art"><span className="about-flower" aria-hidden="true">✿</span><img className="hero-cutout" src={assets.nana} alt="Nana menyapa dengan riang"/><img className="mimi-cutout" src={assets.mimi} alt="Mimi, kelinci sahabat Nana"/></div>
  </main>;
}
