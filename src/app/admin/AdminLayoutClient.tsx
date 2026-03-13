"use client";

import "./admin.css";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdminShell from "@/components/admin/AdminShell";

type Props = {
  children: ReactNode;
};

export function AdminLayoutClient({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Do not run auth guard on the public login route itself to avoid redirect loops.
    if (pathname.startsWith("/admin/login")) {
      setChecking(false);
      return () => {
        isMounted = false;
      };
    }

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (error || !data?.user) {
        const redirectTo =
          pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
        router.replace(`/admin/login?redirect=${encodeURIComponent(redirectTo)}`);
        return;
      }

      setChecking(false);
    };

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [pathname, router, searchParams]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="px-6 py-4 rounded-xl border border-[var(--neutral-border)] shadow-sm bg-[var(--card)]">
          <p className="text-sm tracking-wide">Loading secure dashboard…</p>
        </div>
      </div>
    );
  }

  // On the login route, render the page without the admin shell (but still without navbar/footer).
  if (pathname.startsWith("/admin/login")) {
    return <>{children}</>;
  }

  return <AdminShell>{children}</AdminShell>;
}

