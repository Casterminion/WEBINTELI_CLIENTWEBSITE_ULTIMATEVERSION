"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { BuhalterijaNav } from "@/components/admin/buhalterija/BuhalterijaNav";
import {
  CompanySettingsProvider,
  SETTINGS_BASE_PATH,
  SETTINGS_NAV,
  useCompanySettings,
  type SettingsSegment,
} from "./companySettingsContext";

function segmentFromPathname(pathname: string): SettingsSegment {
  const base = SETTINGS_BASE_PATH;
  if (pathname === base || pathname === `${base}/`) return "santrauka";
  const prefix = `${base}/`;
  if (!pathname.startsWith(prefix)) return "santrauka";
  const seg = pathname.slice(prefix.length).split("/")[0];
  const found = SETTINGS_NAV.find((s) => s.segment === seg);
  return found ? found.segment : "santrauka";
}

function NustatymaiChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const active = segmentFromPathname(pathname);
  const { t } = useLanguage();
  const a = t.admin;
  const {
    loading,
    saving,
    err,
    form,
    lab,
    formRootRef,
    handleFormBlurCapture,
    handleFormKeyDown,
  } = useCompanySettings();

  const activeMeta = SETTINGS_NAV.find((s) => s.segment === active) ?? SETTINGS_NAV[0];

  if (loading || !form) {
    return (
      <div className="space-y-6">
        <BuhalterijaNav />
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--admin-accent)" }} />
          <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>
            {a?.buhalterijaLoading ?? "Loading…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <BuhalterijaNav>
        <nav
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
          style={{ WebkitOverflowScrolling: "touch" }}
          aria-label={lab("companySettingsNavAria", "Nustatymų skyriai")}
        >
          {SETTINGS_NAV.map((s) => {
            const isActive = active === s.segment;
            const href = `${SETTINGS_BASE_PATH}/${s.segment}`;
            return (
              <Link
                key={s.segment}
                href={href}
                className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderColor: isActive ? "var(--admin-accent)" : "var(--admin-border)",
                  background: isActive ? "var(--admin-bg-elevated)" : "transparent",
                  color: isActive ? "var(--admin-accent)" : "var(--admin-text-muted)",
                }}
              >
                {lab(s.navLabelKey, s.navFb)}
              </Link>
            );
          })}
        </nav>
      </BuhalterijaNav>

      <div className="lg:flex lg:items-start lg:gap-10">
        <aside
          className="hidden w-56 shrink-0 flex-col self-start lg:flex lg:sticky lg:top-24 lg:z-10 lg:max-h-[calc(100dvh-7rem)]"
          aria-label={lab("companySettingsNavAria", "Nustatymų skyriai")}
        >
          <nav className="-mr-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
            {SETTINGS_NAV.map((s) => {
              const isActive = active === s.segment;
              const href = `${SETTINGS_BASE_PATH}/${s.segment}`;
              return (
                <Link
                  key={`aside-${s.segment}`}
                  href={href}
                  className="block w-full rounded-lg border-l-2 px-3 py-2 text-left text-sm font-medium transition-colors"
                  style={{
                    borderLeftColor: isActive ? "var(--admin-accent)" : "transparent",
                    background: isActive ? "var(--admin-bg-elevated)" : "transparent",
                    color: isActive ? "var(--admin-text)" : "var(--admin-text-muted)",
                  }}
                >
                  {lab(s.navLabelKey, s.navFb)}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div
          ref={formRootRef}
          className="min-w-0 flex-1 space-y-6"
          onBlurCapture={handleFormBlurCapture}
          onKeyDown={handleFormKeyDown}
        >
          <div>
            <Link
              href="/admin/buhalterija"
              className="text-xs font-medium hover:underline"
              style={{ color: "var(--admin-accent)" }}
            >
              ← {a?.buhalterijaBackToOverview ?? a?.buhalterijaBackToList ?? "Back"}
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl" style={{ color: "var(--admin-text)" }}>
                {lab(activeMeta.pageTitleKey, activeMeta.pageTitleFb)}
              </h1>
              {saving ? (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: "var(--admin-text-muted)" }}
                  aria-live="polite"
                >
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" style={{ color: "var(--admin-accent)" }} />
                  {lab("companySettingsSaving", "Išsaugoma…")}
                </span>
              ) : null}
            </div>
          </div>

          {err ? (
            <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: "var(--admin-border)", color: "#fca5a5" }}>
              {err}
            </div>
          ) : null}

          {children}
        </div>
      </div>
    </div>
  );
}

export default function NustatymaiLayoutClient({ children }: { children: ReactNode }) {
  return (
    <CompanySettingsProvider>
      <NustatymaiChrome>{children}</NustatymaiChrome>
    </CompanySettingsProvider>
  );
}
