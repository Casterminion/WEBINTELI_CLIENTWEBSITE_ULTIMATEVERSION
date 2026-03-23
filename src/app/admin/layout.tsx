import type { ReactNode } from "react";
import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminLayoutClient } from "./AdminLayoutClient";
import { withPwaCacheBust } from "@/lib/pwaAssetVersion";

/**
 * Admin routes use a separate web manifest so “Install app” / Add to Home Screen
 * opens /admin (scoped to /admin/), not the public marketing site.
 */
export const metadata: Metadata = {
  title: "Admin | Webinteli",
  robots: {
    index: false,
    follow: false,
  },
  manifest: withPwaCacheBust("/admin.webmanifest"),
  appleWebApp: {
    capable: true,
    title: "Webinteli Admin",
    statusBarStyle: "black-translucent",
  },
  themeColor: "#0b1120",
  icons: {
    icon: [
      { url: withPwaCacheBust("/favicon.ico"), sizes: "48x48", type: "image/x-icon" },
      { url: withPwaCacheBust("/favicon-16x16.png"), sizes: "16x16", type: "image/png" },
      { url: withPwaCacheBust("/favicon-32x32.png"), sizes: "32x32", type: "image/png" },
      { url: withPwaCacheBust("/android-chrome-192x192.png"), sizes: "192x192", type: "image/png" },
      { url: withPwaCacheBust("/android-chrome-512x512.png"), sizes: "512x512", type: "image/png" },
    ],
    shortcut: withPwaCacheBust("/favicon.ico"),
    apple: [{ url: withPwaCacheBust("/apple-touch-icon.png"), sizes: "180x180", type: "image/png" }],
  },
};

type Props = {
  children: ReactNode;
};

export default function AdminLayout({ children }: Props) {
  return (
    <Suspense>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </Suspense>
  );
}

