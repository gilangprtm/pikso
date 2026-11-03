import type { Metadata } from "next";

const siteUrlPattern = /^https:\/\/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?::443)?\/?$/i;

export function getPublicSiteUrl(): URL | null {
  if (process.env.SITE_INDEXING === "off") return null;
  const configured = process.env.SITE_URL?.trim();
  if (!configured || !siteUrlPattern.test(configured)) return null;

  try {
    const parsed = new URL(configured);
    if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash || /\.(localhost|local|test|invalid|example)$/i.test(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const publicPageMetadata = {
  home: {
    title: "Pikso Studio — Cerita Bergambar Anak",
    description: "Jelajahi cerita bergambar anak yang hangat, karakter sahabat, dan petualangan imajinatif dari Pikso Studio.",
  },
  books: {
    title: "Koleksi Cerita Bergambar Anak",
    description: "Jelajahi koleksi cerita bergambar Pikso Studio: petualangan hangat, persahabatan, dan dunia imajinasi untuk anak.",
  },
  characters: {
    title: "Karakter Cerita Anak",
    description: "Kenali Nana dan teman-teman dari dunia cerita Pikso Studio. Temukan karakter dan kisah mereka.",
  },
  about: {
    title: "Tentang Pikso Studio",
    description: "Pikso Studio menghadirkan cerita bergambar hangat yang mengajak anak menjelajahi imajinasi, persahabatan, dan keberanian.",
  },
  nana: {
    title: "Nana — Karakter Petualang Kecil",
    description: "Kenali Nana dan Mimi, sahabat kelinci yang menemukan keberanian, persahabatan, dan keajaiban dalam petualangan sehari-hari.",
  },
} as const;

export function canonicalUrl(path: string): string | undefined {
  const site = getPublicSiteUrl();
  if (!site || !path.startsWith("/") || path.startsWith("//")) return undefined;
  const url = new URL(path, site);
  return url.origin === site.origin ? url.toString() : undefined;
}

export function pageMetadata(path: string, title: string, description: string, imagePath = "/assets/brand/pikso-social.png"): Metadata {
  const canonical = canonicalUrl(path);
  const image = canonicalUrl(imagePath);
  const brandedTitle = title === publicPageMetadata.home.title ? title : `${title} · Pikso Studio`;
  return {
    title: { absolute: brandedTitle },
    description,
    robots: { index: Boolean(canonical), follow: true },
    ...(canonical && image ? {
      alternates: { canonical },
      openGraph: {
        type: "website", locale: "id_ID", siteName: "Pikso Studio",
        title: brandedTitle, description, url: canonical,
        images: [{ url: image, alt: imagePath.startsWith("/api/") ? `Sampul ${title}` : "Pikso Studio — Cerita kecil, imajinasi besar" }],
      },
      twitter: { card: "summary_large_image", title: brandedTitle, description, images: [{ url: image, alt: title }] },
    } : {}),
  };
}

export function rootMetadata(): Metadata {
  const site = getPublicSiteUrl();
  return {
    ...(site ? { metadataBase: site } : {}),
    title: { default: publicPageMetadata.home.title, template: "%s · Pikso Studio" },
    description: publicPageMetadata.home.description,
    applicationName: "Pikso",
    creator: "Pikso Studio",
    publisher: "Pikso Studio",
    robots: { index: Boolean(site), follow: true },
  };
}

export function siteStructuredData(): string | null {
  const site = getPublicSiteUrl();
  if (!site) return null;
  const url = site.toString();
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${url}#organization`, name: "Pikso Studio", url, logo: new URL("/icon.png", site).toString() },
      { "@type": "WebSite", "@id": `${url}#website`, name: "Pikso Studio", alternateName: "Pikso", url, description: publicPageMetadata.home.description, inLanguage: "id-ID", publisher: { "@id": `${url}#organization` } },
    ],
  }).replace(/</g, "\\u003c");
}
