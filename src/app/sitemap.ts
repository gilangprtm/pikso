import type { MetadataRoute } from "next";
import { listPublishedBookUrls } from "@/lib/books";
import { canonicalUrl, getPublicSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getPublicSiteUrl();
  if (!site) return [];

  // Fail closed: never emit a partial sitemap that silently omits published stories.
  const stories = await listPublishedBookUrls();
  const pages: MetadataRoute.Sitemap = [
    { url: canonicalUrl("/")!, changeFrequency: "weekly", priority: 1 },
    { url: canonicalUrl("/books")!, changeFrequency: "daily", priority: 0.9 },
    { url: canonicalUrl("/characters")!, changeFrequency: "monthly", priority: 0.7 },
    { url: canonicalUrl("/characters/nana")!, changeFrequency: "monthly", priority: 0.6 },
    { url: canonicalUrl("/about")!, changeFrequency: "yearly", priority: 0.5 },
  ];

  for (const story of stories) {
    const canonical = canonicalUrl(`/books/${story.slug}`);
    if (canonical) pages.push({ url: canonical, lastModified: story.updated_at, changeFrequency: "monthly", priority: 0.7 });
  }
  return pages;
}
