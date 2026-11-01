import Link from "next/link";
import { LoginForm } from "@/components/admin/login-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Login admin", robots: { index: false, follow: false } };
export default function LoginPage() {
  return <main className="school-admin admin-auth-screen"><Card className="w-[min(400px,calc(100vw-38px))] max-h-[calc(100dvh-24px)] gap-5 overflow-y-auto rounded-2xl bg-card py-6"><CardHeader className="px-6"><Link href="/" className="brand mb-5 w-fit">pikso<span>✿</span></Link><CardTitle><h1 className="text-[28px] leading-tight tracking-tight">Selamat datang kembali.</h1></CardTitle><CardDescription>Masuk untuk merawat rak cerita Pikso.</CardDescription></CardHeader><CardContent className="px-6"><LoginForm/></CardContent><CardFooter className="border-0 bg-card px-6 pb-0"><Button nativeButton={false} variant="link" render={<Link href="/"/>} className="h-auto p-0 text-xs text-muted-foreground">← Kembali ke beranda</Button></CardFooter></Card></main>;
}
