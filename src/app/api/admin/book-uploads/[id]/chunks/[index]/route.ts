import { NextResponse } from "next/server";
import { authorizeAdmin, boundedBytes, apiError, HttpError } from "@/lib/api";
import { storeUploadChunk, UploadSessionError, UPLOAD_CHUNK_BYTES } from "@/lib/resumable-upload";
export const runtime="nodejs";
type Context={params:Promise<{id:string;index:string}>};
export async function PUT(request:Request,context:Context){
  try{
    const session=await authorizeAdmin(request);const {id,index:raw}=await context.params;
    const index=Number(raw);if(!Number.isSafeInteger(index)||index<0)throw new HttpError(400,"Nomor bagian tidak valid.");
    const checksum=request.headers.get("x-chunk-sha256")??"";
    const bytes=await boundedBytes(request,UPLOAD_CHUNK_BYTES);
    return NextResponse.json(await storeUploadChunk(session.user.id,id,index,bytes,checksum));
  }catch(error){if(error instanceof UploadSessionError)return NextResponse.json({error:error.message},{status:error.status});return apiError(error);}
}
