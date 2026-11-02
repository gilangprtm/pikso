import { Nav } from "@/components/nav";
import { CatalogCarousel } from "@/components/catalog/catalog-carousel";
import { Pagination } from "@/components/pagination";
import { listBooks } from "@/lib/books";
import { parsePage } from "@/lib/validation";
import { assets } from "@/lib/assets";
export const dynamic = "force-dynamic";
export const metadata = { title: "Koleksi cerita" };
export default async function BooksPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = parsePage((await searchParams).page);
  let data: Awaited<ReturnType<typeof listBooks>> | null = null;
  let unavailable = false;
  try { data = await listBooks(page); } catch { unavailable = true; }
  return <main className="screen page-screen catalog-screen content-inset-screen"><Nav/>
    <header className="page-heading"><div><span className="eyebrow">Rak cerita Pikso</span><h1>Satu buku, seribu keajaiban.</h1></div><p>Temukan teman baru, dunia baru, dan petualangan kecil yang selalu dekat di hati.</p></header>
    {data?.books.length ? <><CatalogCarousel key={data.current} books={data.books.map(({id,slug,title})=>({id,slug,title}))}/><Pagination current={data.current} pages={data.pages} base="/books"/></>: <div className="empty-state"><img src={assets.curious} alt="Nana sedang penasaran"/><h2>{unavailable ? "Rak cerita sedang disiapkan" : "Cerita baru segera hadir"}</h2><p>{unavailable ? "Silakan kembali sebentar lagi, ya." : "Petualangan baru sedang disiapkan untukmu."}</p></div>}
  </main>;
}
