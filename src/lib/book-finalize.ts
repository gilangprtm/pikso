import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";
import { bookInput, MAX_PDF_BYTES, safeError, validateUploadSize } from "@/lib/validation";
import { createPdfCover } from "@/lib/cover-upload";
import { saveUpload, removeStoredFile } from "@/lib/storage";
import { writeBook } from "@/lib/book-write";
import { assembleUpload, clearPreparedUpload, completeUploadSession, prepareUploadSession, readUploadSession, UploadSessionError, withUploadLock } from "@/lib/resumable-upload";

export class BookFinalizeError extends Error { constructor(public status:number,message:string){super(message);} }
export async function finalizeBookUpload(ownerId:string, value:unknown) {
  const data=value as Record<string,unknown>|null;
  if(!data||typeof data.uploadId!=="string")throw new BookFinalizeError(400,"Sesi upload tidak valid.");
  const parsed=bookInput.safeParse(data);
  if(!parsed.success)throw new BookFinalizeError(400,safeError(parsed.error));
  const id=data.uploadId;
  const metadataHash=createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex");
  return withUploadLock(id,async()=>{
    let session=await readUploadSession(ownerId,id);
    const prior=await getDb().query<{id:string;slug:string;title:string;pdf_path:string}>("SELECT id,slug,title,pdf_path FROM books WHERE id=$1",[id]);
    if(prior.rows[0]){
      if(session.metadataHash!==metadataHash || prior.rows[0].slug!==parsed.data.slug||prior.rows[0].title!==parsed.data.title)throw new BookFinalizeError(409,"Sesi ini sudah dipakai untuk menyimpan buku lain.");
      if(!session.completed)await completeUploadSession(ownerId,id);
      return {ok:true,idempotent:true};
    }
    if(session.completed)throw new BookFinalizeError(409,"Sesi upload sudah selesai, tetapi buku tidak ditemukan. Hubungi admin.");
    if(session.prepared && session.metadataHash!==metadataHash)throw new BookFinalizeError(409,"Detail buku berubah setelah proses simpan dimulai. Muat ulang daftar buku untuk memastikan hasilnya.");
    if(!session.prepared){
      const pdfBytes=await assembleUpload(ownerId,id);
      validateUploadSize(pdfBytes.byteLength,MAX_PDF_BYTES);
      if(new TextDecoder().decode(pdfBytes.slice(0,5))!=="%PDF-")throw new BookFinalizeError(400,"Isi file bukan PDF yang valid.");
      const {cover,pageCount}=await createPdfCover(pdfBytes);
      let stagedCover:Awaited<ReturnType<typeof saveUpload>>|undefined;
      let stagedPdf:Awaited<ReturnType<typeof saveUpload>>|undefined;
      try{
        stagedCover=await saveUpload("covers",cover,"webp");
        stagedPdf=await saveUpload("books",pdfBytes,"pdf");
        await prepareUploadSession(ownerId,id,{pdf:stagedPdf.filename,cover:stagedCover.filename,pages:pageCount,sourceChecksum:createHash("sha256").update(pdfBytes).digest("hex")},metadataHash);
      }catch(error){
        await Promise.all([stagedPdf?removeStoredFile("books",stagedPdf.filename):Promise.resolve(),stagedCover?removeStoredFile("covers",stagedCover.filename):Promise.resolve()]).catch(()=>{});
        throw error;
      }
      session=await readUploadSession(ownerId,id);
    }
    try{
      await writeBook(id,parsed.data,session.prepared!);
    }catch(error){
      // COMMIT may have succeeded even when its response was lost. Never remove
      // a committed PDF. An unavailable DB leaves files for reconciliation.
      let committed;
      try{committed=await getDb().query<{id:string}>("SELECT id FROM books WHERE id=$1",[id]);}
      catch{throw new BookFinalizeError(503,"Status penyimpanan belum dapat dipastikan. Tekan Simpan cerita lagi untuk memeriksa sesi yang sama.");}
      if(committed.rows[0]){await completeUploadSession(ownerId,id);return {ok:true,idempotent:true};}
      await Promise.all([removeStoredFile("books",session.prepared!.pdf),removeStoredFile("covers",session.prepared!.cover)]).catch(()=>console.error("Upload cleanup needs attention"));
      await clearPreparedUpload(ownerId,id);
      if((error as {code?:string}).code==="23505")throw new BookFinalizeError(409,"URL cerita tersebut sudah digunakan.");
      throw error;
    }
    await completeUploadSession(ownerId,id);
    return {ok:true,idempotent:false};
  }).catch(error=>{
    if(error instanceof UploadSessionError)throw new BookFinalizeError(error.status,error.message);
    throw error;
  });
}
