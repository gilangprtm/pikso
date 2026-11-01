import type { NextConfig } from "next";

const config: NextConfig = {
  turbopack: {
    resolveAlias: {
      "pdfjs-dist": { browser: "pdfjs-dist/legacy/build/pdf.mjs" },
    },
  },
  serverExternalPackages: ["pg", "sharp", "pdfjs-dist", "@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/api/admin/books": ["./node_modules/pdfjs-dist/{legacy/build,cmaps,standard_fonts,wasm,iccs}/**/*"],
    "/api/admin/books/finalize": ["./node_modules/pdfjs-dist/{legacy/build,cmaps,standard_fonts,wasm,iccs}/**/*"],
  },
  experimental: { serverActions: { bodySizeLimit: "1mb" } },
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }];
  },
};
export default config;
