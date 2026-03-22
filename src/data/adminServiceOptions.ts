/**
 * Service / paslaugos options shown in admin lead forms (selects).
 * Stored as plain text on `intake_submissions.service`.
 */
export const ADMIN_SERVICE_OPTIONS = [
  "Local SEO",
  "AI Agent",
  "Automations",
  "Website",
  "Web Design",
  "Social Media",
  "Google Ads",
  "Meta Ads",
] as const;

export type AdminServiceOption = (typeof ADMIN_SERVICE_OPTIONS)[number];

export const DEFAULT_ADMIN_SERVICE: AdminServiceOption = "Local SEO";
