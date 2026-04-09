"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { FileText, Inbox, Landmark, LayoutDashboard, LogOut, UserCheck, ListTodo, Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import AdminInstallPrompt from "./AdminInstallPrompt";
import AdminReleaseBanner from "./AdminReleaseBanner";
import PaymentReminderBanner from "./PaymentReminderBanner";
import PushOptInBanner from "./PushOptInBanner";

type Props = {
  children: ReactNode;
};

/** Branding / title link — same landing as Client requests */
const ADMIN_HOME_HREF = "/admin/client-requests";

const navHrefs = [
  { href: "/admin/dashboard", key: "dashboard" as const, icon: LayoutDashboard },
  { href: "/admin/financai", key: "financai" as const, icon: Landmark },
  { href: "/admin/buhalterija", key: "buhalterija" as const, icon: FileText },
  { href: "/admin/client-requests", key: "clientRequests" as const, icon: Inbox },
  { href: "/admin/my-leads", key: "myLeads" as const, icon: UserCheck },
  { href: "/admin/tasks", key: "tasks" as const, icon: ListTodo },
] as const;

function getDisplayName(user: User | null): string {
  if (!user) return "Admin";
  const meta = user.user_metadata as Record<string, string> | undefined;
  return meta?.full_name || meta?.name || user.email || "Admin";
}

export default function AdminShell({ children }: Props) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = navHrefs.map(({ href, key, icon }) => ({
    href,
    label: t.admin?.[key] ?? key,
    icon,
  }));

  const buhalterijaDenseMain =
    pathname === "/admin/buhalterija" ||
    pathname.startsWith("/admin/buhalterija/saskaitos") ||
    pathname.startsWith("/admin/buhalterija/nustatymai");

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u ?? null);
    };
    void loadUser();
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="admin-console min-h-screen flex flex-col md:flex-row">
      {/* Mobile top bar — only on small screens */}
      <header
        className="admin-mobile-header sticky top-0 z-40 flex items-center justify-between gap-3 border-b px-4 py-3 md:hidden"
        style={{
          borderColor: "var(--admin-border)",
          background: "var(--admin-glass)",
        }}
      >
        <Link
          href={ADMIN_HOME_HREF}
          className="min-w-0"
          onClick={() => setMobileMenuOpen(false)}
        >
          <span
            className="text-[10px] font-medium uppercase tracking-[0.2em] block"
            style={{ color: "var(--admin-text-muted)" }}
          >
            Webinteli
          </span>
          <p className="text-sm font-semibold tracking-tight truncate" style={{ color: "var(--admin-text)" }}>
            {t.admin?.adminConsole ?? "Admin Console"}
          </p>
        </Link>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((o) => !o)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors"
          style={{
            borderColor: "var(--admin-border)",
            color: "var(--admin-text)",
            background: "var(--admin-bg-elevated)",
          }}
          aria-label={mobileMenuOpen ? (t.admin?.closeMenu ?? "Close menu") : (t.admin?.openMenu ?? "Open menu")}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile nav overlay — only on small screens when open */}
      {mobileMenuOpen && (
        <div
          className="admin-mobile-overlay fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />
          <div
            className="admin-mobile-drawer absolute top-0 right-0 bottom-0 w-[min(100vw,280px)] flex flex-col overflow-hidden border-l shadow-2xl"
            style={{
              borderColor: "var(--admin-border)",
              background: "var(--admin-glass)",
            }}
          >
            <div
              className="flex items-center justify-between border-b px-4 py-4"
              style={{ borderColor: "var(--admin-border)" }}
            >
              <span className="text-xs font-medium" style={{ color: "var(--admin-text-muted)" }}>
                {t.admin?.welcome ?? "Welcome"}, <span style={{ color: "var(--admin-text)" }}>{getDisplayName(user)}</span>
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ color: "var(--admin-text-muted)" }}
                aria-label={t.admin?.closeMenu ?? "Close menu"}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={[
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] font-medium transition-colors border-l-2",
                      active
                        ? "text-[var(--admin-accent)] border-[var(--admin-accent)] bg-[var(--admin-accent-dim)]"
                        : "text-[var(--admin-text-muted)] border-transparent hover:text-[var(--admin-text)] hover:bg-[var(--admin-bg-elevated)]",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t px-3 py-4" style={{ borderColor: "var(--admin-border)" }}>
              <button
                type="button"
                onClick={() => {
                  void supabase.auth.signOut();
                  router.push("/");
                  setMobileMenuOpen(false);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--admin-bg-elevated)] hover:text-[var(--admin-text)]"
                style={{
                  borderColor: "var(--admin-border)",
                  color: "var(--admin-text-muted)",
                  background: "transparent",
                }}
              >
                <LogOut className="h-4 w-4" />
                {t.admin?.logOut ?? "Log out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar — hidden on mobile */}
      <aside
        className="hidden md:flex sticky top-0 h-screen w-48 shrink-0 flex-col overflow-hidden border-r backdrop-blur-xl transition-colors"
        style={{
          borderColor: "var(--admin-border)",
          background: "var(--admin-panel)",
        }}
      >
        <div
          className="px-4 py-5 border-b"
          style={{ borderColor: "var(--admin-border)" }}
        >
          <Link href={ADMIN_HOME_HREF} className="block">
            <span
              className="text-[11px] font-medium uppercase tracking-[0.2em]"
              style={{ color: "var(--admin-text-muted)" }}
            >
              Webinteli
            </span>
            <p className="mt-1.5 text-base font-semibold tracking-tight" style={{ color: "var(--admin-text)" }}>
              {t.admin?.adminConsole ?? "Admin Console"}
            </p>
          </Link>
          <p className="mt-3 text-xs" style={{ color: "var(--admin-text-muted)" }}>
            {t.admin?.welcome ?? "Welcome"}, <span className="font-medium" style={{ color: "var(--admin-text)" }}>{getDisplayName(user)}</span>
          </p>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col px-2 py-3 space-y-1 overflow-hidden">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all duration-200 border-l-2",
                  active
                    ? "text-[var(--admin-accent)] border-[var(--admin-accent)] bg-[var(--admin-bg-elevated)]"
                    : "text-[var(--admin-text-muted)] border-transparent hover:text-[var(--admin-text)] hover:bg-[var(--admin-bg-elevated)]",
                ].join(" ")}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div
          className="px-2 py-3 border-t"
          style={{ borderColor: "var(--admin-border)" }}
        >
          <button
            type="button"
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors hover:border-[var(--admin-border-hover)] hover:bg-[var(--admin-bg-elevated)] hover:text-[var(--admin-text)]"
            style={{
              color: "var(--admin-text-muted)",
              borderColor: "var(--admin-border)",
              background: "transparent",
            }}
          >
            <LogOut className="h-3.5 w-3.5" />
            {t.admin?.logOut ?? "Log out"}
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div
          className={[
            "mx-auto px-4 md:px-6",
            buhalterijaDenseMain ? "max-w-7xl" : "max-w-6xl",
            buhalterijaDenseMain
              ? "py-2 md:py-3"
              : pathname === "/admin/dashboard"
                ? "py-3 md:py-4"
                : "py-4 md:py-6",
          ].join(" ")}
        >
          <AdminReleaseBanner />
          <AdminInstallPrompt />
          <PushOptInBanner />
          <PaymentReminderBanner />
          {children}
        </div>
      </main>
    </div>
  );
}

