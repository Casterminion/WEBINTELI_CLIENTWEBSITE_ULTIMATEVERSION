import type { DocumentType } from "./documentTypes";
import { DOCUMENT_TYPE_LABEL_LT, getPdfTitle, isDocumentType } from "./documentTypes";
import {
  legacyBuyerCodeColumn,
  normalizeBuyerCountry,
  normalizeBuyerType,
  type BuyerType,
} from "./buyerIdentification";
import type { InvoiceStatus, TaxProfileType } from "./invoiceStatus";
import { formatSellerContactLine, sellerEmailPhoneFromRow } from "./sellerContact";

export type { BuyerType };

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
};

export type TaxProfileSnapshot = { type: TaxProfileType };

/** Payload for PDF + form + API */
export type InvoicePayload = {
  id?: string;
  document_type: DocumentType;
  invoice_number: string;
  issue_date: string;
  /** Vienos dienos paslaugos data (YYYY-MM-DD); tuščia, kai naudojamas laikotarpis. */
  service_date: string;
  /** Paslaugų laikotarpis — abi datos privalomos kartu; tuščia, kai naudojama service_date. */
  service_period_from: string;
  service_period_to: string;
  due_date: string;
  /** Sinchronizuojama su DB; PDF naudoja document_type */
  document_title: string;
  invoice_type: string;
  seller_name: string;
  seller_code: string;
  seller_address: string;
  seller_email: string;
  seller_phone: string;
  /** Sudaryta iš el. pašto ir telefono (suderinamumas / PDF apačia). */
  seller_contact_line: string;
  seller_bank_account: string;
  buyer_name: string;
  /** ISO 3166-1 alpha-2 */
  buyer_country: string;
  buyer_type: BuyerType;
  /** Lithuanian company code when buyer_country is LT */
  buyer_company_code: string;
  /** Foreign company registration number when buyer_country is not LT */
  buyer_registration_number: string;
  /** VAT / PVM payer identifier (optional; not the company code) */
  buyer_vat_number: string;
  /** Legacy single-column mirror for exports / older rows */
  buyer_code: string;
  buyer_address: string;
  /** Buyer e-mail / phone (PDF); `buyer_contact` stays the combined legacy field. */
  buyer_email: string;
  buyer_phone: string;
  buyer_contact: string;
  currency: string;
  line_items: InvoiceLineItem[];
  notes: string;
  /** Pardavėjo pastaba / PVM eilutė PDF apačioje (konfigūruojama) */
  vat_summary_line: string;
  tax_profile_snapshot: TaxProfileSnapshot;
  related_invoice_id?: string;
  /** Set when this sales_invoice was created from a proforma (Išankstinė). */
  source_proforma_id?: string;
  /** Snapshot of original invoice total when a correction draft was created (read-only in UI). */
  correction_original_total_snapshot?: number | null;
};

