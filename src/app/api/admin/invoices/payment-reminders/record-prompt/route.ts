import { NextRequest, NextResponse } from "next/server";
import { todayISOInVilnius } from "@/lib/invoices/dateIso";
import { getSupabaseUserFromRequest } from "@/lib/invoices/supabaseUserFromRequest";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await getSupabaseUserFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const invoice_id = typeof (body as { invoice_id?: unknown }).invoice_id === "string"
    ? (body as { invoice_id: string }).invoice_id.trim()
    : "";
  if (!/^[0-9a-f-]{36}$/i.test(invoice_id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const { user, supabase } = auth;
  const today = todayISOInVilnius();

  const { data: inv, error: invErr } = await supabase
    .from("admin_invoices")
    .select("id")
    .eq("id", invoice_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (invErr || !inv) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: ex } = await supabase
    .from("admin_invoice_payment_reminders")
    .select("snoozed_until")
    .eq("invoice_id", invoice_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const snoozed = (ex as { snoozed_until?: string } | null)?.snoozed_until ?? "1970-01-01";

  const { error: upErr } = await supabase.from("admin_invoice_payment_reminders").upsert(
    {
      invoice_id,
      user_id: user.id,
      snoozed_until: snoozed,
      last_prompt_date: today,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "invoice_id" }
  );

  if (upErr) {
    if (process.env.NODE_ENV === "development") console.error(upErr);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
