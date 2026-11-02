import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { BookForm } from "@/components/admin/book-form";
import { getAdminBook } from "@/lib/books";
import { getBookCategories, listBookCategories } from "@/lib/book-categories";
import { requireAdmin } from "@/lib/session";
import { isUuid } from "@/lib/validation";
export const dynamic="force-dynamic";
export const metadata={title:"Edit cerita"};
export default async function EditBook({params}:{params:Promise<{id:string}>}) {
  await requireAdmin();const{id}=await params;if(!isUuid(id))notFound();
  const book=await getAdminBook(id);if(!book)notFound();
  const [categories, selected] = await Promise.all([listBookCategories(), getBookCategories(id)]);
  return <div className="space-y-6"><PageHeader title="Edit Buku" breadcrumbs={[{label:"Dashboard",href:"/admin"},{label:"Kelola Buku",href:"/admin/books"},{label:book.title,href:`/admin/books/${id}`} ]}/><BookForm mode="edit" id={id} categories={categories.map(category => category.name)} initial={{title:book.title,slug:book.slug,description:book.description,author:book.author,categories:selected.map(category => category.name),status:book.status,accessCode:""}} accessLocked={book.access_locked}/></div>;
}
