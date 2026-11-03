import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getPublicBook } from "@/lib/books";
import { ReaderLoader } from "@/components/reader/reader-loader";
import { accessCookieName, canReadBook } from "@/lib/book-access";
import { UnlockRequired } from "@/components/books/unlock-required";
export const dynamic="force-dynamic";
export const metadata={title:"Baca cerita",robots:{index:false,follow:true}};
export default async function ReadPage({params}:{params:Promise<{slug:string}>}){
  const book=await getPublicBook((await params).slug);if(!book)notFound();
  const cookie=(await cookies()).get(accessCookieName(book.id))?.value;
  if(!await canReadBook(book,new Headers(cookie?{"cookie":`${accessCookieName(book.id)}=${cookie}`}:{}))) return <UnlockRequired id={book.id} slug={book.slug} title={book.title}/>;
  // Stored PDFs have unique, write-once filenames; metadata edits do not invalidate file bytes.
  const version=createHash("sha256").update(book.pdf_path).digest("hex").slice(0,20);
  return <ReaderLoader fileUrl={`/api/books/${book.slug}/file?v=${version}`} title={book.title} pageCount={book.pdf_pages} backHref={`/books/${book.slug}`}/>;
}
