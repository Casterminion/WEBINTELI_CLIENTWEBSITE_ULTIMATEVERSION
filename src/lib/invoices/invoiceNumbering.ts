import type { DocumentType } from "./documentTypes";
import { documentTypePrefix } from "./documentTypes";

/** Draft rows use this prefix; final series numbers are assigned only on issue. */
export const DRAFT_INVOICE_NUMBER_PREFIX = "DRAFT-";

export function isDraftPlaceholderInvoiceNumber(invoiceNumber: string): boolean {
  const t = invoiceNumber.trim();
  return t.startsWith(DRAFT_INVOICE_NUMBER_PREFIX);
}

/** Stable internal placeholder until issue (never a public series number). */
export function makeDraftInvoiceNumber(): string {
  return `${DRAFT_INVOICE_NUMBER_PREFIX}${crypto.randomUUID()}`;
}

const FORMAL_NUM_RE = /^(SF|ISK|KS|DS|PVM)-(\d+)$/i;

export function isFormalSeriesInvoiceNumber(invoiceNumber: string): boolean {
  return FORMAL_NUM_RE.test(invoiceNumber.trim());
}

/** True if the number matches the expected prefix for this document type (case-insensitive). */
export function formalNumberMatchesDocumentType(documentType: DocumentType, invoiceNumber: string): boolean {
  const m = invoiceNumber.trim().match(FORMAL_NUM_RE);
  if (!m) return false;
  const expected = documentTypePrefix(documentType).toUpperCase();
  return m[1].toUpperCase() === expected;
}
