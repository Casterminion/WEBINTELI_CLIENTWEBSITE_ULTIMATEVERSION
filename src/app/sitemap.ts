import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/site";
import { PACKAGES } from "@/data/packages";

const MORE_SLUGS = [
  "ai-chat-agents",
  "ai-voice-agents",
  "custom-ai-solutions",
  "workflow-automation",
  "business-process-automation",
  "web-development",
  "e-commerce-development",
  "mobile-app-development",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/paslaugos`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/legal`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];

  const morePages: MetadataRoute.Sitemap = MORE_SLUGS.map((slug) => ({
    url: `${baseUrl}/more/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const intakePages: MetadataRoute.Sitemap = PACKAGES.map((pkg) => ({
    url: `${baseUrl}/intake/${pkg.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...morePages, ...intakePages];
}
