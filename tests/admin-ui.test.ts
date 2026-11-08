import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { Sidebar } from "../src/components/admin/Sidebar";
import { BookForm } from "../src/components/admin/book-form";
import { BooksTable } from "../src/components/admin/BooksTable";
import { StatCard } from "../src/components/admin/StatCard";
import { BookOpen } from "lucide-react";
import { AdminWorkspace } from "../src/components/admin/AdminWorkspace";
import { LoginForm } from "../src/components/admin/login-form";
import { AdminBookActions } from "../src/components/admin/AdminBookActions";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch: async () => {}, bfcacheId:"test" };
function render(element: React.ReactNode, pathname = "/admin") {
  return renderToStaticMarkup(createElement(AppRouterContext.Provider, { value: router }, createElement(PathnameContext.Provider, {value: pathname}, element)));
}

test("cover route remains read-only and server accepts only the PDF source upload", () => {
  const route = readFileSync(resolve(process.cwd(), "src/app/api/admin/books/[id]/cover/route.ts"), "utf8");
  assert.match(route, /export async function GET/);
  assert.doesNotMatch(route, /export async function PUT|export async function POST/);
  const upload = readFileSync(resolve(process.cwd(), "src/app/api/admin/books/route.ts"), "utf8");
  assert.match(upload, /createPdfCover\(pdfBytes\)/);
  assert.match(upload, /storedCover = await saveUpload\("covers", cover, "webp"\)/);
  assert.doesNotMatch(upload, /PDFDocument\.load/);
  const formSource = readFileSync(resolve(process.cwd(), "src/components/admin/book-form.tsx"), "utf8");
  assert.match(formSource, /Mengunggah PDF/);
  assert.match(formSource, /Memproses PDF dan menyimpan/);
  assert.doesNotMatch(upload, /form\.get\("cover"\)|MAX_COVER_BYTES/);
});

test("Schoolweb sidebar has only Dashboard and Kelola Buku and activates nested book routes", () => {
  const html = render(createElement(Sidebar, {collapsed:false, mobileOpen:false, userName:"Admin Pikso", onMobileClose() {}}), "/admin/books/new");
  const menus = [...html.matchAll(/<nav[^>]*aria-label="Navigasi admin"[^>]*>(.*?)<\/nav>/g)].map(match => match[1]);
  assert.equal(menus.length, 1); // mobile navigation is rendered by the shadcn Sheet when opened
  for (const menu of menus) {
    assert.equal((menu.match(/<a /g) || []).length, 2);
    assert.match(menu, /href="\/admin"/);
    assert.match(menu, /href="\/admin\/books"/);
    assert.match(menu, /aria-current="page"[^>]*>.*?Kelola Buku/);
    assert.doesNotMatch(menu, /Tambah|Lihat website|Keluar/);
  }
  assert.doesNotMatch(html, /href="\/admin\/books\/new"/);
  assert.match(html, /aria-label="Keluar"/);
});

test("mobile sidebar uses the accessible shadcn Sheet and explicit close control", () => {
  const source = readFileSync(resolve(process.cwd(), "src/components/admin/AdminWorkspace.tsx"), "utf8");
  const sidebar = readFileSync(resolve(process.cwd(), "src/components/admin/Sidebar.tsx"), "utf8");
  assert.match(source, /<Sheet open=\{mobileOpen\} onOpenChange=\{setMobileOpen\}>/);
  assert.match(source, /<SheetContent[^>]*side="left"[^>]*lg:hidden/);
  assert.match(source, /finalFocus=\{menuButtonRef\}/);
  const workspaceProps = {userName:"Admin Pikso", children:"Konten admin"};
  const workspace = render(createElement(AdminWorkspace, workspaceProps));
  assert.doesNotMatch(workspace, /data-slot="sheet-content"|role="dialog"/);
  assert.match(workspace, /aria-expanded="false"/);
  assert.match(workspace, /aria-controls="admin-sidebar-drawer"/);
  assert.match(workspace, /Konten admin/);
  assert.match(sidebar, /aria-label="Tutup menu navigasi"/);
  const closed = render(createElement(Sidebar, {collapsed:false, mobileOpen:false, userName:"Admin Pikso", onMobileClose() {}}));
  assert.doesNotMatch(closed, /role="dialog"/);
});

