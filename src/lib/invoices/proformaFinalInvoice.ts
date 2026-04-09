import { normalizeBuyerCountry, normalizeBuyerType } from "./buyerIdentification";
import { formatSellerContactLine, splitCombinedSellerContactLine } from "./sellerContact";
import type { AdminInvoiceRow, InvoicePayload } from "./types";

/**
 * When the proforma was issued, PDF party blocks were frozen in snapshot JSON.
 * Prefer those values on the final sales draft so it matches the commercial document.
 */
export function applyIssuedPartySnapshotsFromRow(row: AdminInvoiceRow, payload: InvoicePayload): InvoicePayload {
  if (!row.issued_at) return payload;
  let out = { ...payload };

  const sj = row.seller_snapshot_json;
  if (sj && typeof sj === "object") {
    const r = sj as Record<string, unknown>;
    if (typeof r.seller_name === "string") out.seller_name = r.seller_name;
    if (typeof r.seller_code === "string") out.seller_code = r.seller_code;
    if (typeof r.seller_address === "string") out.seller_address = r.seller_address;
    if (typeof r.seller_email === "string") out.seller_email = r.seller_email;
    if (typeof r.seller_phone === "string") out.seller_phone = r.seller_phone;
    if (typeof r.seller_bank_account === "string") out.seller_bank_account = r.seller_bank_account;
    if (typeof r.seller_contact_line === "string") {
      out.seller_contact_line = r.seller_contact_line;
    } else {
      out.seller_contact_line = formatSellerContactLine(out.seller_email, out.seller_phone);
    }
    if (typeof r.vat_summary_line === "string") out.vat_summary_line = r.vat_summary_line;
    const ts = r.tax_profile_snapshot;
    if (ts && typeof ts === "object" && ts !== null && "type" in ts) {
      const typ = (ts as { type?: unknown }).type;
      if (typ === "non_vat" || typ === "vat" || typ === "vat_svs") {
        out.tax_profile_snapshot = { type: typ };
      }
    }
  }

  const bj = row.buyer_snapshot_json;
  if (bj && typeof bj === "object") {
    const b = bj as Record<string, unknown>;
    if (typeof b.buyer_name === "string") out.buyer_name = b.buyer_name;
    if (typeof b.buyer_address === "string") out.buyer_address = b.buyer_address;
    if (typeof b.buyer_email === "string") out.buyer_email = b.buyer_email;
    if (typeof b.buyer_phone === "string") out.buyer_phone = b.buyer_phone;
    if (typeof b.buyer_contact === "string") out.buyer_contact = b.buyer_contact;
    if (typeof b.buyer_company_code === "string") out.buyer_company_code = b.buyer_company_code;
    if (typeof b.buyer_registration_number === "string") out.buyer_registration_number = b.buyer_registration_number;
    if (typeof b.buyer_vat_number === "string") out.buyer_vat_number = b.buyer_vat_number;
    if (typeof b.buyer_country === "string") out.buyer_country = normalizeBuyerCountry(b.buyer_country);
    if (b.buyer_type !== undefined && b.buyer_type !== null) {
      out.buyer_type = normalizeBuyerType(b.buyer_type);
    }
    if (typeof b.buyer_code === "string") out.buyer_code = b.buyer_code;
    if (!out.buyer_email?.trim() && !out.buyer_phone?.trim() && out.buyer_contact?.trim()) {
      const sp = splitCombinedSellerContactLine(out.buyer_contact);
      if (sp.email) out.buyer_email = sp.email;
      if (sp.phone) out.buyer_phone = sp.phone;
    }
  }

  return out;
}

/**
 * Proforma must be issued before creating the final SF (commercial advance sent to client).
 */
export function canCreateFinalSalesInvoiceFromProforma(
  proforma: Pick<AdminInvoiceRow, "document_type" | "status" | "cancelled_at" | "issued_at">
): boolean {
  if (proforma.document_type !== "proforma_invoice") return false;
  if (proforma.cancelled_at || proforma.status === "cancelled") return false;
  if (!proforma.issued_at) return false;
  return true;
}

export function parseFinalFromProformaBody(
  body: unknown
): { ok: true; proforma_invoice_id: string } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "invalid_body" };
  const id = typeof (body as { proforma_invoice_id?: unknown }).proforma_invoice_id === "string"
    ? (body as { proforma_invoice_id: string }).proforma_invoice_id.trim()
    : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "proforma_invoice_id_invalid" };
  return { ok: true, proforma_invoice_id: id };
}
