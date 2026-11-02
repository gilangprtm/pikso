import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Nav } from "@/components/nav";

export const metadata = { title: "Tentang Pikso Studio" };

export default function AboutPage() {
  return <main className="screen about-screen studio-screen content-inset-screen"><Nav/>
    <section className="about-copy"><span className="eyebrow">Tentang Pikso Studio</span><h1>Cerita kecil.<br/><em>Imajinasi besar.</em></h1><p>Pikso adalah rumah bagi cerita dan karakter dari Pikso Studio. Tempat pembaca kecil menemukan dunia baru, teman baru, dan keajaiban di setiap halaman.</p><p>Melalui cerita bergambar yang hangat, kami mengajak anak-anak menjelajahi imajinasi, persahabatan, dan keberanian.</p><Link className="button-primary mt-5" href="/books">JELAJAHI CERITA <ArrowRight size={17}/></Link></section>
    <div className="studio-art" aria-hidden="true"><span className="studio-flower">✿</span><div className="studio-mark">pikso<span>STUDIO</span></div><span className="studio-caption">Cerita kecil, keajaiban tanpa batas.</span></div>
  </main>;
}
