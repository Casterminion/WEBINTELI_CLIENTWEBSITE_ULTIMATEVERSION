"use client";

import dynamic from "next/dynamic";

const CookieBanner = dynamic(
  () => import("@/components/layout/CookieBanner"),
  { ssr: false }
);

export default function CookieBannerWrapper() {
  return <CookieBanner />;
}
