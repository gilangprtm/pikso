import { NextResponse } from "next/server";
import { authorizeAdmin, boundedJson, apiError, HttpError } from "@/lib/api";
import { finalizeBookUpload, BookFinalizeError } from "@/lib/book-finalize";
export const runtime="nodejs";
export async function POST(request:Request){
  try{const session=await authorizeAdmin(request);const data=await boundedJson(request);return NextResponse.json(await finalizeBookUpload(session.user.id,data));}
  catch(error){if(error instanceof BookFinalizeError)return NextResponse.json({error:error.message},{status:error.status});if(error instanceof HttpError)return apiError(error);console.error("Book finalize failed",error instanceof Error?error.name:"Unknown");return NextResponse.json({error:"Buku belum tersimpan. Upload tetap tersedia untuk dicoba lagi."},{status:500});}
}
