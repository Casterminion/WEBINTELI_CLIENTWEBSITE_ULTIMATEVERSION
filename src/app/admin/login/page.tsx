"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message || "Unable to sign in. Please check your details.");
      setLoading(false);
      return;
    }

    const redirect = searchParams.get("redirect") || "/admin/client-requests";
    router.push(redirect);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[var(--muted)]">
      {/* Subtle grid pattern for depth */}
      <div
        className="fixed inset-0 opacity-[0.4] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.06) 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative w-full max-w-[400px]">
        <div className="rounded-2xl border border-[var(--neutral-border)] bg-[var(--card)] shadow-[0_4px_24px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.02)] overflow-hidden">
          {/* Accent bar */}
          <div className="h-1 bg-[var(--accent)]" aria-hidden />

          <div className="px-8 pt-8 pb-8">
            <div className="mb-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Webinteli
              </p>
              <h1 className="mt-3 text-[22px] font-semibold tracking-tight text-[var(--foreground)]">
                Admin access
              </h1>
              <p className="mt-2 text-sm text-[var(--muted-foreground)] leading-relaxed max-w-[320px]">
                Sign in with your Webinteli admin credentials to continue.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[var(--foreground)]"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[var(--neutral-border)] bg-[var(--muted)]/50 px-4 py-3 text-[15px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:bg-[var(--card)]"
                  placeholder="you@company.com"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[var(--foreground)]"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[var(--neutral-border)] bg-[var(--muted)]/50 px-4 py-3 text-[15px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:bg-[var(--card)]"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 px-4 py-3">
                  <p className="text-sm text-[var(--destructive)]">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary)]/90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          Secure admin area · Authorized access only
        </p>
      </div>
    </div>
  );
}
