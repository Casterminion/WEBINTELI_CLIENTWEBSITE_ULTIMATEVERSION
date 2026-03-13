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
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
      <div className="w-full max-w-md rounded-2xl border border-[var(--neutral-border)] bg-[var(--card)]/80 shadow-[var(--shadow-premium)] px-7 py-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
            Webinteli
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            Admin access
          </h1>
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            Sign in with your Webinteli admin credentials to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="block text-xs font-medium text-[var(--muted-foreground)]">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--neutral-border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-xs font-medium text-[var(--muted-foreground)]">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--neutral-border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
            />
          </div>

          {error && (
            <p className="text-xs text-[var(--destructive)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold tracking-wide text-[var(--primary-foreground)] shadow-sm hover:shadow-[var(--shadow-hover)] disabled:opacity-70 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

