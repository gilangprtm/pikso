import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: { default: "Pikso — Cerita kecil, imajinasi besar", template: "%s · Pikso" },
  description: "Jelajahi cerita bergambar dan karakter dari Pikso Studio. Temukan Nana dan teman-teman baru dalam pengalaman buku digital yang menyenangkan.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#fffaf3" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body><TooltipProvider>{children}</TooltipProvider></body></html>;
}
