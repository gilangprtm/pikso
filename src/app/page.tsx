import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { Nav } from "@/components/nav";
import { assets } from "@/lib/assets";
import { pageMetadata, publicPageMetadata, siteStructuredData } from "@/lib/seo";
export function generateMetadata() { return pageMetadata("/", publicPageMetadata.home.title, publicPageMetadata.home.description); }
export default function Home() {
  const structuredData = siteStructuredData();
  return <main className="screen hero">
    {structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />}
    <img className="hero-bg" src={assets.hero} alt="Nana dan Mimi menyapa kupu-kupu di padang bunga yang hangat" fetchPriority="high" />
    <Nav />
    <div className="hero-inner"><div>
      <span className="eyebrow">Pikso · Cerita kecil, imajinasi tanpa batas</span>
      <h1>Langkah kecil.<br/>Petualangan<br/><em>besar.</em></h1>
      <p className="hero-copy">Dunia penuh keajaiban menantimu.<br/>Buka buku, dan bertualang di dunia imajinasi.</p>
      <div className="hero-actions">
        <Link className="button-primary" href="/books">JELAJAHI CERITA <ArrowRight size={17}/></Link>
      </div>
    </div></div>
    <div className="hero-note"><img src={assets.book} alt=""/> Untuk setiap pemimpi kecil</div>
    <div className="hero-stamp" aria-hidden="true"><div><span>✿</span><br/>SMALL STORIES.<br/>BIG WONDER.</div></div>
    <span className="sr-only"><BookOpen/> Pikso adalah platform buku cerita digital anak dengan kisah bergambar yang dapat dibaca tanpa login. Nana dan Mimi adalah salah satu seri karakter di Pikso.</span>
  </main>;
}
