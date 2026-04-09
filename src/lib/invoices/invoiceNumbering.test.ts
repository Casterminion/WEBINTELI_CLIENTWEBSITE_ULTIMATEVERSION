import { describe, expect, it } from "vitest";
import { formatNumberForDocumentType } from "./invoiceNumber";
import {
  formalNumberMatchesDocumentType,
  isDraftPlaceholderInvoiceNumber,
  isFormalSeriesInvoiceNumber,
  makeDraftInvoiceNumber,
} from "./invoiceNumbering";

describe("makeDraftInvoiceNumber / isDraftPlaceholderInvoiceNumber", () => {
  it("creates DRAFT- prefixed UUID-style placeholders", () => {
    const a = makeDraftInvoiceNumber();
    const b = makeDraftInvoiceNumber();
    expect(a).not.toBe(b);
    expect(isDraftPlaceholderInvoiceNumber(a)).toBe(true);
    expect(isDraftPlaceholderInvoiceNumber("SF-001")).toBe(false);
    expect(isDraftPlaceholderInvoiceNumber("")).toBe(false);
  });
});

describe("isFormalSeriesInvoiceNumber", () => {
  it("accepts PREFIX-digits", () => {
    expect(isFormalSeriesInvoiceNumber("SF-001")).toBe(true);
    expect(isFormalSeriesInvoiceNumber("SF-0001")).toBe(true);
    expect(isFormalSeriesInvoiceNumber("sf-12")).toBe(true);
    expect(isFormalSeriesInvoiceNumber("KS-003")).toBe(true);
    expect(isFormalSeriesInvoiceNumber("DRAFT-x")).toBe(false);
    expect(isFormalSeriesInvoiceNumber("INV-1")).toBe(false);
  });
});

describe("formalNumberMatchesDocumentType", () => {
  it("matches expected prefix per type", () => {
    expect(formalNumberMatchesDocumentType("sales_invoice", "SF-001")).toBe(true);
    expect(formalNumberMatchesDocumentType("sales_invoice", "ISK-001")).toBe(false);
    expect(formalNumberMatchesDocumentType("proforma_invoice", "ISK-002")).toBe(true);
    expect(formalNumberMatchesDocumentType("credit_note", "KS-001")).toBe(true);
    expect(formalNumberMatchesDocumentType("debit_note", "DS-001")).toBe(true);
  });
});

describe("issue-time numbering (domain)", () => {
  it("formats the immutable issued number used after RPC sequence", () => {
    expect(formatNumberForDocumentType("sales_invoice", 7)).toBe("SF-007");
  });
});
