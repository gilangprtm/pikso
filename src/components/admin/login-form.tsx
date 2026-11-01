"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
export function LoginForm() {
  const router = useRouter();
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  return <form className="login-form" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await fetch("/api/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
      if (!result.ok) { setError("Email atau kata sandi tidak cocok, atau layanan belum siap."); return; }
      router.push("/admin");router.refresh();
    } catch { setError("Tidak dapat terhubung. Silakan coba lagi."); }
    finally { setBusy(false); }
  }}>
    <Field><FieldLabel htmlFor="admin-email">Email</FieldLabel><Input id="admin-email" name="email" type="email" required autoComplete="username" placeholder="admin@contoh.id" className="h-10"/></Field>
    <Field><FieldLabel htmlFor="admin-password">Kata sandi</FieldLabel><Input id="admin-password" name="password" type="password" required autoComplete="current-password" placeholder="Kata sandi admin" className="h-10"/></Field>
    <FieldError>{error}</FieldError>
    <Button type="submit" className="h-10 w-full justify-center" disabled={busy}>{busy ? "Memeriksa…" : "Masuk ke studio"}<ArrowRight size={15}/></Button>
  </form>;
}
