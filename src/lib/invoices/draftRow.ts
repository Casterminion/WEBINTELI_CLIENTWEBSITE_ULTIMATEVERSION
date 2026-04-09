import { legacyBuyerCodeColumn, normalizeBuyerCountry } from "./buyerIdentification";
import { isCorrectionDocumentType } from "./documentTypes";
import type { InvoicePayload } from "./types";
import { computeInvoiceSubtotal, syncDisplayFieldsFromDocumentType } from "./types";

export function invoiceTotals(payload: InvoicePayload): { subtotal: number; total: number } {
  const subtotal = computeInvoiceSubtotal(payload.line_items);
  return { subtotal, total: subtotal };
}

export function buildDraftUpsertRow(
  userId: string,
  payload: InvoicePayload,
  opts: { pdf_storage_path?: string | null; correctionOriginalTotalSnapshot?: number }
): Record<string, unknown> {
  const synced = syncDisplayFieldsFromDocumentType(payload);
  const { subtotal, total } = invoiceTotals(synced);
  const isCorrection = isCorrectionDocumentType(synced.document_type) && Boolean(synced.related_invoice_id?.trim());
  const firstLineDesc = synced.line_items[0]?.description?.trim() ?? "";
  let correction_original_total_snapshot: number | null = null;
  if (isCorrection) {
    if (opts.correctionOriginalTotalSnapshot !== undefined) {
      correction_original_total_snapshot = Math.round(opts.correctionOriginalTotalSnapshot * 100) / 100;
    } else if (
      synced.correction_original_total_snapshot != null &&
      Number.isFinite(Number(synced.correction_original_total_snapshot))
    ) {
      correction_original_total_snapshot = Math.round(Number(synced.correction_original_total_snapshot) * 100) / 100;
    }
  }
  const buyer_country = normalizeBuyerCountry(synced.buyer_country);
  const buyer_type = synced.buyer_type === "natural_person" ? "natural_person" : "company";
  const buyer_company_code = synced.buyer_company_code.trim() ? synced.buyer_company_code.trim() : null;
  const buyer_registration_number = synced.buyer_registration_number.trim()
    ? synced.buyer_registration_number.trim()
    : null;
  const buyer_vat_number = synced.buyer_vat_number.trim() ? synced.buyer_vat_number.trim() : null;
  const buyer_code =
    legacyBuyerCodeColumn({
      buyer_type,
      buyer_country,
      buyer_company_code: synced.buyer_company_code,
      buyer_registration_number: synced.buyer_registration_number,
    }) ?? null;

  const row: Record<string, unknown> = {
    user_id: userId,
    document_type: synced.document_type,
    invoice_number: synced.invoice_number,
    issue_date: synced.issue_date,
    service_date: synced.service_date.trim() ? synced.service_date.trim() : null,
    service_period_from: synced.service_period_from.trim() ? synced.service_period_from.trim() : null,
    service_period_to: synced.service_period_to.trim() ? synced.service_period_to.trim() : null,
    due_date: synced.due_date,
    document_title: synced.document_title,
    invoice_type: synced.invoice_type,
    seller_name: synced.seller_name,
    seller_code: synced.seller_code,
    seller_address: synced.seller_address,
    seller_email: synced.seller_email.trim() ? synced.seller_email.trim() : null,
    seller_phone: synced.seller_phone.trim() ? synced.seller_phone.trim() : null,
    seller_contact_line: synced.seller_contact_line,
    seller_bank_account: synced.seller_bank_account,
    buyer_name: synced.buyer_name,
    buyer_country,
    buyer_type,
    buyer_company_code,
    buyer_registration_number,
    buyer_vat_number,
    buyer_code,
    buyer_address: synced.buyer_address.trim() ? synced.buyer_address.trim() : null,
    buyer_contact: synced.buyer_contact.trim() ? synced.buyer_contact.trim() : null,
    currency: synced.currency,
    line_items: synced.line_items,
    notes: synced.notes.trim() ? synced.notes.trim() : null,
    vat_summary_line: synced.vat_summary_line,
    tax_profile_snapshot: synced.tax_profile_snapshot,
    related_invoice_id: synced.related_invoice_id ?? null,
    source_proforma_id:
      typeof synced.source_proforma_id === "string" && /^[0-9a-f-]{36}$/i.test(synced.source_proforma_id)
        ? synced.source_proforma_id
        : null,
    subtotal,
    total,
    status: "draft",
    updated_at: new Date().toISOString(),
    correction_reason: isCorrection ? (firstLineDesc || null) : null,
    correction_amount: isCorrection ? total : null,
    correction_original_total_snapshot: isCorrection ? correction_original_total_snapshot : null,
  };
  if (opts.pdf_storage_path !== undefined) {
    row.pdf_storage_path = opts.pdf_storage_path;
  }
  return row;
}
