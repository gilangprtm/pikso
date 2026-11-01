"use client";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function Logout() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true); setError("");
    try {
      const result = await fetch("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!result.ok) throw new Error("Gagal keluar. Coba lagi.");
      router.push("/admin/login"); router.refresh();
    } catch { setError("Gagal keluar. Coba lagi."); }
    finally { setBusy(false); }
  }
  return <div className="relative shrink-0">
    <Button type="button" variant="ghost" size="icon" title="Keluar" aria-label="Keluar" disabled={busy} onClick={signOut} className="size-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><LogOut className="size-4"/></Button>
    {error && <Alert variant="destructive" className="absolute bottom-11 right-0 z-10 w-48 bg-popover p-3 shadow-sm"><AlertDescription>{error}</AlertDescription></Alert>}
  </div>;
}
