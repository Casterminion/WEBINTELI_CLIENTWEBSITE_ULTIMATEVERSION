/** Order: most-used default first (UI select + mental model). */
export const DOCUMENT_TYPES = [
  "sales_invoice",
  "proforma_invoice",
  "credit_note",
  "debit_note",
  "vat_invoice",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export function isDocumentType(s: string): s is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(s);
}

/** Document types allowed on the global “new invoice” screen (no standalone credit/debit). */
export const STANDALONE_NEW_INVOICE_TYPES: DocumentType[] = ["sales_invoice", "proforma_invoice", "vat_invoice"];

export function isCorrectionDocumentType(dt: DocumentType): boolean {
  return dt === "credit_note" || dt === "debit_note";
}

const PREFIX: Record<DocumentType, string> = {
  proforma_invoice: "ISK",
  sales_invoice: "SF",
  credit_note: "KS",
  debit_note: "DS",
  vat_invoice: "PVM",
};

/** Lithuanian UI labels */
export const DOCUMENT_TYPE_LABEL_LT: Record<DocumentType, string> = {
  proforma_invoice: "Išankstinė sąskaita",
  sales_invoice: "Sąskaita faktūra",
  credit_note: "Kreditinė sąskaita",
  debit_note: "Debetinė sąskaita",
  vat_invoice: "PVM sąskaita faktūra",
};

/** Uppercase title block on PDF */
export const PDF_TITLE_BY_TYPE: Record<DocumentType, string> = {
  proforma_invoice: "IŠANKSTINĖ SĄSKAITA",
  sales_invoice: "SĄSKAITA FAKTŪRA",
  credit_note: "KREDITINĖ SĄSKAITA",
  debit_note: "DEBETINĖ SĄSKAITA",
  vat_invoice: "PVM SĄSKAITA FAKTŪRA",
};

export function documentTypePrefix(t: DocumentType): string {
  return PREFIX[t];
}

export function getPdfTitle(documentType: DocumentType): string {
  return PDF_TITLE_BY_TYPE[documentType];
}

export function vatInvoicesEnabledFromEnv(): boolean {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_ENABLE_VAT_INVOICES === "true") {
    return true;
  }
  return false;
}

export function documentTypeSelectable(
  t: DocumentType,
  opts: { enableVatFromDb?: boolean; taxProfileType?: "non_vat" | "vat" | "vat_svs" }
): boolean {
  if (t === "vat_invoice") {
    const profile = opts.taxProfileType ?? "non_vat";
    if (profile === "vat" || profile === "vat_svs") {
      return true;
    }
    return vatInvoicesEnabledFromEnv() || opts.enableVatFromDb === true;
  }
  return true;
}
