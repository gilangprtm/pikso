import Link from "next/link";
import { Activity, ArrowRight, ArrowUpRight, BookOpen, Clock, Eye, FileText, Plus } from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/session";
import { getDb } from "@/lib/db";
import { adminBookFormHref } from "@/lib/admin-book-return";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard admin" };
export default async function Dashboard() {
  await requireAdmin();
  const { rows } = await getDb().query<{total:string;published:string;draft:string}>("SELECT count(*) AS total, count(*) FILTER(WHERE status='published') AS published, count(*) FILTER(WHERE status='draft') AS draft FROM books");
  const stats = rows[0];
  return <div className="min-w-0 space-y-6 pb-[calc(2rem+env(safe-area-inset-bottom))] md:space-y-8">
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="mb-1 flex items-center gap-2"><Activity className="size-5 text-primary"/><h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1></div><p className="text-sm text-muted-foreground">Ringkasan cerita dan koleksi Pikso Studio.</p></div>
      <Badge variant="outline" className="hidden h-9 items-center gap-2 bg-card px-3 text-xs text-muted-foreground sm:inline-flex"><Clock className="size-3.5"/><span>{new Date().toLocaleDateString("id-ID", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}</span></Badge>
    </div>
    <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
      <StatCard title="Semua cerita" value={stats.total} icon={BookOpen}/><StatCard title="Sudah terbit" value={stats.published} icon={Eye}/><StatCard title="Masih draft" value={stats.draft} icon={FileText}/>
    </div>
    <div className="grid min-w-0 gap-6 lg:grid-cols-3">
      <div className="min-w-0 space-y-6 lg:col-span-2">
        <Card><CardHeader className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-2"><BookOpen className="size-4 shrink-0 text-primary"/><CardTitle className="truncate text-base">Rak Cerita Pikso</CardTitle></div><Button nativeButton={false} variant="link" render={<Link href="/admin/books"/>} className="min-h-11 shrink-0">Kelola buku<ArrowRight className="size-3.5"/></Button></CardHeader><CardContent><div className="px-1 py-8 text-center"><h2 className="text-base font-semibold text-card-foreground">Dunia kecil yang terus bertumbuh.</h2><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Kelola koleksi dan hadirkan petualangan baru untuk para pembaca kecil.</p></div></CardContent></Card>
        <section><h2 className="mb-4 text-base font-semibold text-foreground">Aksi Cepat</h2><div className="grid gap-3 sm:grid-cols-2">{[
          { label:"Tambah Buku", href:adminBookFormHref("/admin/books/new","/admin"), icon:Plus, description:"Unggah PDF; sampul dibuat otomatis.", color:"bg-muted text-primary" },
          { label:"Kelola Buku", href:"/admin/books", icon:BookOpen, description:"Perbarui cerita dan status publikasi.", color:"bg-background text-secondary" },
        ].map(({label,href,icon:Icon,description,color}) => <Button key={href} nativeButton={false} render={<Link href={href}/>} variant="outline" className="group h-auto min-w-0 items-start justify-start gap-4 whitespace-normal rounded-2xl bg-card p-4 text-left transition-all duration-200 hover:border-primary/30 hover:shadow-sm"><div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon className="size-5"/></div><div className="min-w-0 flex-1"><p className="text-sm font-medium text-card-foreground group-hover:text-primary">{label}</p><p className="mt-0.5 text-xs text-muted-foreground">{description}</p></div><ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground/40 group-hover:text-primary"/></Button>)}</div></section>
      </div>
      <Card className="admin-guide relative self-start overflow-hidden border-0"><CardContent className="relative z-10 p-5"><div className="mb-3 flex items-center gap-2"><div className="flex size-8 items-center justify-center rounded-lg bg-secondary"><Plus className="size-4 text-white"/></div><h2 className="text-sm font-semibold text-white">Mulai dari mana?</h2></div><p className="mb-4 text-sm leading-relaxed text-primary-foreground">Unggah PDF cerita. Sampul otomatis diambil dari halaman pertama. Simpan sebagai draft, lalu terbitkan saat cerita sudah siap.</p><Button nativeButton={false} render={<Link href={adminBookFormHref("/admin/books/new","/admin")}/>} className="min-h-11 bg-card text-primary hover:bg-muted">Tambah Buku<ArrowRight className="size-3.5"/></Button></CardContent></Card>
    </div>
  </div>;
}
