import type { SupabaseClient } from "@supabase/supabase-js";
import { todayISOInVilnius } from "./dateIso";
import { deriveInvoiceStatus } from "./invoiceStatus";
import type { AdminInvoiceRow } from "./types";

export async function sumPaymentsForInvoice(
  supabase: SupabaseClient,
  invoiceId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("admin_invoice_payments")
    .select("amount")
    .eq("invoice_id", invoiceId);
  if (error || !data) return 0;
  return Math.round(data.reduce((s, r) => s + (Number((r as { amount: unknown }).amount) || 0), 0) * 100) / 100;
}

export function deriveStatusForRow(
  row: Pick<AdminInvoiceRow, "cancelled_at" | "issued_at" | "due_date" | "total">,
  amountPaid: number
) {
  return deriveInvoiceStatus({
    cancelledAt: row.cancelled_at,
    issuedAt: row.issued_at,
    dueDate: row.due_date,
    total: Number(row.total) || 0,
    amountPaid,
    today: todayISOInVilnius(),
  });
}

export async function persistInvoiceStatus(
  supabase: SupabaseClient,
  userId: string,
  invoiceId: string,
  row: Pick<AdminInvoiceRow, "cancelled_at" | "issued_at" | "due_date" | "total">
): Promise<{ status: ReturnType<typeof deriveInvoiceStatus>; error?: string }> {
  const paid = await sumPaymentsForInvoice(supabase, invoiceId);
  const status = deriveStatusForRow(row, paid);
  const { error } = await supabase
    .from("admin_invoices")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("user_id", userId);
  if (error) return { status, error: error.message };
  return { status };
}
