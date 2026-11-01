import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { getAdminBook } from "@/lib/books";
import { isUuid } from "@/lib/validation";
import { ReaderLoader } from "@/components/reader/reader-loader";
export const dynamic="force-dynamic";
export default async function Preview({params}:{params:Promise<{id:string}>}) {
  await requireAdmin();const{id}=await params;if(!isUuid(id))notFound();const book=await getAdminBook(id);if(!book)notFound();
  return <ReaderLoader adminPreview fileUrl={`/api/admin/books/${book.id}/file`} title={`Pratinjau: ${book.title}`} pageCount={book.pdf_pages} backHref="/admin/books"/>;
}
