/**
 * Keep in sync with `src/lib/invoices/companyInvoiceSettings.ts` → FALLBACK_VAT_FOOTER_PRIMARY.
 * Used when parsing payloads with an empty `vat_summary_line` (legacy / worker).
 */
export const FALLBACK_VAT_FOOTER_PRIMARY = "PVM neskaičiuojamas.";
