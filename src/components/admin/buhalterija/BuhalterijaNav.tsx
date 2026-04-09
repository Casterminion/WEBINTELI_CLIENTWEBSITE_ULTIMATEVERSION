"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  /** Renders below the tab row on small screens only (e.g. settings section pills). */
  children?: ReactNode;
};

export function BuhalterijaNav({ children }: Props) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const a = t.admin;

  const overviewHref = "/admin/buhalterija";
  const invoicesHref = "/admin/buhalterija/saskaitos";
  const settingsHref = "/admin/buhalterija/nustatymai";

  const isOverview = pathname === overviewHref;
  const isInvoices =
    pathname === invoicesHref ||
    pathname.startsWith(`${invoicesHref}/`) ||
    pathname.startsWith("/admin/buhalterija/saskaitos/");

  const tabCls = (active: boolean) =>
    [
      "inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm font-medium transition-colors border",
      active
        ? "text-white border-transparent"
        : "border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-bg-elevated)]",
    ].join(" ");

  return (
    <div
      className="sticky top-16 z-20 mb-3 md:top-0 md:z-30"
      style={{ background: "var(--admin-bg)" }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 border-b pb-2 md:pb-2"
        style={{ borderColor: "var(--admin-border)" }}
      >
        <nav className="flex flex-wrap gap-1.5 sm:gap-2" aria-label={a?.buhalterijaNavAria ?? "Buhalterija"}>
          <Link
            href={overviewHref}
            className={tabCls(isOverview)}
            style={
              isOverview
                ? { background: "var(--admin-accent)" }
                : { background: "var(--admin-bg-elevated)" }
            }
          >
            {a?.buhalterijaTabOverview ?? "Apžvalga"}
          </Link>
          <Link
            href={invoicesHref}
            className={tabCls(isInvoices && !isOverview)}
            style={
              isInvoices && !isOverview
                ? { background: "var(--admin-accent)" }
                : { background: "var(--admin-bg-elevated)" }
            }
          >
            {a?.buhalterijaInvoices ?? "Sąskaitos"}
          </Link>
        </nav>
        <Link
          href={settingsHref}
          className="text-xs font-medium px-3 py-2 rounded-lg border transition-colors hover:bg-[var(--admin-bg-elevated)]"
          style={{ borderColor: "var(--admin-border)", color: "var(--admin-accent)" }}
        >
          {a?.buhalterijaNavSettings ?? "Nustatymai"}
        </Link>
      </div>
      {children ? <div className="pt-2 lg:hidden">{children}</div> : null}
    </div>
  );
}
