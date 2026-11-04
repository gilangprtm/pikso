import { NextResponse } from "next/server";
import { authorizeAdmin, apiError, HttpError } from "@/lib/api";
import { getDb } from "@/lib/db";
import { decryptAccessCode } from "@/lib/book-access";
import { isUuid } from "@/lib/validation";
export const runtime = "nodejs";
export async function GET(request: Request, {params}:{params:Promise<{id:string}>}) {
  try {
    await authorizeAdmin(request);
    const {id}=await params;
    if(!isUuid(id)) throw new HttpError(404,"Buku tidak ditemukan.");
    const result=await getDb().query<{access_code_hash:string|null}>("SELECT access_code_hash FROM books WHERE id=$1",[id]);
    if(!result.rows.length) throw new HttpError(404,"Buku tidak ditemukan.");
    const value=result.rows[0].access_code_hash;
    return NextResponse.json({accessCode:decryptAccessCode(value),legacy:!!value&&!value.startsWith("enc:v1:")},{headers:{"Cache-Control":"private, no-store"}});
  } catch(error) { return apiError(error); }
}
