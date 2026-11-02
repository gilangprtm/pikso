import { NextResponse } from "next/server";
import { getPublicBook } from "@/lib/books";
import { accessCookieName, allowAccessAttempt, clearAccessAttempts, canReadBook, getBookAccess, issueAccessProof, validAccessProof, verifyAccessCode } from "@/lib/book-access";
import { boundedJson, HttpError } from "@/lib/api";
export const runtime = "nodejs";
type Context = { params: Promise<{slug:string}> };
const noStore = { "Cache-Control": "private, no-store" };
export async function POST(request:Request, context:Context) {
  try {
    const expected = new URL(process.env.BETTER_AUTH_URL ?? request.url).origin;
    if (request.headers.get("origin") !== expected) return NextResponse.json({error:"Origin tidak diizinkan."},{status:403,headers:noStore});
    const book = await getPublicBook((await context.params).slug);
    if (!book) return NextResponse.json({error:"Cerita tidak ditemukan."},{status:404,headers:noStore});
    const data = await boundedJson(request, 2048) as {code?:unknown;proof?:unknown};
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new HttpError(400,"Permintaan tidak valid.");
    if (!book.access_locked) return NextResponse.json({ok:true},{headers:noStore});
    const access = await getBookAccess(book.id);
    if (!access) return NextResponse.json({error:"Cerita tidak ditemukan."},{status:404,headers:noStore});
    if (!access.access_code_hash) return NextResponse.json({ok:true},{headers:noStore});
    let permitted = await canReadBook(book, request.headers);
    if (!permitted && typeof data.proof === "string") permitted = validAccessProof(access,data.proof);
    if (!permitted && typeof data.code === "string" && data.code.length > 0 && data.code.length <= 128) {
      // Per-book cap does not trust forwarded IP headers; bounded single-host protection.
      if (!allowAccessAttempt(book.id)) return NextResponse.json({error:"Terlalu banyak percobaan. Coba lagi sebentar."},{status:429,headers:{...noStore,"Retry-After":"60"}});
      permitted = await verifyAccessCode(access,data.code);
      if(permitted)clearAccessAttempts(book.id);
    }
    if (!permitted) return NextResponse.json({error:"Kode akses tidak benar. Silakan coba lagi."},{status:403,headers:noStore});
    const proof = issueAccessProof(access);
    const response = NextResponse.json({ok:true,proof},{headers:noStore});
    // Session cookie is restored from the non-expiring browser proof, never a timed grant.
    response.cookies.set(accessCookieName(book.id),proof,{httpOnly:true,sameSite:"lax",secure:new URL(expected).protocol==="https:",path:"/"});
    return response;
  } catch(error) {
    return NextResponse.json({error:error instanceof HttpError?error.message:"Akses belum dapat diperiksa. Coba lagi."},{status:error instanceof HttpError?error.status:503,headers:noStore});
  }
}
