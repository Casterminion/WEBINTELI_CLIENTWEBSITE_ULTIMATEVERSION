"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Inbox, LogOut, UserCheck, ListTodo } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AdminInstallPrompt from "./AdminInstallPrompt";
import PushOptInBanner from "./PushOptInBanner";

type Props = {
  children: ReactNode;
};

const navItems = [
  {
    href: "/admin/client-requests",
    label: "Client Requests",
    icon: Inbox,
  },
  {
    href: "/admin/my-leads",
    label: "My leads",
    icon: UserCheck,
  },
  {
    href: "/admin/tasks",
    label: "Tasks",
    icon: ListTodo,
  },
];

function getDisplayName(user: User | null): string {
  if (!user) return "Admin";
  const meta = user.user_metadata as Record<string, string> | undefined;
  return meta?.full_name || meta?.name || user.email || "Admin";
}

export default function AdminShell({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u ?? null);
    };
    void loadUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="admin-console min-h-screen flex">
      <aside
        className="sticky top-0 h-screen w-52 shrink-0 flex flex-col overflow-hidden border-r backdrop-blur-xl transition-colors"
        style={{
          borderColor: "var(--admin-border)",
          background: "var(--admin-glass)",
        }}
      >
        <div
          className="px-5 py-6 border-b"
          style={{ borderColor: "var(--admin-border)" }}
        >
          <Link href="/admin/client-requests" className="block">
            <span
              className="text-[11px] font-medium uppercase tracking-[0.2em]"
              style={{ color: "var(--admin-text-muted)" }}
            >
              Webinteli
            </span>
            <p className="mt-1.5 text-base font-semibold tracking-tight" style={{ color: "var(--admin-text)" }}>
              Admin Console
            </p>
          </Link>
          <p className="mt-3 text-xs" style={{ color: "var(--admin-text-muted)" }}>
            Welcome, <span className="font-medium" style={{ color: "var(--admin-text)" }}>{getDisplayName(user)}</span>
          </p>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col px-2.5 py-4 space-y-0.5 overflow-hidden">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200",
                  active
                    ? "text-[var(--admin-accent)]"
                    : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]",
                ].join(" ")}
                style={
                  active
                    ? {
                        background: "var(--admin-accent-dim)",
                        boxShadow: "inset 0 0 0 1px rgba(34, 211, 238, 0.2)",
                      }
                    : undefined
                }
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div
          className="px-2.5 py-4 border-t"
          style={{ borderColor: "var(--admin-border)" }}
        >
          <button
            type="button"
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors hover:border-[var(--admin-border-hover)] hover:bg-[var(--admin-bg-elevated)] hover:text-[var(--admin-text)]"
            style={{
              color: "var(--admin-text-muted)",
              borderColor: "var(--admin-border)",
              background: "transparent",
            }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-8 py-10">
          <AdminInstallPrompt />
          <PushOptInBanner />
          {children}
        </div>
      </main>
    </div>
  );
}

