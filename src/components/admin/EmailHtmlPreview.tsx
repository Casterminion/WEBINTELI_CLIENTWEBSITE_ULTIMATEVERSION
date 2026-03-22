"use client";

import { sanitizeEmailHtml } from "@/lib/emailHtmlPurify";
import styles from "./EmailHtmlPreview.module.css";

type Props = {
  html: string;
  className?: string;
};

/** Renders sanitized email HTML without Tailwind prose (preserves pasted layout). */
export default function EmailHtmlPreview({ html, className }: Props) {
  const safe = sanitizeEmailHtml(html);
  if (!safe) return null;
  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
