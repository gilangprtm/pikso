import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const site = getPublicSiteUrl();
  if (!site) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    // Covers are public published previews; reader HTML stays crawlable for noindex.
    rules: { userAgent: "*", allow: ["/", "/api/books/*/cover"], disallow: ["/admin", "/api/"] },
    sitemap: new URL("/sitemap.xml", site).toString(),
    host: site.host,
  };
}
