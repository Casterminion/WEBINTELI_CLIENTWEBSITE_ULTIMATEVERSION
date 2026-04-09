import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentType } from "./documentTypes";
import { salesSequenceFloor } from "./invoiceNumber";
import type { AdminCompanyTaxSettingsRow } from "./types";

/**
 * Before RPC `admin_next_invoice_sequence`, ensure `last_sequence` is at least the settings floor
 * (e.g. user already issued SF-001 manually — floor 1 — so RPC returns 2 → SF-002).
 */
export async function ensureInvoiceSequenceAtLeastFloor(
  supabase: SupabaseClient,
  userId: string,
  documentType: DocumentType,
  settings: AdminCompanyTaxSettingsRow
): Promise<void> {
  const floor = documentType === "sales_invoice" ? salesSequenceFloor(settings) : 0;
  if (floor <= 0) return;

  const { data: seqRow, error } = await supabase
    .from("admin_invoice_sequences")
    .select("last_sequence")
    .eq("user_id", userId)
    .eq("document_type", documentType)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const current = seqRow ? Number((seqRow as { last_sequence: number }).last_sequence) || 0 : 0;
  const target = Math.max(current, floor);
  if (target <= current) return;

  const { error: upErr } = await supabase.from("admin_invoice_sequences").upsert(
    { user_id: userId, document_type: documentType, last_sequence: target },
    { onConflict: "user_id,document_type" }
  );

  if (upErr) {
    throw new Error(upErr.message);
  }
}
