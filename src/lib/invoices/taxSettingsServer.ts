import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentType } from "./documentTypes";
import { vatInvoicesEnabledFromEnv } from "./documentTypes";
import type { AdminCompanyTaxSettingsRow } from "./types";

export async function ensureCompanyTaxSettings(
  supabase: SupabaseClient,
  userId: string
): Promise<AdminCompanyTaxSettingsRow> {
  const { data: existing, error: selErr } = await supabase
    .from("admin_company_tax_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (selErr) {
    throw new Error(selErr.message);
  }
  if (existing) {
    return existing as AdminCompanyTaxSettingsRow;
  }

  const { data: created, error: insErr } = await supabase
    .from("admin_company_tax_settings")
    .insert({ user_id: userId })
    .select("*")
    .single();

  if (insErr || !created) {
    throw new Error(insErr?.message ?? "tax_settings_insert_failed");
  }
  return created as AdminCompanyTaxSettingsRow;
}

export function assertVatInvoiceAllowed(settings: AdminCompanyTaxSettingsRow, documentType: DocumentType): void {
  if (documentType !== "vat_invoice") return;
  if (settings.tax_profile_type === "vat" || settings.tax_profile_type === "vat_svs") {
    return;
  }
  if (!vatInvoicesEnabledFromEnv() && !settings.enable_vat_invoices) {
    throw new Error("vat_invoice_disabled");
  }
}
