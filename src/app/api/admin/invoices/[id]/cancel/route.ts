import { NextRequest, NextResponse } from "next/server";
import { sumPaymentsForInvoice } from "@/lib/invoices/invoicePersist";
import { getSupabaseUserFromRequest } from "@/lib/invoices/supabaseUserFromRequest";
import type { AdminInvoiceRow } from "@/lib/invoices/types";

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

  const { user, supabase } = auth;

  const { data: row, error: qErr } = await supabase
    .from("admin_invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (qErr || !row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const inv = row as AdminInvoiceRow;
  if (!inv.issued_at) {
    return NextResponse.json({ error: "not_issued" }, { status: 400 });
  }
  if (inv.cancelled_at) {
    return NextResponse.json({ error: "already_cancelled" }, { status: 400 });
  }

  const paid = await sumPaymentsForInvoice(supabase, invoiceId);
  if (paid > 0) {
    return NextResponse.json({ error: "has_payments" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("admin_invoices")
    .update({
      cancelled_at: nowIso,
      status: "cancelled",
      updated_at: nowIso,
    })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (upErr) {
    if (process.env.NODE_ENV === "development") console.error(upErr);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "cancelled" });
}
