/**
 * Invoice numbers: PREFIX-NNN (letters + hyphen + sequence, 3-digit pad by default).
 * After PREFIX-999 rolls to the next letter-series (Excel column order).
 */

import type { DocumentType } from "./documentTypes";
import { documentTypePrefix } from "./documentTypes";
import type { AdminCompanyTaxSettingsRow } from "./types";

/** Minimum digit width for new formal numbers (ISK-001, SF-001, …). */
export const INVOICE_NUMBER_DIGIT_WIDTH = 3;

export const DEFAULT_FIRST_INVOICE_NUMBER = "SF-001";

/** SF series only: how many sequence positions were already used outside the app (e.g. 1 after manual SF-001). */
export function salesSequenceFloor(settings: Pick<AdminCompanyTaxSettingsRow, "invoice_sequence_floor_sales">): number {
  const v = settings.invoice_sequence_floor_sales;
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function effectiveLastSequenceForPreview(
  documentType: DocumentType,
  dbLastSequence: number,
  settings: Pick<AdminCompanyTaxSettingsRow, "invoice_sequence_floor_sales">
): number {
  const floor = documentType === "sales_invoice" ? salesSequenceFloor(settings) : 0;
  return Math.max(Math.max(0, dbLastSequence), floor);
}

const INVOICE_NUM_RE = /^([A-Za-z]+)-(\d+)$/;

export type ParsedInvoiceNumber = { prefix: string; num: number };

export function parseInvoiceNumberString(s: string): ParsedInvoiceNumber | null {
  const m = s.trim().match(INVOICE_NUM_RE);
  if (!m) return null;
  const num = parseInt(m[2], 10);
  if (!Number.isFinite(num) || num < 1) return null;
  return { prefix: m[1].toUpperCase(), num };
}

/** Excel-style: A=1, Z=26, AA=27, … */
export function encodeLetterPrefix(prefix: string): number {
  let n = 0;
  for (const ch of prefix.toUpperCase()) {
    const c = ch.charCodeAt(0);
    if (c < 65 || c > 90) return -1;
    n = n * 26 + (c - 64);
  }
  return n;
}

export function decodeLetterPrefix(n: number): string {
  if (n < 1) return "A";
  let s = "";
  let x = n;
  while (x > 0) {
    x--;
    s = String.fromCharCode(65 + (x % 26)) + s;
    x = Math.floor(x / 26);
  }
  return s;
}

export function formatInvoiceNumber(prefix: string, num: number): string {
  return `${prefix.toUpperCase()}-${String(num).padStart(INVOICE_NUMBER_DIGIT_WIDTH, "0")}`;
}

/** Lexicographic order for (prefix, num): higher encode(prefix) wins; then higher num. */
function tupleCompare(a: ParsedInvoiceNumber, b: ParsedInvoiceNumber): number {
  const ea = encodeLetterPrefix(a.prefix);
  const eb = encodeLetterPrefix(b.prefix);
  if (ea !== eb) return ea - eb;
  return a.num - b.num;
}

function maxParsed(numbers: string[]): ParsedInvoiceNumber | null {
  let best: ParsedInvoiceNumber | null = null;
  for (const raw of numbers) {
    const p = parseInvoiceNumberString(raw);
    if (!p || encodeLetterPrefix(p.prefix) < 1) continue;
    if (!best || tupleCompare(p, best) > 0) best = p;
  }
  return best;
}

const MAX_SERIES_NUM = 10 ** INVOICE_NUMBER_DIGIT_WIDTH - 1;

/** Next number after the highest matching invoice in the list (or DEFAULT_FIRST if none). */
export function computeNextInvoiceNumber(existingInvoiceNumbers: string[]): string {
  const max = maxParsed(existingInvoiceNumbers);
  if (!max) return DEFAULT_FIRST_INVOICE_NUMBER;
  if (max.num < MAX_SERIES_NUM) {
    return formatInvoiceNumber(max.prefix, max.num + 1);
  }
  const nextEnc = encodeLetterPrefix(max.prefix) + 1;
  return formatInvoiceNumber(decodeLetterPrefix(nextEnc), 1);
}

/** Formuoja numerį pagal dokumento tipą ir eilės skaičių (1 = pirmas). Optional prefix override from company settings. */
export function formatNumberForDocumentType(
  documentType: DocumentType,
  sequence: number,
  prefixOverride?: string | null
): string {
  const p =
    typeof prefixOverride === "string" && prefixOverride.trim().length > 0
      ? prefixOverride.trim().toUpperCase()
      : documentTypePrefix(documentType);
  return formatInvoiceNumber(p, sequence);
}

/**
 * Grąžina kitą numatomą numerį pagal paskutinę žinomą sekos reikšmę (be DB inkremento).
 * Jei eilutės nėra, naudoja 0 → formatuoja kaip ...-001.
 */
export function peekNextNumberFromLastSequence(
  documentType: DocumentType,
  lastSequence: number,
  prefixOverride?: string | null
): string {
  const next = Math.max(0, lastSequence) + 1;
  return formatNumberForDocumentType(documentType, next, prefixOverride);
}
