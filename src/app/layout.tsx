import type { Metadata } from "next";
import { Outfit, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PHONE_TEL } from "@/lib/phone";
import CookieBannerWrapper from "@/components/layout/CookieBannerWrapper";
import { withPwaCacheBust } from "@/lib/pwaAssetVersion";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["500", "600"],
  subsets: ["latin"],
  variable: "--font-ibm-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Webinteli | Premium Svetainių Kūrimas & AI Agentai",
  description: "Aukščiausios kokybės interneto svetainių kūrimas, SEO optimizacija ir AI automatizacijos sprendimai.",
  manifest: withPwaCacheBust("/site.webmanifest"),
  appleWebApp: { title: "Webinteli" },
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Webinteli",
    telephone: PHONE_TEL,
    email: "kontaktai@webinteli.lt",
    url: "https://webinteli.lt",
  };

  return (
    <html lang="lt" suppressHydrationWarning className={`${outfit.variable} ${ibmPlexMono.variable}`}>
      <head>
        <link
          rel="preload"
          href="/wp-content/uploads/2024/11/background.mp4"
          as="video"
          type="video/mp4"
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <LanguageProvider>
          <Navbar />
          <main>
            {children}
          </main>
          <Footer />
          <CookieBannerWrapper />
        </LanguageProvider>
      </body>
    </html>
  );
}
