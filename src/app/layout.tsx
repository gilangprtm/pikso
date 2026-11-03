import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { rootMetadata } from "@/lib/seo";

// Coolify injects the public origin at runtime, never as a secret build argument.
export const dynamic = "force-dynamic";
export function generateMetadata(): Metadata { return rootMetadata(); }
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#fffaf3" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body><TooltipProvider>{children}</TooltipProvider></body></html>;
}
