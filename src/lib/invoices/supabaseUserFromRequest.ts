import type { NextRequest } from "next/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export type AuthedSupabase = {
  user: User;
  /** Loosened: generated DB types do not yet list `admin_invoices`. */
  supabase: SupabaseClient;
};

export async function getSupabaseUserFromRequest(
  request: NextRequest
): Promise<AuthedSupabase | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }) as SupabaseClient;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { user, supabase };
}

export function safePdfFilename(invoiceNumber: string): string {
  const base = invoiceNumber.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "invoice";
  return `${base}.pdf`;
}
