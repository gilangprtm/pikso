"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TextField, TextareaField } from "@/components/admin/forms";
import { Card } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryCombobox } from "@/components/admin/category-combobox";
import { cancelPdfUpload, finalizeUploadedBook, uploadPdfInChunks, uploadResumeKey, type PdfUploadProgress } from "@/lib/resumable-upload-client";
import { MAX_PDF_BYTES, validateUploadSize } from "@/lib/validation";
import { adminBookReturnHref } from "@/lib/admin-book-return";
import { toast } from "sonner";
const publicationStatuses = [
  { value: "draft", label: "Draft — hanya admin" },
  { value: "published", label: "Terbit — dapat dibaca publik" },
];
type Values = { title: string; slug: string; description: string; author: string; categories: string[]; accessCode?: string; removeAccessCode?: boolean; status: "draft" | "published" };
export function BookForm({ mode, id, initial, categories = [], accessLocked = false }: { mode: "create" | "edit"; id?: string; initial?: Values; categories?: string[]; accessLocked?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = adminBookReturnHref(searchParams?.get("returnTo"));
  const [values,setValues] = useState<Values>(initial ?? { title:"",slug:"",description:"",author:"",categories:[],accessCode:"",status:"draft" });
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const [uploadProgress,setUploadProgress] = useState<PdfUploadProgress | null>(null);
  const [uploadId,setUploadId] = useState("");
  const [selectedFile,setSelectedFile] = useState<File | null>(null);
  const uploadController = useRef<AbortController | null>(null);
  const resumeKey = useRef("");
  useEffect(() => () => { uploadController.current?.abort(); }, []);
  async function startPdfUpload(file: File) {
    uploadController.current?.abort();
    const controller = new AbortController(); uploadController.current = controller;
    setSelectedFile(file); setError(""); setUploadProgress({phase:"uploading",percent:0});
    const key = uploadResumeKey(file);
    const oldKey=resumeKey.current; resumeKey.current = key;
    if(oldKey && oldKey!==key)try{localStorage.removeItem(oldKey);}catch{}
    let previous = oldKey === key ? uploadId : "";
    try { previous = localStorage.getItem(key) ?? previous; } catch {}
    if (uploadId && uploadId !== previous) void cancelPdfUpload(uploadId).catch(() => {});
    setUploadId(previous);
    try {
      const id = await uploadPdfInChunks(file,{signal:controller.signal,sessionId:previous || undefined,onSession: id => { if(controller.signal.aborted)return; setUploadId(id); try { localStorage.setItem(key,id); } catch {} },onProgress: value => { if(!controller.signal.aborted)setUploadProgress(value); }});
      if (!controller.signal.aborted) { setUploadId(id); setError(""); setUploadProgress({phase:"ready",percent:100}); }
    } catch(cause) {
      if (!controller.signal.aborted && (cause as {name?:string})?.name !== "AbortError") { setError(cause instanceof Error ? cause.message : "Upload gagal. Coba lanjutkan kembali."); setUploadProgress(null); }
    }
  }
  async function cancelSelectedUpload() {
    uploadController.current?.abort();
    const id=uploadId;setUploadId("");setSelectedFile(null);setUploadProgress(null);
    try { if(resumeKey.current)localStorage.removeItem(resumeKey.current); if(id)await cancelPdfUpload(id); } catch {}
    const input=document.querySelector<HTMLInputElement>("#pdf");if(input)input.value="";
  }
  function update(name: "title" | "slug" | "description" | "author" | "status", value: string) { setValues(current => ({...current,[name]: value})); }
  function updateCategories(value: string[]) { setValues(current => ({...current,categories:value})); }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");setBusy(true);
    try {
      if (mode === "create") {
        if (!selectedFile || !uploadId || uploadProgress?.phase !== "ready") throw new Error("Tunggu sampai upload PDF selesai sebelum menyimpan.");
        await finalizeUploadedBook(uploadId,values);
        try { localStorage.removeItem(resumeKey.current); } catch {}
        setSelectedFile(null);setUploadId("");setUploadProgress(null);
        toast.success("Cerita berhasil ditambahkan.");
        router.push(returnTo);router.refresh();
      } else {
        const result = await fetch(`/api/admin/books/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)});
        const payload = await result.json();
        if (!result.ok) throw new Error(payload.error ?? "Gagal menyimpan.");
        toast.success("Perubahan berhasil disimpan.");
        router.push(returnTo);router.refresh();
      }
    } catch(cause) { setError(cause instanceof Error ? cause.message : "Gagal menyimpan."); }
    finally { setBusy(false); }
  }
  return <Card className="mx-auto w-full max-w-3xl p-0"><form className="book-editor" onSubmit={submit}>
    {mode === "create" ? <Field className="admin-form-field span-2"><FieldLabel htmlFor="pdf">File cerita (PDF, maks. 50 MiB; hingga 500 halaman)</FieldLabel><Input id="pdf" name="pdf" type="file" accept=".pdf,application/pdf" required aria-describedby="pdf-hint" disabled={busy} onChange={event => { const file = event.currentTarget.files?.[0]; if (!file) return; try { validateUploadSize(file.size, MAX_PDF_BYTES); void startPdfUpload(file); } catch (cause) { uploadController.current?.abort(); setUploadProgress(null); setSelectedFile(null); setError(cause instanceof Error ? cause.message : "Ukuran file PDF tidak valid."); event.currentTarget.value = ""; } }}/><FieldDescription id="pdf-hint" className="admin-form-hint">Upload dimulai saat PDF dipilih, dikirim per bagian, dan bisa dilanjutkan jika koneksi terputus. Sampul persegi otomatis dibuat dari halaman pertama PDF setelah Simpan cerita.</FieldDescription>{uploadProgress?.phase === "uploading" ? <div className="flex flex-wrap items-center gap-3 text-sm" role="status"><span>Mengunggah PDF… {uploadProgress.percent}%</span><Button type="button" variant="outline" onClick={() => void cancelSelectedUpload()}>Batalkan upload</Button></div> : null}{uploadProgress?.phase === "ready" ? <div className="text-sm" role="status">PDF siap disimpan. Lengkapi detail lalu pilih Simpan cerita.</div> : null}{error && selectedFile && uploadProgress === null ? <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => void startPdfUpload(selectedFile)}>Lanjutkan upload</Button><Button type="button" variant="outline" onClick={() => void cancelSelectedUpload()}>Buang upload</Button></div> : null}</Field> : null}
    <TextField id="title" label="Judul cerita" value={values.title} maxLength={120} required onChange={value=>{update("title",value);if(mode==="create")update("slug",value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""));}}/>
    <TextField id="slug" label="URL cerita" value={values.slug} maxLength={120} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" onChange={value=>update("slug",value)}/>
    <TextField id="author" label="Penulis" value={values.author} maxLength={100} onChange={value=>update("author",value)}/>
    <CategoryCombobox key={id ?? "new-book"} options={categories} value={values.categories} onChange={updateCategories} disabled={busy}/>
    <div className="span-2"><TextareaField label="Tentang cerita" value={values.description} maxLength={1500} rows={3} onChange={value=>update("description",value)}/></div>
    <Field className="admin-form-field"><FieldLabel htmlFor="accessCode">Kode akses <span className="font-normal text-muted-foreground">(opsional)</span></FieldLabel><Input id="accessCode" name="accessCode" type="text" autoComplete="off" maxLength={128} value={values.accessCode ?? ""} placeholder={mode === "edit" && accessLocked ? "Kosongkan untuk mempertahankan kode" : "Kosongkan agar cerita terbuka"} disabled={busy} onChange={event=>setValues(current=>({...current,accessCode:event.target.value,removeAccessCode:false}))}/><FieldDescription>Kode bersifat sensitif dan tidak ditampilkan kembali. Pada edit, biarkan kosong untuk mempertahankan kode saat ini.</FieldDescription>{mode === "edit" && accessLocked && <Button type="button" variant="outline" className="w-fit" disabled={busy} onClick={()=>setValues(current=>({...current,accessCode:"",removeAccessCode:true}))}>{values.removeAccessCode ? "Kode akan dihapus saat disimpan" : "Hapus kode akses"}</Button>}</Field>
    <Field className="admin-form-field"><FieldLabel htmlFor="status">Status publikasi</FieldLabel><Select name="status" items={publicationStatuses} value={values.status} onValueChange={value=>{if(value)update("status",value);}}><SelectTrigger id="status" className="w-full justify-between border-input bg-card px-2.5 py-2 text-base whitespace-normal data-[size=default]:h-10 sm:text-sm [&_[data-slot=select-value]]:min-w-0"><SelectValue/></SelectTrigger><SelectContent align="start" alignItemWithTrigger={false}>{publicationStatuses.map(status=><SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectContent></Select></Field>
    {mode === "edit" && id && <Field className="admin-form-field"><FieldTitle>Sampul saat ini</FieldTitle><img src={`/api/admin/books/${id}/cover`} alt="Sampul buku" className="book-cover-preview aspect-square w-full max-w-72 rounded-md bg-white object-contain"/><FieldDescription className="admin-form-hint">Buku baru memakai sampul otomatis dari halaman pertama PDF.</FieldDescription></Field>}
    {error&&<Alert variant="destructive" className="col-span-2"><AlertDescription>{error}</AlertDescription></Alert>}
    <div className="admin-form-actions"><Button type="button" variant="outline" disabled={busy} onClick={() => { void cancelSelectedUpload(); router.push("/admin/books"); }}>Batal</Button><Button type="submit" disabled={busy || mode === "create" && uploadProgress?.phase !== "ready"}>{busy ? mode === "create" ? "Memproses PDF dan menyimpan…" : "Menyimpan…" : mode==="create"?"Simpan cerita":"Simpan perubahan"}</Button></div>
  </form></Card>;
}
