"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const CookieBanner = dynamic(
  () => import("@/components/layout/CookieBanner"),
  { ssr: false }
);

export default function CookieBannerWrapper() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <CookieBanner />;
}
