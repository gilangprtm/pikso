import { BookForm } from "@/components/admin/book-form";
import { PageHeader } from "@/components/admin/PageHeader";
import { listBookCategories } from "@/lib/book-categories";
import { requireAdmin } from "@/lib/session";
export const dynamic = "force-dynamic";
export const metadata = { title: "Tambah cerita" };
export default async function NewBook() {
  await requireAdmin();
  const categories = await listBookCategories();
  return <div className="space-y-6"><PageHeader title="Tambah Buku" breadcrumbs={[{label:"Dashboard",href:"/admin"},{label:"Kelola Buku",href:"/admin/books"},{label:"Tambah Buku",href:"/admin/books/new"}]}/><BookForm mode="create" categories={categories.map(category => category.name)}/></div>;
}