test("book form requires only PDF, explains automatic covers and retains limits and defaults", () => {
  const html = render(createElement(BookForm, {mode:"create"}));
  assert.match(html, /type="file"[^>]*required=""[^>]*name="pdf"|type="file"[^>]*name="pdf"[^>]*required=""/);
  assert.doesNotMatch(html, /name="cover"/);
  assert.equal((html.match(/type="file"/g) || []).length, 1);
  assert.match(html, /Sampul persegi otomatis dibuat dari halaman pertama PDF/);
  assert.match(html, /maxLength="120"/);
  assert.match(html, /maxLength="1500"/);
  assert.match(html, /data-slot="select-trigger"/);
  const statusSource = readFileSync(resolve(process.cwd(), "src/components/admin/book-form.tsx"), "utf8");
  assert.match(statusSource, /Upload dimulai saat PDF dipilih/i);
  assert.match(statusSource, /uploadPdfInChunks\(file/);
  assert.match(statusSource, /finalizeUploadedBook\(uploadId,values\)/);
  assert.match(statusSource, /Lanjutkan upload/);
  assert.match(statusSource, /className="w-full justify-between border-input bg-card px-2\.5 py-2 text-base whitespace-normal data-\[size=default\]:h-10 sm:text-sm/);
  assert.match(statusSource, /validateUploadSize\(file\.size, MAX_PDF_BYTES\)/);
  assert.match(statusSource, /onChange=\{event => \{ const file = event\.currentTarget\.files\?\.\[0\];/);
  assert.match(html, /maks\. 50 MiB/);
  assert.doesNotMatch(statusSource, /min-h-11 w-full whitespace-normal/);
  assert.match(html, /data-slot="select-value"/);
  assert.match(html, /data-slot="select-value"[^>]*>Draft — hanya admin<\/span>/);
  assert.match(html, /name="status" value="draft"/);
  assert.match(html, /type="button"[^>]*>Batal/);
  assert.match(html, /type="submit"/);
  const edit = render(createElement(BookForm, {mode:"edit",id:"sample",initial:{title:"Cerita",slug:"cerita",author:"Studio",description:"",categories:["Petualangan"],status:"published"}}));
  assert.doesNotMatch(edit, /name="pdf"|name="cover"|type="file"/);
  assert.match(edit, /book-cover-preview aspect-square w-full max-w-72.*object-contain/);
  const theme = readFileSync(resolve(process.cwd(), "src/app/admin/admin-theme.css"), "utf8");
  assert.match(theme, /img\.book-cover-preview \{[^}]*aspect-ratio:1\/1;[^}]*object-fit:contain/);
  assert.doesNotMatch(theme, /img\.book-cover-preview \{[^}]*object-fit:cover/);
  assert.match(statusSource, /toast\.success\("Perubahan berhasil disimpan\."\)/);
  assert.match(statusSource, /toast\.success\("Cerita berhasil ditambahkan\."\)/);
  assert.match(statusSource, /router\.push\(returnTo\)/);
  assert.doesNotMatch(statusSource, /setSuccess\(|Perubahan berhasil disimpan\.<\/AlertDescription>/);
  const workspaceSource = readFileSync(resolve(process.cwd(), "src/components/admin/AdminWorkspace.tsx"), "utf8");
  assert.match(workspaceSource, /<Toaster position="top-right" richColors\/>/);
  assert.match(edit, /data-slot="select-value"[^>]*>Terbit — dapat dibaca publik<\/span>/);
  assert.match(edit, /name="status" value="published"/);
  assert.match(edit, /Petualangan/);
  const pickerSource = readFileSync(resolve(process.cwd(), "src/components/admin/category-combobox.tsx"), "utf8");
  assert.match(edit, /Petualangan/);
  assert.match(pickerSource, /Pilih atau ketik kategori/);
  assert.match(pickerSource, /placeholder="Cari atau ketik kategori baru/);
  assert.match(pickerSource, /<Combobox multiple/);
  assert.match(pickerSource, /<ComboboxTrigger/);
  assert.match(pickerSource, /className="h-10 w-full min-w-0 justify-between border-input bg-card px-2\.5 py-2 text-left text-base font-normal sm:text-sm/);
  assert.doesNotMatch(pickerSource, /h-11 w-full min-w-0/);
  assert.match(pickerSource, /<ComboboxInput ref=\{search\} showTrigger=\{false\} className="h-10/);
  assert.match(pickerSource, /\[&>span\.absolute\]:hidden/);
  assert.match(pickerSource, /\[&_\*\]:text-primary-foreground!/);
  assert.match(pickerSource, /<ComboboxList[^>]*overflow-y-auto/);
  assert.match(pickerSource, /<Checkbox checked=\{value\.includes\(item\)\}/);
  assert.match(pickerSource, /<ComboboxEmpty/);
  assert.doesNotMatch(edit, /id="category"/);
  assert.match(edit, /Simpan perubahan/);
  for (const form of [html, edit]) {
    const actions = form.match(/<div class="admin-form-actions">([\s\S]*?)<\/div>/)?.[1];
    assert.ok(actions, "book form must retain its action buttons");
    const buttons = [...actions.matchAll(/<button\b([^>]*)>([^<]*)<\/button>/g)];
    assert.equal(buttons.length, 2);
    for (const [, attributes] of buttons) {
      assert.match(attributes, /data-slot="button"/);
      assert.match(attributes, /class="[^"]*\bh-10\b/);
      assert.doesNotMatch(attributes, /min-h-11/);
    }
    assert.match(actions, /type="button"[^>]*>Batal/);
    assert.match(actions, /type="submit"[^>]*>Simpan (cerita|perubahan)/);
  }
});

test("book table renders configured sales links safely and an em-dash when empty", () => {
  const options={pageSize:10 as const,search:"",status:"all" as const,sort:"created_at" as const,direction:"desc" as const};
  const base={id:"one",title:"Buku Satu",author:"Studio",category:"Imajinasi",status:"draft" as const,pdf_pages:12};
  const configured=render(createElement(BooksTable,{books:[{...base,sales_link:"https://shop.example/book?from=admin"}],current:1,pages:1,total:1,options}));
  assert.match(configured,/<a[^>]*href="https:\/\/shop\.example\/book\?from=admin"[^>]*target="_blank"[^>]*rel="noopener noreferrer"[^>]*>/);
  const empty=render(createElement(BooksTable,{books:[{...base,sales_link:""}],current:1,pages:1,total:1,options}));
  assert.match(empty,/—/);
  assert.doesNotMatch(empty,/<a[^>]*href=""/);
});

test("book table renders rows, status and management actions while preserving server pagination", () => {
  const options={pageSize:10 as const,search:"",status:"all" as const,sort:"created_at" as const,direction:"desc" as const};
  const html = render(createElement(BooksTable, {books:[{id:"one",title:"Buku Satu",author:"Studio",category:"Imajinasi",status:"draft",pdf_pages:12,sales_link:""}],current:2,pages:3,total:21,options}));
  for (const text of ["Buku Satu","Studio","Imajinasi","Draft","12","Baris per halaman"]) assert.ok(html.includes(text));
  assert.match(html,/aria-label="Aksi Buku Satu"/);
  assert.match(html,/pageSize=10/);
  const tableSource = readFileSync(resolve(process.cwd(), "src/components/admin/BooksTable.tsx"), "utf8");
  assert.match(tableSource, /columns=\{bookColumns\(href\(current\)\)\}/);
  assert.match(tableSource, /returnTo=\{returnTo\}/);
  assert.match(html,/Menampilkan 11–20 dari 21 data/);
  assert.match(html,/aria-label="Halaman buku"/);
  assert.match(html,/overflow-x-auto/);
  const empty = render(createElement(BooksTable,{books:[],current:1,pages:1,total:0,options}));
  assert.match(empty,/Petualangan pertama dimulai di sini\./);
  assert.match(empty,/sampul dibuat otomatis dari halaman pertama/);
  assert.doesNotMatch(empty,/Tambah Cerita|href="\/admin\/books\/new"/);
  assert.doesNotMatch(empty,/<table/);
  assert.match(empty,/Menampilkan 0–0 dari 0 data/);
  const page = readFileSync(resolve(process.cwd(), "src/app/admin/(workspace)/books/page.tsx"), "utf8");
  assert.match(page, /actionLabel="Tambah Buku" actionHref=\{adminBookFormHref\("\/admin\/books\/new",adminBooksHref\(options,data.current\)\)\}/);
});

test("single-line admin inputs and selects use the shared 40px control height", () => {
  const input = readFileSync(resolve(process.cwd(), "src/components/ui/input.tsx"), "utf8");
  const select = readFileSync(resolve(process.cwd(), "src/components/ui/select.tsx"), "utf8");
  const form = readFileSync(resolve(process.cwd(), "src/components/admin/book-form.tsx"), "utf8");
  const books = readFileSync(resolve(process.cwd(), "src/components/admin/BooksTable.tsx"), "utf8");
  const login = readFileSync(resolve(process.cwd(), "src/components/admin/login-form.tsx"), "utf8");
  assert.match(input, /h-10 w-full min-w-0/);
  assert.match(select, /data-\[size=default\]:h-10 data-\[size=sm\]:h-10/);
  assert.doesNotMatch(select, /data-\[size=(?:default|sm)\]:h-[78]\b/);
  const nativeSelect = readFileSync(resolve(process.cwd(), "src/components/ui/native-select.tsx"), "utf8");
  const group = readFileSync(resolve(process.cwd(), "src/components/ui/input-group.tsx"), "utf8");
  const combobox = readFileSync(resolve(process.cwd(), "src/components/ui/combobox.tsx"), "utf8");
  assert.match(nativeSelect, /h-10 w-full min-w-0/);
  assert.match(nativeSelect, /data-\[size=sm\]:h-10/);
  assert.match(group, /group\/input-group relative flex h-10/);
  assert.match(group, /h-full flex-1 rounded-none border-0/);
  assert.match(combobox, /has-\[input\]:h-10/);
  assert.match(form, /data-\[size=default\]:h-10/);
  assert.match(books, /SelectTrigger id="book-status" className="h-10/);
  assert.match(books, /<Input id="book-search"[^>]*className="h-10/);
  assert.match(login, /name="email"[^>]*className="h-10"/);
  assert.match(login, /name="password"[^>]*className="h-10"/);
});

test("login uses shadcn fields and retains required credential names and autocomplete", () => {
  const html = render(createElement(LoginForm));
  assert.match(html, /data-slot="field"/);
  assert.match(html, /data-slot="input"[^>]*required=""[^>]*autoComplete="username"[^>]*name="email"/);
  assert.match(html, /type="password"[^>]*required=""[^>]*autoComplete="current-password"[^>]*name="password"/);
  assert.match(html, /type="submit"[^>]*data-slot="button"/);
});

test("book removal requires a shadcn confirmation dialog rather than native confirm", () => {
  const html = render(createElement(AdminBookActions, {id:"sample", title:"Buku Uji"}));
  assert.match(html, /aria-haspopup="menu"/);
  assert.match(html, /aria-label="Aksi Buku Uji"/);
  const source = readFileSync(resolve(process.cwd(), "src/components/admin/AdminBookActions.tsx"), "utf8");
  assert.doesNotMatch(source, /window\.confirm/);
  for (const action of ["Lihat","Edit","Hapus"]) assert.match(source,new RegExp(`>${action}<`));
  assert.match(source,/AlertDialogTrigger/);
  assert.match(source, /<AlertDialogCancel disabled=\{busy\}>Batal/);
  assert.match(source, /<AlertDialogAction[^>]*disabled=\{busy\} onClick=\{removeBook\}/);
  assert.match(source, /if\(!response\.ok\)throw new Error\(\);setOpen\(false\);router\.refresh\(\)/);
});

test("admin reader opts into shadcn controls without changing the public reader default", () => {
  const source = readFileSync(resolve(process.cwd(), "src/components/reader/flipbook.tsx"), "utf8");
  const page = readFileSync(resolve(process.cwd(), "src/app/admin/(workspace)/books/[id]/preview/page.tsx"), "utf8");
  assert.match(page, /<ReaderLoader adminPreview/);
  assert.match(source, /adminPreview = false/);
  assert.match(source, /const ReaderButton = adminPreview \? Button : "button"/);
});

test("Schoolweb StatCard retains title and complete count", () => {
  const html = render(createElement(StatCard,{title:"Semua cerita",value:12345,icon:BookOpen}));
  assert.match(html,/Semua cerita/);
  assert.match(html,/12345/);
});
