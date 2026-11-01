import { NextResponse } from "next/server";
import { authorizeAdmin, apiError } from "@/lib/api";
import { getUploadStatus, deleteUploadSession, UploadSessionError } from "@/lib/resumable-upload";
export const runtime="nodejs";
type Context={params:Promise<{id:string}>};
function failure(error:unknown){if(error instanceof UploadSessionError)return NextResponse.json({error:error.message},{status:error.status});return apiError(error);}
export async function GET(request:Request,context:Context){
  try{const session=await authorizeAdmin(request);const {id}=await context.params;return NextResponse.json(await getUploadStatus(session.user.id,id),{headers:{"Cache-Control":"no-store"}});}catch(error){return failure(error);}
}
export async function DELETE(request:Request,context:Context){
  try{const session=await authorizeAdmin(request);const {id}=await context.params;await deleteUploadSession(session.user.id,id);return NextResponse.json({ok:true});}catch(error){return failure(error);}
}
