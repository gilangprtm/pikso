"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminBookActions } from "@/components/admin/AdminBookActions";
import { ADMIN_BOOK_PAGE_SIZES, adminBooksHref, type NormalizedAdminBookOptions } from "@/lib/admin-books-query";
import type { Book } from "@/lib/books";

type ListedBook = Pick<Book,"id"|"title"|"author"|"category"|"status"|"pdf_pages"|"sales_link">;
const bookColumns = (returnTo: string): Column<ListedBook>[] => [
  { key:"title", label:"Judul Cerita", sortable:true, render: book => <div className="flex min-w-44 items-center gap-3"><img src={`/api/admin/books/${book.id}/cover`} alt="" className="size-12 shrink-0 rounded-lg bg-white object-contain"/><div className="min-w-0"><span className="block max-w-64 truncate font-medium text-foreground">{book.title}</span><span className="block max-w-64 truncate text-xs text-muted-foreground">{book.author || "—"}</span></div></div> },
  { key:"category", label:"Kategori", sortable:true, render: book => book.category || "—" },
  { key:"status", label:"Status", sortable:true, render: book => <Badge variant={book.status === "published" ? "secondary" : "outline"} className="h-6">{book.status === "published" ? "Terbit" : "Draft"}</Badge> },
  { key:"pdf_pages", label:"Halaman", sortable:true },
  { key:"sales_link", label:"Link Jual", render: book => book.sales_link ? <a href={book.sales_link} target="_blank" rel="noopener noreferrer" className="text-primary underline">Buka link</a> : "—" },
  { key:"actions", label:"Aksi", render: book => <AdminBookActions id={book.id} title={book.title} returnTo={returnTo}/> },
];
export function BooksTable({ books, current, pages, total, options }: {books:ListedBook[];current:number;pages:number;total:number;options:NormalizedAdminBookOptions}) {
  const router=useRouter();
  const href=(page:number)=>adminBooksHref(options,page);
  return <div className="min-w-0 space-y-4">
    <form key={`${options.search}-${options.status}`} action="/admin/books" method="get" className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <label className="sr-only" htmlFor="book-search">Cari judul, penulis, atau kategori</label>
      <Input id="book-search" name="search" defaultValue={options.search} placeholder="Cari judul, penulis, atau kategori…" className="h-10 min-w-0 flex-1 sm:max-w-sm" />
      <label className="sr-only" htmlFor="book-status">Filter status</label>
      <Select name="status" defaultValue={options.status} items={[{value:"all",label:"Semua status"},{value:"published",label:"Terbit"},{value:"draft",label:"Draft"}]}><SelectTrigger id="book-status" className="h-10 w-full min-w-0 flex-1 bg-card sm:max-w-sm"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Semua status</SelectItem><SelectItem value="published">Terbit</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent></Select>
      <input type="hidden" name="pageSize" value={options.pageSize}/>
      <input type="hidden" name="sort" value={options.sort}/><input type="hidden" name="direction" value={options.direction}/>
      <Button type="submit" variant="outline" className="h-10">Cari / Filter</Button>
      {(options.search || options.status !== "all") && <Button nativeButton={false} render={<Link href={adminBooksHref({...options,search:"",status:"all"})}/>} variant="ghost" className="h-10">Reset</Button>}
    </form>
    {total === 0 ? <EmptyState icon={BookOpen} title={options.search || options.status !== "all" ? "Tidak ada buku yang cocok." : "Petualangan pertama dimulai di sini."} description={options.search || options.status !== "all" ? "Coba ubah kata pencarian atau filter status." : "Unggah PDF cerita; sampul dibuat otomatis dari halaman pertama. Simpan sebagai draft, lalu terbitkan saat sudah siap."}/>:<div className="min-w-0"><DataTable columns={bookColumns(href(current))} data={books} pageSize={books.length || 1} rowKey={book=>book.id} serverSorting={{key:options.sort,direction:options.direction,onSort:key=>{const direction=options.sort===key&&options.direction==="asc"?"desc":"asc";router.push(adminBooksHref({...options,sort:key as NormalizedAdminBookOptions["sort"],direction}),{scroll:false});}}}/></div>}
      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground"><span>Menampilkan {total ? (current-1)*options.pageSize+1 : 0}–{Math.min(current*options.pageSize,total)} dari {total} data</span><label className="flex items-center gap-2">Baris per halaman<Select value={String(options.pageSize)} items={ADMIN_BOOK_PAGE_SIZES.map(size=>({value:String(size),label:String(size)}))} onValueChange={value=>{if(value)router.push(adminBooksHref({...options,pageSize:Number(value) as NormalizedAdminBookOptions["pageSize"]}),{scroll:false});}}><SelectTrigger aria-label="Baris per halaman" className="h-10 w-20"><SelectValue/></SelectTrigger><SelectContent>{ADMIN_BOOK_PAGE_SIZES.map(size=><SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent></Select></label></div>
        <nav aria-label="Halaman buku" className="flex items-center gap-1"><Button nativeButton={false} render={<Link href={href(Math.max(1,current-1))} aria-disabled={current<=1} tabIndex={current<=1?-1:undefined}/>} variant="outline" size="icon" aria-label="Halaman sebelumnya" className="size-10 aria-disabled:pointer-events-none aria-disabled:opacity-40"><ChevronLeft/></Button><span className="min-w-24 text-center text-sm text-muted-foreground">Halaman {current} dari {pages}</span><Button nativeButton={false} render={<Link href={href(Math.min(pages,current+1))} aria-disabled={current>=pages} tabIndex={current>=pages?-1:undefined}/>} variant="outline" size="icon" aria-label="Halaman berikutnya" className="size-10 aria-disabled:pointer-events-none aria-disabled:opacity-40"><ChevronRight/></Button></nav>
      </div>
  </div>;
}
