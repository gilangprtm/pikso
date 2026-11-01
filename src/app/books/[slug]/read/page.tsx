import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { getPublicBook } from "@/lib/books";
import { ReaderLoader } from "@/components/reader/reader-loader";
export const dynamic="force-dynamic";
export const metadata={title:"Baca cerita"};
export default async function ReadPage({params}:{params:Promise<{slug:string}>}){
  const book=await getPublicBook((await params).slug);if(!book)notFound();
  // Stored PDFs have unique, write-once filenames; metadata edits do not invalidate file bytes.
  const version=createHash("sha256").update(book.pdf_path).digest("hex").slice(0,20);
  return <ReaderLoader fileUrl={`/api/books/${book.slug}/file?v=${version}`} title={book.title} pageCount={book.pdf_pages} backHref={`/books/${book.slug}`}/>;
}
