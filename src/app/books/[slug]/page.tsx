import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Clock3 } from "lucide-react";
import { getPublicBook } from "@/lib/books";
import { Nav } from "@/components/nav";
import { StartReading } from "@/components/books/start-reading";
import { pageMetadata } from "@/lib/seo";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}) {
  const book=await getPublicBook((await params).slug);
  if (!book) return { title: "Cerita tidak ditemukan", robots: { index: false, follow: false } };
  return pageMetadata(`/books/${book.slug}`, book.title, book.description || `Jelajahi ${book.title}, cerita bergambar anak dari Pikso Studio.`, `/api/books/${book.slug}/cover`);
}
export default async function BookDetail({params}:{params:Promise<{slug:string}>}) {
  const book=await getPublicBook((await params).slug);if(!book)notFound();
  return <main className="screen book-detail-screen book-detail-catalog-background"><Nav/><div className="book-detail-inner"><Link className="book-detail-back" href="/books"><ArrowLeft size={15}/> Semua cerita</Link><section className="book-detail-card"><div className="book-detail-cover"><img src={`/api/books/${book.slug}/cover`} alt={`Sampul ${book.title}`}/></div><div className="book-detail-copy"><span className="eyebrow">{book.category||"Cerita bergambar"}</span><h1>{book.title}</h1><p className="book-detail-author">Oleh {book.author||"Studio Nana"}</p><p className="book-detail-description">{book.description||"Sebuah petualangan kecil penuh kehangatan menanti di setiap halaman."}</p><div className="book-detail-stats"><span><BookOpen size={15}/>{book.pdf_pages} halaman</span><span><Clock3 size={15}/>Untuk pembaca kecil</span></div><StartReading slug={book.slug} id={book.id} title={book.title} locked={book.access_locked}/></div></section></div></main>;
}
