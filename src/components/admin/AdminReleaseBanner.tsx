"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const STORAGE_KEY = "webinteli_admin_last_seen_release";

function getCurrentRelease(): string {
  return (process.env.NEXT_PUBLIC_APP_RELEASE ?? "").trim();
}

/**
 * When the deployed build id changes, shows a notice so admins can refresh the
 * installed PWA / home-screen shortcut (OS does not update shortcut icons in place).
 */
export default function AdminReleaseBanner() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const current = getCurrentRelease();

  useEffect(() => {
    if (!current || typeof window === "undefined") return;

    try {
      const prev = window.localStorage.getItem(STORAGE_KEY);
      if (prev === null) {
        window.localStorage.setItem(STORAGE_KEY, current);
        return;
      }
      if (prev !== current) {
        setVisible(true);
      }
    } catch {
      // private mode / blocked storage
    }
  }, [current]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, current);
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible || !current) return null;

  const title = t.admin?.newReleaseTitle ?? "New version deployed";
  const bodyTemplate =
    t.admin?.newReleaseBody ??
    "Websites cannot replace your phone’s home screen icon automatically — remove this app from the home screen, open the site in the browser, then Add to Home Screen / Install again to get the latest icon.";
  const body = bodyTemplate.replace(/\{version\}/g, current);
  const dismissLabel = t.admin?.newReleaseDismiss ?? "Got it — hide until next deploy";
  const buildLabel = t.admin?.newReleaseBuild ?? "Build";

  return (
    <div
      className="mb-4 rounded-xl border px-4 py-3 shadow-sm"
      style={{
        borderColor: "var(--admin-border)",
        background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(99,102,241,0.08))",
      }}
      role="status"
    >
      <div className="flex gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: "var(--admin-accent-dim)",
            color: "var(--admin-accent)",
          }}
          aria-hidden
        >
          <RefreshCw className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
            {title}
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--admin-text-muted)" }}>
            <span className="font-mono text-[11px]" style={{ color: "var(--admin-text)" }}>
              {buildLabel}: {current}
            </span>
            <span className="mx-1.5 opacity-40">·</span>
            {body}
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--admin-bg-elevated)]"
            style={{
              borderColor: "var(--admin-border)",
              color: "var(--admin-text)",
              background: "var(--admin-glass)",
            }}
          >
            <X className="h-3.5 w-3.5 opacity-70" aria-hidden />
            {dismissLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
