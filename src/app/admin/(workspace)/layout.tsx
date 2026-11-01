import type { Metadata } from "next";
import { requireAdmin } from "@/lib/session";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return <AdminWorkspace userName={session.user.name ?? "Admin Pikso"}>{children}</AdminWorkspace>;
}
