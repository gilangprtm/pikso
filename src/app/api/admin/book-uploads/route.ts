import { NextResponse } from "next/server";
import { authorizeAdmin, boundedJson, apiError, HttpError } from "@/lib/api";
import { UploadSizeError } from "@/lib/validation";
import { createUploadSession, UploadSessionError } from "@/lib/resumable-upload";
export const runtime="nodejs";
export async function POST(request:Request){
  try{
    const session=await authorizeAdmin(request);
    const data=await boundedJson(request) as {size?:unknown}|null;
    if(!data||typeof data.size!=="number")throw new HttpError(400,"Ukuran file tidak valid.");
    return NextResponse.json(await createUploadSession(session.user.id,data.size),{status:201});
  }catch(error){if(error instanceof UploadSessionError)return NextResponse.json({error:error.message},{status:error.status});if(error instanceof UploadSizeError)return NextResponse.json({error:error.message},{status:413});return apiError(error);}
}
