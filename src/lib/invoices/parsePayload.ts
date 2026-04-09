import type { DocumentType } from "./documentTypes";
import { DOCUMENT_TYPE_LABEL_LT, getPdfTitle, isDocumentType } from "./documentTypes";
import { assertCorrectionPayloadLinked } from "./correctionInvoice";
import {
  legacyBuyerCodeColumn,
  normalizeBuyerCountry,
  normalizeBuyerType,
} from "./buyerIdentification";
import type { TaxProfileSnapshot } from "./types";
import type { InvoiceLineItem, InvoicePayload } from "./types";
import { computeLineTotal } from "./types";
import { formatSellerContactLine, splitCombinedSellerContactLine } from "./sellerContact";
import { parseServiceTimingFromBody } from "./serviceTiming";
import { FALLBACK_VAT_FOOTER_PRIMARY } from "./companyInvoiceSettings";

const MAX_LEN = 8000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function str(v: unknown, field: string): { ok: true; v: string } | { ok: false; error: string } {
  if (v === undefined || v === null) return { ok: true, v: "" };
  if (typeof v !== "string") return { ok: false, error: `${field}_invalid` };
  const t = v.trim();
  if (t.length > MAX_LEN) return { ok: false, error: `${field}_too_long` };
  return { ok: true, v: t };
}

function reqStr(v: unknown, field: string): { ok: true; v: string } | { ok: false; error: string } {
  const r = str(v, field);
  if (!r.ok) return r;
  if (!r.v) return { ok: false, error: `${field}_required` };
  return r;
}

function parseDocumentType(v: unknown): { ok: true; v: DocumentType } | { ok: false; error: string } {
  if (v === undefined || v === null || v === "") {
    return { ok: true, v: "sales_invoice" };
  }
  if (typeof v !== "string" || !isDocumentType(v)) {
    return { ok: false, error: "document_type_invalid" };
  }
  return { ok: true, v };
}

function parseTaxSnapshot(
  v: unknown
): { ok: true; v: TaxProfileSnapshot } | { ok: false; error: string } {
  if (v === undefined || v === null) {
    return { ok: true, v: { type: "non_vat" } };
  }
  if (typeof v !== "object" || !v) return { ok: false, error: "tax_profile_snapshot_invalid" };
  const t = (v as { type?: unknown }).type;
  if (t === "non_vat" || t === "vat" || t === "vat_svs") {
    return { ok: true, v: { type: t } };
  }
  return { ok: false, error: "tax_profile_snapshot_invalid" };
}

function parseLineItems(raw: unknown): { ok: true; items: InvoiceLineItem[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: "line_items_required" };
  }
  const items: InvoiceLineItem[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object") return { ok: false, error: "line_items_invalid" };
    const o = row as Record<string, unknown>;
    const desc = typeof o.description === "string" ? o.description.trim() : "";
    if (!desc) return { ok: false, error: "line_description_required" };
    const quantity = Number(o.quantity);
    const unit_price = Number(o.unit_price);
    if (!Number.isFinite(quantity) || quantity <= 0) return { ok: false, error: "line_quantity_invalid" };
    if (!Number.isFinite(unit_price) || unit_price < 0) return { ok: false, error: "line_price_invalid" };
    const unit = typeof o.unit === "string" && o.unit.trim() ? o.unit.trim() : "vnt.";
    const line_total = computeLineTotal({ quantity, unit_price });
    items.push({ description: desc, quantity, unit, unit_price, line_total });
  }
  return { ok: true, items };
}

