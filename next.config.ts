import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pkg = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8"),
) as { version: string };

/** Shown in admin “new release” banner; changes each deploy on Vercel (git SHA). */
const appRelease =
  process.env.NEXT_PUBLIC_APP_RELEASE?.trim() ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  `dev-${pkg.version}`;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_RELEASE: appRelease,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
              "connect-src 'self' https://*.supabase.co https://ipapi.co https://cdn.jsdelivr.net wss://*.supabase.co",
              // PDFViewer (react-pdf) embeds the generated PDF via blob: iframe; invoice preview fonts load from jsDelivr.
              "frame-src 'self' blob: https://play.gumlet.io https://*.gumlet.io",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