export type AdminInvoiceRow = {
  id: string;
  user_id: string;
  document_type: DocumentType;
  invoice_number: string;
  issue_date: string;
  service_date: string | null;
  service_period_from?: string | null;
  service_period_to?: string | null;
  due_date: string;
  document_title: string;
  invoice_type: string;
  seller_name: string;
  seller_code: string;
  seller_address: string;
  seller_email?: string | null;
  seller_phone?: string | null;
  seller_contact_line: string;
  seller_bank_account: string;
  buyer_name: string;
  buyer_country?: string | null;
  buyer_type?: string | null;
  buyer_company_code?: string | null;
  buyer_registration_number?: string | null;
  buyer_vat_number?: string | null;
  buyer_code: string | null;
  buyer_address: string | null;
  buyer_email?: string | null;
  buyer_phone?: string | null;
  buyer_contact: string | null;
  currency: string;
  line_items: InvoiceLineItem[];
  notes: string | null;
  vat_summary_line: string;
  pdf_storage_path: string | null;
  status: InvoiceStatus;
  subtotal: number;
  total: number;
  tax_profile_snapshot: TaxProfileSnapshot | Record<string, unknown> | null;
  related_invoice_id: string | null;
  source_proforma_id?: string | null;
  correction_reason?: string | null;
  correction_amount?: number | null;
  correction_original_total_snapshot?: number | null;
  issued_at: string | null;
  cancelled_at: string | null;
  seller_snapshot_json: Record<string, unknown> | null;
  buyer_snapshot_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type AdminInvoicePaymentRow = {
  id: string;
  user_id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  note: string | null;
  attachment_storage_path?: string | null;
  created_at: string;
  updated_at?: string;
};

export type AdminCompanyTaxSettingsRow = {
  user_id: string;
  tax_profile_type: TaxProfileType;
  default_vat_footer_note: string;
  vat_turnover_manual_eur: number | null;
  /** Manual estimate for EU goods acquisitions (14k EUR widget); migration 033. */
  vat_eu_acquisitions_manual_eur?: number | null;
  purchases_services_from_foreign: boolean;
  provides_b2b_services_to_eu: boolean;
  enable_vat_invoices: boolean;
  require_buyer_company_code: boolean;
  updated_at: string;
  /** Present after migration 031; helpers treat missing as empty / code defaults. */
  seller_not_vat_payer_note?: string;
  company_name?: string;
  company_code?: string;
  company_vat_code?: string | null;
  company_address?: string;
  company_email?: string;
  company_phone?: string;
  company_website?: string | null;
  company_country?: string;
  bank_name?: string | null;
  bank_account?: string;
  bank_swift?: string | null;
  default_currency?: string;
  default_payment_term_days?: number;
  default_invoice_notes?: string;
  invoice_number_prefix_sales?: string | null;
  invoice_number_prefix_proforma?: string | null;
  invoice_number_prefix_credit?: string | null;
  invoice_number_prefix_debit?: string | null;
  invoice_number_prefix_vat?: string | null;
  /** After migration 032: min consumed SF count if some SFs were issued outside the app. */
  invoice_sequence_floor_sales?: number | null;
};

/**
 * Structural defaults for new invoices; seller, currency, footer text, and notes come from
 * `admin_company_tax_settings` via `sellerPayloadFromCompanySettings` / defaults merge.
 */
export const WEBINTELI_INVOICE_DEFAULTS = {
  document_type: "sales_invoice" as const,
  document_title: getPdfTitle("sales_invoice"),
  invoice_type: DOCUMENT_TYPE_LABEL_LT.sales_invoice,
  service_period_from: "",
  service_period_to: "",
  seller_name: "",
  seller_code: "",
  seller_address: "",
  seller_email: "",
  seller_phone: "",
  seller_contact_line: "",
  seller_bank_account: "",
  buyer_country: "LT",
  buyer_type: "company" as BuyerType,
  buyer_company_code: "",
  buyer_registration_number: "",
  buyer_vat_number: "",
  buyer_code: "",
  buyer_address: "",
  buyer_email: "",
  buyer_phone: "",
  buyer_contact: "",
  currency: "EUR",
  vat_summary_line: "",
  tax_profile_snapshot: { type: "non_vat" } as TaxProfileSnapshot,
};

export function emptyLineItem(): InvoiceLineItem {
  return {
    description: "",
    quantity: 1,
    unit: "vnt.",
    unit_price: 0,
    line_total: 0,
  };
}

export function computeLineTotal(item: Pick<InvoiceLineItem, "quantity" | "unit_price">): number {
  const q = Number(item.quantity) || 0;
  const p = Number(item.unit_price) || 0;
  return Math.round(q * p * 100) / 100;
}

export function computeInvoiceSubtotal(items: InvoiceLineItem[]): number {
  return Math.round(items.reduce((s, row) => s + (Number(row.line_total) || 0), 0) * 100) / 100;
}

function normalizeTaxSnapshot(raw: AdminInvoiceRow["tax_profile_snapshot"]): TaxProfileSnapshot {
  if (raw && typeof raw === "object" && "type" in raw) {
    const t = (raw as { type?: unknown }).type;
    if (t === "vat" || t === "vat_svs" || t === "non_vat") return { type: t };
  }
  return { type: "non_vat" };
}

export function rowToPayload(row: AdminInvoiceRow): InvoicePayload {
  const docType: DocumentType = isDocumentType(String(row.document_type))
    ? row.document_type
    : "sales_invoice";
  const { email: seller_email, phone: seller_phone } = sellerEmailPhoneFromRow(
    row.seller_contact_line,
    row.seller_email,
    row.seller_phone
  );
  const seller_contact_line =
    formatSellerContactLine(seller_email, seller_phone) || row.seller_contact_line;
  const pf = row.service_period_from?.trim() ?? "";
  const pt = row.service_period_to?.trim() ?? "";
  const usePeriodFields = Boolean(pf || pt);
  const buyerCountry = normalizeBuyerCountry(row.buyer_country ?? "LT");
  const buyerType = normalizeBuyerType(row.buyer_type);
  const companyFromCol = String(row.buyer_company_code ?? "").trim();
  const legacyCode = String(row.buyer_code ?? "").trim();
  const buyer_company_code =
    companyFromCol || (buyerCountry === "LT" && buyerType === "company" ? legacyCode : "");
  const buyer_registration_number = String(row.buyer_registration_number ?? "").trim();
  const buyer_vat_number = String(row.buyer_vat_number ?? "").trim();
  const buyer_code =
    legacyBuyerCodeColumn({
      buyer_type: buyerType,
      buyer_country: buyerCountry,
      buyer_company_code,
      buyer_registration_number,
    }) ?? "";
  const { email: buyer_email, phone: buyer_phone } = sellerEmailPhoneFromRow(
    row.buyer_contact ?? "",
    row.buyer_email,
    row.buyer_phone
  );
  const buyer_contact =
    formatSellerContactLine(buyer_email, buyer_phone) || (row.buyer_contact ?? "");
  return {
    id: row.id,
    document_type: docType,
    invoice_number: row.invoice_number,
    issue_date: row.issue_date,
    service_date: usePeriodFields ? "" : row.service_date ?? "",
    service_period_from: usePeriodFields ? pf : "",
    service_period_to: usePeriodFields ? pt : "",
    due_date: row.due_date,
    document_title: row.document_title || getPdfTitle(docType),
    invoice_type: row.invoice_type || DOCUMENT_TYPE_LABEL_LT[docType],
    seller_name: row.seller_name,
    seller_code: row.seller_code,
    seller_address: row.seller_address,
    seller_email,
    seller_phone,
    seller_contact_line,
    seller_bank_account: row.seller_bank_account,
    buyer_name: row.buyer_name,
    buyer_country: buyerCountry,
    buyer_type: buyerType,
    buyer_company_code,
    buyer_registration_number,
    buyer_vat_number,
    buyer_code,
    buyer_address: row.buyer_address ?? "",
    buyer_email,
    buyer_phone,
    buyer_contact,
    currency: row.currency,
    line_items: row.line_items,
    notes: row.notes ?? "",
    vat_summary_line: row.vat_summary_line,
    tax_profile_snapshot: normalizeTaxSnapshot(row.tax_profile_snapshot),
    related_invoice_id: row.related_invoice_id ?? undefined,
    source_proforma_id:
      typeof row.source_proforma_id === "string" && /^[0-9a-f-]{36}$/i.test(row.source_proforma_id)
        ? row.source_proforma_id
        : undefined,
    correction_original_total_snapshot: (() => {
      const v = row.correction_original_total_snapshot;
      if (v === null || v === undefined) return undefined;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : undefined;
    })(),
  };
}

/** Sinchronizuoja laisvus laukus pagal document_type (įrašymui į DB) */
export function syncDisplayFieldsFromDocumentType(payload: InvoicePayload): InvoicePayload {
  return {
    ...payload,
    document_title: getPdfTitle(payload.document_type),
    invoice_type: DOCUMENT_TYPE_LABEL_LT[payload.document_type],
    seller_contact_line: formatSellerContactLine(payload.seller_email, payload.seller_phone),
    buyer_contact:
      formatSellerContactLine(payload.buyer_email, payload.buyer_phone) || payload.buyer_contact.trim(),
  };
}
