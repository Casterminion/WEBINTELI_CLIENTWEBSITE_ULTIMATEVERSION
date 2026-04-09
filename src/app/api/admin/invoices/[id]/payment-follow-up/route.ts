import { NextRequest, NextResponse } from "next/server";
import { todayISOInVilnius } from "@/lib/invoices/dateIso";
import { applyReminderAction, type ReminderAction } from "@/lib/invoices/paymentReminders";
import { getSupabaseUserFromRequest } from "@/lib/invoices/supabaseUserFromRequest";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  const auth = await getSupabaseUserFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: invoiceId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const action = (body as { action?: unknown }).action;
  if (action !== "not_received" && action !== "tomorrow") {
    return NextResponse.json({ error: "action_invalid" }, { status: 400 });
  }

  const { user, supabase } = auth;
  const today = todayISOInVilnius();

  const { data: inv, error: invErr } = await supabase
    .from("admin_invoices")
    .select("id,due_date")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (invErr || !inv) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const due_date = (inv as { due_date: string }).due_date;

  const { data: ex } = await supabase
    .from("admin_invoice_payment_reminders")
    .select("snoozed_until,last_prompt_date")
    .eq("invoice_id", invoiceId)
    .eq("user_id", user.id)
    .maybeSingle();

  const previous = ex
    ? {
        snoozed_until: (ex as { snoozed_until: string }).snoozed_until,
        last_prompt_date: (ex as { last_prompt_date: string | null }).last_prompt_date,
      }
    : null;

  const next = applyReminderAction(action as ReminderAction, due_date, today, previous);

  const { error: upErr } = await supabase.from("admin_invoice_payment_reminders").upsert(
    {
      invoice_id: invoiceId,
      user_id: user.id,
      snoozed_until: next.snoozed_until,
      last_prompt_date: next.last_prompt_date,
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
