import { NextRequest, NextResponse } from "next/server";
import { todayISOInVilnius } from "@/lib/invoices/dateIso";
import {
  isInvoiceEligibleForPaymentReminder,
  shouldShowPaymentReminder,
  type PaymentReminderRow,
} from "@/lib/invoices/paymentReminders";
import { amountDue } from "@/lib/invoices/invoiceStatus";
import { getSupabaseUserFromRequest } from "@/lib/invoices/supabaseUserFromRequest";
import type { AdminInvoiceRow } from "@/lib/invoices/types";
import type { InvoiceStatus } from "@/lib/invoices/invoiceStatus";
import type { PendingPaymentReminderDto } from "@/lib/invoices/paymentReminderTypes";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await getSupabaseUserFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { user, supabase } = auth;
  const today = todayISOInVilnius();

  const { data: invRows, error: invErr } = await supabase
    .from("admin_invoices")
    .select(
      "id,invoice_number,buyer_name,currency,total,due_date,status,issued_at,cancelled_at"
    )
    .eq("user_id", user.id)
    .in("status", ["issued", "partially_paid", "overdue"])
    .not("issued_at", "is", null)
    .is("cancelled_at", null)
    .limit(80);

  if (invErr) {
    if (process.env.NODE_ENV === "development") console.error(invErr);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const invoices = (invRows ?? []) as Pick<
    AdminInvoiceRow,
    | "id"
    | "invoice_number"
    | "buyer_name"
    | "currency"
    | "total"
    | "due_date"
    | "status"
    | "issued_at"
    | "cancelled_at"
  >[];

  if (invoices.length === 0) {
    return NextResponse.json({ today, reminders: [] as PendingPaymentReminderDto[] });
  }

  const ids = invoices.map((r) => r.id);

  const { data: payRows } = await supabase.from("admin_invoice_payments").select("invoice_id,amount").in("invoice_id", ids);

  const paidByInvoice = new Map<string, number>();
  for (const p of payRows ?? []) {
    const row = p as { invoice_id: string; amount: unknown };
    const prev = paidByInvoice.get(row.invoice_id) ?? 0;
    paidByInvoice.set(row.invoice_id, prev + (Number(row.amount) || 0));
  }

  const { data: remRows } = await supabase
    .from("admin_invoice_payment_reminders")
    .select("invoice_id,snoozed_until,last_prompt_date")
    .in("invoice_id", ids)
    .eq("user_id", user.id);

  const reminderByInvoice = new Map<string, PaymentReminderRow>();
  for (const r of remRows ?? []) {
    const row = r as { invoice_id: string; snoozed_until: string; last_prompt_date: string | null };
    reminderByInvoice.set(row.invoice_id, {
      snoozed_until: row.snoozed_until,
      last_prompt_date: row.last_prompt_date,
    });
  }

  const reminders: PendingPaymentReminderDto[] = [];

  for (const inv of invoices) {
    const total = Number(inv.total) || 0;
    const paid = Math.round((paidByInvoice.get(inv.id) ?? 0) * 100) / 100;
    const due = amountDue(total, paid);

    if (
      !isInvoiceEligibleForPaymentReminder(
        inv.status as InvoiceStatus,
        inv.issued_at,
        inv.cancelled_at,
        due
      )
    ) {
      continue;
    }

    if (
      !shouldShowPaymentReminder({
        dueDate: inv.due_date,
        today,
        reminder: reminderByInvoice.get(inv.id) ?? null,
      })
    ) {
      continue;
    }

    reminders.push({
      invoice_id: inv.id,
      invoice_number: inv.invoice_number,
      buyer_name: inv.buyer_name,
      currency: inv.currency,
      total,
      amount_paid: paid,
      amount_due: due,
      due_date: inv.due_date,
      status: inv.status as InvoiceStatus,
    });
  }

  return NextResponse.json({ today, reminders });
}
