import { describe, expect, it } from "vitest";
import { STANDALONE_NEW_INVOICE_TYPES, isCorrectionDocumentType } from "./documentTypes";
import {
  canCreateCorrectionFromInvoice,
  correctionSignedDelta,
  effectiveTotalAfterCorrections,
  humanCorrectionPrimaryLabelLt,
  parseCorrectionDraftBody,
} from "./correctionInvoice";
import { parseInvoicePayload } from "./parsePayload";
import type { AdminInvoiceRow } from "./types";

function issuedRow(over: Partial<AdminInvoiceRow> = {}): AdminInvoiceRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    user_id: "u",
    document_type: "sales_invoice",
    invoice_number: "SF-001",
    issue_date: "2026-04-01",
    service_date: "2026-04-01",
    due_date: "2026-04-08",
    document_title: "SĄSKAITA FAKTŪRA",
    invoice_type: "Sąskaita faktūra",
    seller_name: "S",
    seller_code: "1",
    seller_address: "A",
    seller_contact_line: "e@x.lt",
    seller_bank_account: "LT00",
    buyer_name: "B",
    buyer_country: "LT",
    buyer_type: "company",
    buyer_company_code: "123",
    buyer_registration_number: null,
    buyer_vat_number: null,
    buyer_code: "123",
    buyer_address: null,
    buyer_contact: null,
    currency: "EUR",
    line_items: [{ description: "x", quantity: 1, unit: "vnt.", unit_price: 100, line_total: 100 }],
    notes: null,
    vat_summary_line: "",
    pdf_storage_path: "/p",
    status: "issued",
    subtotal: 100,
    total: 100,
    tax_profile_snapshot: { type: "non_vat" },
    related_invoice_id: null,
    issued_at: "2026-04-01T00:00:00.000Z",
    cancelled_at: null,
    seller_snapshot_json: null,
    buyer_snapshot_json: null,
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z",
    ...over,
  } as AdminInvoiceRow;
}

describe("standalone new invoice document types", () => {
  it("excludes credit_note and debit_note from global create list", () => {
    expect(STANDALONE_NEW_INVOICE_TYPES).not.toContain("credit_note");
    expect(STANDALONE_NEW_INVOICE_TYPES).not.toContain("debit_note");
    expect(STANDALONE_NEW_INVOICE_TYPES).toContain("sales_invoice");
    expect(STANDALONE_NEW_INVOICE_TYPES).toContain("proforma_invoice");
  });
});

describe("parseInvoicePayload correction rules", () => {
  const lineOk = [{ description: "L", quantity: 1, unit: "vnt.", unit_price: 10 }];
  const minimal = {
    invoice_number: "KS-001",
    issue_date: "2026-04-01",
    due_date: "2026-04-08",
    service_date: "2026-04-01",
    service_period_from: "",
    service_period_to: "",
    seller_name: "S",
    seller_code: "1",
    seller_address: "A",
    seller_email: "a@b.lt",
    seller_phone: "",
    seller_contact_line: "a@b.lt",
    seller_bank_account: "LT",
    buyer_name: "B",
    buyer_country: "LT",
    buyer_type: "company",
    buyer_company_code: "1",
    buyer_registration_number: "",
    buyer_vat_number: "",
    buyer_code: "1",
    buyer_address: "",
    buyer_email: "",
    buyer_phone: "",
    buyer_contact: "",
    line_items: lineOk,
    document_type: "credit_note",
  };

  it("rejects credit_note without related_invoice_id", () => {
    const r = parseInvoicePayload({ ...minimal });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("correction_requires_original_invoice");
  });

  it("accepts credit_note when related_invoice_id is set", () => {
    const r = parseInvoicePayload({
      ...minimal,
      related_invoice_id: "00000000-0000-4000-8000-000000000099",
    });
    expect(r.ok).toBe(true);
  });
});

describe("parseCorrectionDraftBody", () => {
  it("requires positive amount and reason", () => {
    expect(parseCorrectionDraftBody({}).ok).toBe(false);
    expect(
      parseCorrectionDraftBody({
        original_invoice_id: "00000000-0000-4000-8000-000000000001",
        correction_type: "credit_note",
        correction_reason: "  ",
        correction_amount: 5,
        correction_date: "2026-04-01",
      }).ok
    ).toBe(false);
    expect(
      parseCorrectionDraftBody({
        original_invoice_id: "00000000-0000-4000-8000-000000000001",
        correction_type: "credit_note",
        correction_reason: "Nuolaida",
        correction_amount: 0,
        correction_date: "2026-04-01",
      }).ok
    ).toBe(false);
  });
});

describe("canCreateCorrectionFromInvoice", () => {
  it("allows issued sales invoice", () => {
    expect(canCreateCorrectionFromInvoice(issuedRow())).toBe(true);
  });

  it("disallows draft", () => {
    expect(canCreateCorrectionFromInvoice(issuedRow({ status: "draft", issued_at: null }))).toBe(false);
  });

  it("disallows cancelled", () => {
    expect(
      canCreateCorrectionFromInvoice(
        issuedRow({ status: "cancelled", cancelled_at: "2026-04-02T00:00:00.000Z" })
      )
    ).toBe(false);
  });
});

describe("correctionSignedDelta and effective total", () => {
  it("maps credit as negative and debit as positive", () => {
    expect(correctionSignedDelta("credit_note", 25)).toBe(-25);
    expect(correctionSignedDelta("debit_note", 25)).toBe(25);
    expect(correctionSignedDelta("sales_invoice", 25)).toBe(0);
  });

  it("computes effective total after corrections", () => {
    const t = effectiveTotalAfterCorrections(100, [
      { document_type: "credit_note", correction_amount: 10, total: 10 },
      { document_type: "debit_note", correction_amount: 5, total: 5 },
    ]);
    expect(t).toBe(95);
  });
});

describe("human labels (LT)", () => {
  it("uses non-jargon primary labels", () => {
    expect(humanCorrectionPrimaryLabelLt("credit_note")).toBe("Sumažinanti korekcija");
    expect(humanCorrectionPrimaryLabelLt("debit_note")).toBe("Didinanti korekcija");
  });

  it("marks correction document types", () => {
    expect(isCorrectionDocumentType("credit_note")).toBe(true);
    expect(isCorrectionDocumentType("sales_invoice")).toBe(false);
  });
});