export function parseInvoicePayload(
  body: unknown
): { ok: true; data: InvoicePayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "invalid_body" };
  const b = body as Record<string, unknown>;

  const document_type = parseDocumentType(b.document_type);
  if (!document_type.ok) return document_type;

  const invoice_number = reqStr(b.invoice_number, "invoice_number");
  if (!invoice_number.ok) return invoice_number;
  const issue_date = reqStr(b.issue_date, "issue_date");
  if (!issue_date.ok) return issue_date;
  if (!ISO_DATE.test(issue_date.v)) return { ok: false, error: "issue_date_invalid" };
  const due_date = reqStr(b.due_date, "due_date");
  if (!due_date.ok) return due_date;
  if (!ISO_DATE.test(due_date.v)) return { ok: false, error: "due_date_invalid" };

  const timing = parseServiceTimingFromBody(b);
  if (!timing.ok) return timing;

  const docTitle = str(b.document_title, "document_title");
  if (!docTitle.ok) return docTitle;
  const invType = str(b.invoice_type, "invoice_type");
  if (!invType.ok) return invType;

  const seller_name = reqStr(b.seller_name, "seller_name");
  if (!seller_name.ok) return seller_name;
  const seller_code = reqStr(b.seller_code, "seller_code");
  if (!seller_code.ok) return seller_code;
  const seller_address = reqStr(b.seller_address, "seller_address");
  if (!seller_address.ok) return seller_address;
  const seller_email_raw = str(b.seller_email, "seller_email");
  if (!seller_email_raw.ok) return seller_email_raw;
  const seller_phone_raw = str(b.seller_phone, "seller_phone");
  if (!seller_phone_raw.ok) return seller_phone_raw;
  const seller_contact_line_raw = str(b.seller_contact_line, "seller_contact_line");
  if (!seller_contact_line_raw.ok) return seller_contact_line_raw;

  let seller_email = seller_email_raw.v;
  let seller_phone = seller_phone_raw.v;
  if (!seller_email && !seller_phone && seller_contact_line_raw.v) {
    const split = splitCombinedSellerContactLine(seller_contact_line_raw.v);
    seller_email = split.email;
    seller_phone = split.phone;
  }
  const seller_contact_line = formatSellerContactLine(seller_email, seller_phone);
  if (!seller_contact_line) {
    return { ok: false, error: "seller_contact_required" };
  }

  const seller_bank_account = reqStr(b.seller_bank_account, "seller_bank_account");
  if (!seller_bank_account.ok) return seller_bank_account;
  const buyer_name = reqStr(b.buyer_name, "buyer_name");
  if (!buyer_name.ok) return buyer_name;

  const buyer_code_raw = str(b.buyer_code, "buyer_code");
  if (!buyer_code_raw.ok) return buyer_code_raw;

  const buyer_country_raw = str(b.buyer_country, "buyer_country");
  if (!buyer_country_raw.ok) return buyer_country_raw;
  const buyer_country = normalizeBuyerCountry(buyer_country_raw.v || "LT");
  const buyer_type = normalizeBuyerType(b.buyer_type);

  let buyer_company_code = str(b.buyer_company_code, "buyer_company_code");
  if (!buyer_company_code.ok) return buyer_company_code;
  const buyer_registration_number = str(b.buyer_registration_number, "buyer_registration_number");
  if (!buyer_registration_number.ok) return buyer_registration_number;
  const buyer_vat_number = str(b.buyer_vat_number, "buyer_vat_number");
  if (!buyer_vat_number.ok) return buyer_vat_number;

  if (
    buyer_type === "company" &&
    buyer_country === "LT" &&
    !buyer_company_code.v.trim() &&
    buyer_code_raw.v.trim()
  ) {
    buyer_company_code = { ok: true, v: buyer_code_raw.v.trim() };
  }

  const buyer_code_computed =
    legacyBuyerCodeColumn({
      buyer_type,
      buyer_country,
      buyer_company_code: buyer_company_code.v,
      buyer_registration_number: buyer_registration_number.v,
    }) ?? "";

  const buyer_address = str(b.buyer_address, "buyer_address");
  if (!buyer_address.ok) return buyer_address;
  const buyer_email_raw = str(b.buyer_email, "buyer_email");
  if (!buyer_email_raw.ok) return buyer_email_raw;
  const buyer_phone_raw = str(b.buyer_phone, "buyer_phone");
  if (!buyer_phone_raw.ok) return buyer_phone_raw;
  const buyer_contact_raw = str(b.buyer_contact, "buyer_contact");
  if (!buyer_contact_raw.ok) return buyer_contact_raw;

  let buyer_email = buyer_email_raw.v;
  let buyer_phone = buyer_phone_raw.v;
  if (!buyer_email && !buyer_phone && buyer_contact_raw.v) {
    const split = splitCombinedSellerContactLine(buyer_contact_raw.v);
    buyer_email = split.email;
    buyer_phone = split.phone;
  }
  const buyer_contact = formatSellerContactLine(buyer_email, buyer_phone) || buyer_contact_raw.v;

  const currencyRaw = str(b.currency, "currency");
  if (!currencyRaw.ok) return currencyRaw;
  const currency = currencyRaw.v || "EUR";
  if (currency.length !== 3) return { ok: false, error: "currency_invalid" };

  const notes = str(b.notes, "notes");
  if (!notes.ok) return notes;
  const vat_summary_line = str(b.vat_summary_line, "vat_summary_line");
  if (!vat_summary_line.ok) return vat_summary_line;
  const vat = vat_summary_line.v || FALLBACK_VAT_FOOTER_PRIMARY;

  const taxSnap = parseTaxSnapshot(b.tax_profile_snapshot);
  if (!taxSnap.ok) return taxSnap;

  const lines = parseLineItems(b.line_items);
  if (!lines.ok) return lines;

  const id = typeof b.id === "string" && /^[0-9a-f-]{36}$/i.test(b.id) ? b.id : undefined;

  const related =
    typeof b.related_invoice_id === "string" && /^[0-9a-f-]{36}$/i.test(b.related_invoice_id)
      ? b.related_invoice_id
      : undefined;

  const source_proforma_id =
    typeof b.source_proforma_id === "string" && /^[0-9a-f-]{36}$/i.test(b.source_proforma_id)
      ? b.source_proforma_id
      : undefined;

  let correction_original_total_snapshot: number | undefined;
  if (b.correction_original_total_snapshot !== undefined && b.correction_original_total_snapshot !== null) {
    const raw = b.correction_original_total_snapshot;
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    if (!Number.isFinite(n)) return { ok: false, error: "correction_original_total_snapshot_invalid" };
    correction_original_total_snapshot = Math.round(n * 100) / 100;
  }

  const dt = document_type.v;
  const document_title = docTitle.v || getPdfTitle(dt);
  const invoice_type = invType.v || DOCUMENT_TYPE_LABEL_LT[dt];

  const link = assertCorrectionPayloadLinked({ document_type: dt, related_invoice_id: related });
  if (!link.ok) return link;

  return {
    ok: true,
    data: {
      id,
      document_type: dt,
      invoice_number: invoice_number.v,
      issue_date: issue_date.v,
      service_date: timing.service_date,
      service_period_from: timing.service_period_from,
      service_period_to: timing.service_period_to,
      due_date: due_date.v,
      document_title,
      invoice_type,
      seller_name: seller_name.v,
      seller_code: seller_code.v,
      seller_address: seller_address.v,
      seller_email,
      seller_phone,
      seller_contact_line,
      seller_bank_account: seller_bank_account.v,
      buyer_name: buyer_name.v,
      buyer_country,
      buyer_type,
      buyer_company_code: buyer_company_code.v,
      buyer_registration_number: buyer_registration_number.v,
      buyer_vat_number: buyer_vat_number.v,
      buyer_code: buyer_code_computed,
      buyer_address: buyer_address.v,
      buyer_email,
      buyer_phone,
      buyer_contact,
      currency,
      line_items: lines.items,
      notes: notes.v,
      vat_summary_line: vat,
      tax_profile_snapshot: taxSnap.v,
      related_invoice_id: related,
      ...(source_proforma_id !== undefined ? { source_proforma_id } : {}),
      ...(correction_original_total_snapshot !== undefined
        ? { correction_original_total_snapshot }
        : {}),
    },
  };
}
