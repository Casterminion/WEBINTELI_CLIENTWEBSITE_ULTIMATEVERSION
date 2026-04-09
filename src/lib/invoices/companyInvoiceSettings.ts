import type { DocumentType } from "./documentTypes";
import { documentTypePrefix, documentTypeSelectable } from "./documentTypes";
import { formatSellerContactLine } from "./sellerContact";
import type { AdminCompanyTaxSettingsRow, InvoicePayload, TaxProfileSnapshot } from "./types";
import type { TaxProfileType } from "./invoiceStatus";

/** Last-resort literal if settings footer fields are empty (parsing legacy payloads). Mirror: `backend/src/invoice/vatFooterFallback.ts`. */
export const FALLBACK_VAT_FOOTER_PRIMARY = "PVM neskaičiuojamas.";

/**
 * Non-VAT PDF/footer line: primary (e.g. accounting note) + optional seller status line from settings.
 */
export function buildNonVatVatSummaryLine(
  settings: Pick<AdminCompanyTaxSettingsRow, "default_vat_footer_note" | "seller_not_vat_payer_note">
): string {
  const primary = settings.default_vat_footer_note?.trim() || FALLBACK_VAT_FOOTER_PRIMARY;
  const secondary = settings.seller_not_vat_payer_note?.trim() ?? "";
  return secondary ? `${primary}\n\n${secondary}` : primary;
}

export function taxProfileSnapshotFromSettings(settings: AdminCompanyTaxSettingsRow): TaxProfileSnapshot {
  const t = settings.tax_profile_type;
  if (t === "vat" || t === "vat_svs" || t === "non_vat") return { type: t };
  return { type: "non_vat" };
}

/** Prefill seller + currency + non-VAT footer text for new/editing drafts from company settings. */
export function sellerPayloadFromCompanySettings(
  settings: AdminCompanyTaxSettingsRow
): Pick<
  InvoicePayload,
  | "seller_name"
  | "seller_code"
  | "seller_address"
  | "seller_email"
  | "seller_phone"
  | "seller_contact_line"
  | "seller_bank_account"
  | "currency"
  | "vat_summary_line"
  | "tax_profile_snapshot"
> {
  const email = settings.company_email?.trim() ?? "";
  const phone = settings.company_phone?.trim() ?? "";
  return {
    seller_name: settings.company_name?.trim() ?? "",
    seller_code: settings.company_code?.trim() ?? "",
    seller_address: settings.company_address?.trim() ?? "",
    seller_email: email,
    seller_phone: phone,
    seller_contact_line: formatSellerContactLine(email, phone),
    seller_bank_account: settings.bank_account?.trim() ?? "",
    currency: (settings.default_currency?.trim() || "EUR").toUpperCase().slice(0, 3),
    vat_summary_line: buildNonVatVatSummaryLine(settings),
    tax_profile_snapshot: taxProfileSnapshotFromSettings(settings),
  };
}

const PREFIX_KEYS: Record<DocumentType, keyof AdminCompanyTaxSettingsRow | null> = {
  sales_invoice: "invoice_number_prefix_sales",
  proforma_invoice: "invoice_number_prefix_proforma",
  credit_note: "invoice_number_prefix_credit",
  debit_note: "invoice_number_prefix_debit",
  vat_invoice: "invoice_number_prefix_vat",
};

export function invoiceNumberPrefixForDocumentType(
  documentType: DocumentType,
  settings: AdminCompanyTaxSettingsRow | null | undefined
): string {
  if (!settings) return documentTypePrefix(documentType);
  const key = PREFIX_KEYS[documentType];
  if (!key) return documentTypePrefix(documentType);
  const raw = settings[key];
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return documentTypePrefix(documentType);
  return s.toUpperCase();
}

export type InvoiceTaxPresentation = {
  taxProfileType: TaxProfileType;
  /** Combined non-VAT footer for forms/PDF payload field `vat_summary_line` when profile is non_vat. */
  nonVatVatSummaryLine: string;
  /** Whether VAT invoice type should appear in selectors (env/DB flags + tax profile). */
  vatInvoiceSelectable: boolean;
  /** Company VAT code required when saving settings (vat / vat_svs). */
  companyVatCodeRequired: boolean;
  /** Show non-VAT PDF tax note field (`vat_summary_line`) in the invoice editor. */
  showNonVatPdfTaxNote: boolean;
  /** Line-level VAT rate/amount columns — reserved for future VAT line items (not implemented). */
  showLineVatColumns: boolean;
};

export function resolveInvoiceTaxPresentation(settings: AdminCompanyTaxSettingsRow): InvoiceTaxPresentation {
  const taxProfileType = settings.tax_profile_type;
  const vatInvoiceSelectable = documentTypeSelectable("vat_invoice", {
    enableVatFromDb: settings.enable_vat_invoices,
    taxProfileType,
  });
  const companyVatCodeRequired = taxProfileType === "vat" || taxProfileType === "vat_svs";
  return {
    taxProfileType,
    nonVatVatSummaryLine: buildNonVatVatSummaryLine(settings),
    vatInvoiceSelectable,
    companyVatCodeRequired,
    showNonVatPdfTaxNote: taxProfileType === "non_vat",
    showLineVatColumns: false,
  };
}
