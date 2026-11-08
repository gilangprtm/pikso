import { PageHeader } from "@/components/admin/PageHeader";
import { BooksTable } from "@/components/admin/BooksTable";
import { listBooks } from "@/lib/books";
import { parsePage } from "@/lib/validation";
import { adminBooksHref, normalizeAdminBookOptions } from "@/lib/admin-books-query";
import { adminBookFormHref } from "@/lib/admin-book-return";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kelola buku" };
export default async function AdminBooks({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const first = (value:string|string[]|undefined) => Array.isArray(value) ? value[0] : value;
  const options = normalizeAdminBookOptions({pageSize:Number(first(params.pageSize)),search:first(params.search),status:first(params.status),sort:first(params.sort),direction:first(params.direction)});
  const data = await listBooks(parsePage(first(params.page)), true, options);
  const books = data.books.map(({id,title,author,category,status,pdf_pages,sales_link}) => ({id,title,author,category,status,pdf_pages,sales_link}));
  return <div className="min-w-0">
    <PageHeader title="Kelola Buku" breadcrumbs={[{label:"Dashboard",href:"/admin"},{label:"Kelola Buku",href:"/admin/books"}]} actionLabel="Tambah Buku" actionHref={adminBookFormHref("/admin/books/new",adminBooksHref(options,data.current))}/>
    <p className="mb-4 text-sm text-muted-foreground">{data.total} cerita {options.search || options.status !== "all" ? "ditemukan" : "tersimpan"}</p>
    <BooksTable books={books} current={data.current} pages={data.pages} total={data.total} options={options}/>
  </div>;
}
