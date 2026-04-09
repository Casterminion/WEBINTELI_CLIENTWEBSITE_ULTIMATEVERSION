import { describe, expect, it } from "vitest";
import {
  applyIssuedPartySnapshotsFromRow,
  canCreateFinalSalesInvoiceFromProforma,
  parseFinalFromProformaBody,
} from "./proformaFinalInvoice";
import type { AdminInvoiceRow, InvoicePayload } from "./types";

function testPayload(): InvoicePayload {
  return {
    document_type: "proforma_invoice",
    invoice_number: "DRAFT-550e8400-e29b-41d4-a716-446655440000",
    issue_date: "2026-01-01",
    service_date: "",
    service_period_from: "",
    service_period_to: "",
    due_date: "2026-01-08",
    document_title: "IŠANKSTINĖ SĄSKAITA",
    invoice_type: "Išankstinė sąskaita",
    seller_name: "Live Seller",
    seller_code: "123",
    seller_address: "A",
    seller_email: "",
    seller_phone: "",
    seller_contact_line: "",
    seller_bank_account: "LT00",
    buyer_name: "Live Buyer",
    buyer_country: "LT",
    buyer_type: "company",
    buyer_company_code: "111",
    buyer_registration_number: "",
    buyer_vat_number: "",
    buyer_code: "111",
    buyer_address: "",
    buyer_contact: "",
    currency: "EUR",
    line_items: [],
    notes: "",
    vat_summary_line: "Neskaičiuojamas",
    tax_profile_snapshot: { type: "non_vat" },
  };
}

describe("parseFinalFromProformaBody", () => {
  it("accepts a valid UUID", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(parseFinalFromProformaBody({ proforma_invoice_id: id })).toEqual({
      ok: true,
      proforma_invoice_id: id,
    });
  });

  it("trims proforma id", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(parseFinalFromProformaBody({ proforma_invoice_id: `  ${id}  ` })).toEqual({
      ok: true,
      proforma_invoice_id: id,
    });
  });

  it("rejects invalid id", () => {
    expect(parseFinalFromProformaBody({ proforma_invoice_id: "not-uuid" })).toMatchObject({
      ok: false,
      error: "proforma_invoice_id_invalid",
    });
  });

  it("rejects missing body fields", () => {
    expect(parseFinalFromProformaBody({})).toMatchObject({ ok: false });
    expect(parseFinalFromProformaBody(null)).toMatchObject({ ok: false });
  });
});

describe("canCreateFinalSalesInvoiceFromProforma", () => {
  const base = {
    document_type: "proforma_invoice" as const,
    status: "issued" as const,
    cancelled_at: null as string | null,
    issued_at: "2026-01-01T00:00:00.000Z",
  };

  it("allows issued non-cancelled proforma", () => {
    expect(canCreateFinalSalesInvoiceFromProforma(base)).toBe(true);
  });

  it("disallows draft proforma", () => {
    expect(
      canCreateFinalSalesInvoiceFromProforma({
        ...base,
        issued_at: null,
        status: "draft",
      })
    ).toBe(false);
  });

  it("disallows cancelled proforma", () => {
    expect(
      canCreateFinalSalesInvoiceFromProforma({
        ...base,
        status: "cancelled",
      })
    ).toBe(false);
    expect(
      canCreateFinalSalesInvoiceFromProforma({
        ...base,
        cancelled_at: "2026-01-02T00:00:00.000Z",
      })
    ).toBe(false);
  });

  it("disallows sales invoice", () => {
    expect(
      canCreateFinalSalesInvoiceFromProforma({
        ...base,
        document_type: "sales_invoice",
      })
    ).toBe(false);
  });
});

describe("applyIssuedPartySnapshotsFromRow", () => {
  it("leaves payload unchanged when proforma is not issued", () => {
    const row = { issued_at: null } as unknown as AdminInvoiceRow;
    const p = testPayload();
    expect(applyIssuedPartySnapshotsFromRow(row, p).seller_name).toBe("Live Seller");
  });

  it("overlays seller_snapshot_json and buyer_snapshot_json when issued", () => {
    const row = {
      issued_at: "2026-01-05T00:00:00.000Z",
      seller_snapshot_json: {
        seller_name: "Snap Co",
        seller_code: "999",
        seller_email: "a@b.lt",
        seller_phone: "+370",
      },
      buyer_snapshot_json: {
        buyer_name: "Snap Client",
        buyer_country: "DE",
        buyer_type: "company",
        buyer_company_code: "DE123",
      },
    } as unknown as AdminInvoiceRow;
    const out = applyIssuedPartySnapshotsFromRow(row, testPayload());
    expect(out.seller_name).toBe("Snap Co");
    expect(out.seller_code).toBe("999");
    expect(out.seller_email).toBe("a@b.lt");
    expect(out.buyer_name).toBe("Snap Client");
    expect(out.buyer_country).toBe("DE");
    expect(out.buyer_company_code).toBe("DE123");
  });
});
