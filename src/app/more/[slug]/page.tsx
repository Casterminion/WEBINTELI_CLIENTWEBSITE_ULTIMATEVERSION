"use client";

import React from "react";
import { useParams, notFound } from "next/navigation";
import { UpdatingOverlay } from "@/components/ui/UpdatingOverlay";
import { useLanguage } from "@/contexts/LanguageContext";

const VALID_SLUGS = [
  "ai-chat-agents",
  "ai-voice-agents",
  "custom-ai-solutions",
  "workflow-automation",
  "business-process-automation",
  "web-development",
  "e-commerce-development",
  "mobile-app-development",
] as const;
type Slug = (typeof VALID_SLUGS)[number];

function isValidSlug(s: string): s is Slug {
  return VALID_SLUGS.includes(s as Slug);
}

export default function MoreProductPage() {
  const { t } = useLanguage();
  const params = useParams();
  const slugParam = params.slug;
  const slug =
    typeof slugParam === "string"
      ? slugParam
      : Array.isArray(slugParam)
        ? slugParam[0]
        : undefined;

  if (!slug || !isValidSlug(slug)) {
    notFound();
  }

  // Map slug to translation key
  const slugToKey: Record<Slug, string> = {
    "ai-chat-agents": "chat",
    "ai-voice-agents": "voice",
    "custom-ai-solutions": "custom",
    "workflow-automation": "workflow",
    "business-process-automation": "process",
    "web-development": "web",
    "e-commerce-development": "ecommerce",
    "mobile-app-development": "mobile",
  };

  const label = (t.footer.serviceLabels as any)[slugToKey[slug]];

  return (
    <UpdatingOverlay
      title={label}
      message={t.updatingOverlay.message}
      subtext={t.updatingOverlay.subtext}
      showBackLink
    />
  );
}
