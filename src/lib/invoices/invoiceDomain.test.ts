import { beforeEach, describe, expect, it, vi } from "vitest";
import { documentTypeSelectable, getPdfTitle } from "./documentTypes";
import { deriveInvoiceStatus } from "./invoiceStatus";
import {
  effectiveLastSequenceForPreview,
  formatNumberForDocumentType,
  peekNextNumberFromLastSequence,
  salesSequenceFloor,
} from "./invoiceNumber";
import { parseServiceTimingFromBody, serviceTimingPdfMeta, validateServiceTimingFields } from "./serviceTiming";

describe("deriveInvoiceStatus", () => {
  const base = {
    cancelledAt: null as string | null,
    issuedAt: "2026-01-01T00:00:00.000Z",
    dueDate: "2026-02-01",
    total: 100,
    today: "2026-01-15",
  };

  it("returns draft when not issued", () => {
    expect(
      deriveInvoiceStatus({
        ...base,
        issuedAt: null,
        amountPaid: 0,
      })
    ).toBe("draft");
  });

  it("returns cancelled when cancelledAt set", () => {
    expect(
      deriveInvoiceStatus({
        ...base,
        cancelledAt: "2026-01-02T00:00:00.000Z",
        amountPaid: 0,
      })
    ).toBe("cancelled");
  });

  it("returns paid when fully paid", () => {
    expect(deriveInvoiceStatus({ ...base, amountPaid: 100 })).toBe("paid");
  });

  it("returns partially_paid", () => {
    expect(deriveInvoiceStatus({ ...base, amountPaid: 40 })).toBe("partially_paid");
  });

  it("returns overdue when unpaid and past due", () => {
    expect(
      deriveInvoiceStatus({
        ...base,
        dueDate: "2026-01-01",
        today: "2026-01-20",
        amountPaid: 0,
      })
    ).toBe("overdue");
  });

  it("returns issued when unpaid and not past due", () => {
    expect(deriveInvoiceStatus({ ...base, amountPaid: 0 })).toBe("issued");
  });
});

describe("getPdfTitle", () => {
  it("maps document types to Lithuanian PDF titles", () => {
    expect(getPdfTitle("sales_invoice")).toBe("SĄSKAITA FAKTŪRA");
    expect(getPdfTitle("proforma_invoice")).toBe("IŠANKSTINĖ SĄSKAITA");
    expect(getPdfTitle("vat_invoice")).toBe("PVM SĄSKAITA FAKTŪRA");
  });
});

describe("documentTypeSelectable", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("hides vat_invoice when env and DB disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_VAT_INVOICES", "");
    expect(documentTypeSelectable("vat_invoice", { enableVatFromDb: false })).toBe(false);
  });

  it("shows vat_invoice when env true", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_VAT_INVOICES", "true");
    expect(documentTypeSelectable("vat_invoice", { enableVatFromDb: false })).toBe(true);
  });

  it("shows vat_invoice when DB flag true", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_VAT_INVOICES", "");
    expect(documentTypeSelectable("vat_invoice", { enableVatFromDb: true })).toBe(true);
  });

  it("shows vat_invoice when tax profile is vat (without env or DB flag)", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_VAT_INVOICES", "");
    expect(
      documentTypeSelectable("vat_invoice", { enableVatFromDb: false, taxProfileType: "vat" })
    ).toBe(true);
  });

  it("shows vat_invoice when tax profile is vat_svs", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_VAT_INVOICES", "");
    expect(
      documentTypeSelectable("vat_invoice", { enableVatFromDb: false, taxProfileType: "vat_svs" })
    ).toBe(true);
  });

  it("hides vat_invoice for non_vat when env and DB disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_VAT_INVOICES", "");
    expect(
      documentTypeSelectable("vat_invoice", { enableVatFromDb: false, taxProfileType: "non_vat" })
    ).toBe(false);
  });
});

describe("parseServiceTimingFromBody", () => {
  it("accepts single service_date only", () => {
    const r = parseServiceTimingFromBody({
      service_date: "2026-04-01",
      service_period_from: "",
      service_period_to: "",
    });
    expect(r).toEqual({
      ok: true,
      service_date: "2026-04-01",
      service_period_from: "",
      service_period_to: "",
    });
  });

  it("accepts period only", () => {
    const r = parseServiceTimingFromBody({
      service_date: "",
      service_period_from: "2026-04-01",
      service_period_to: "2026-04-30",
    });
    expect(r).toEqual({
      ok: true,
      service_date: "",
      service_period_from: "2026-04-01",
      service_period_to: "2026-04-30",
    });
  });

  it("rejects conflict", () => {
    const r = parseServiceTimingFromBody({
      service_date: "2026-04-01",
      service_period_from: "2026-04-01",
      service_period_to: "2026-04-30",
    });
    expect(r).toEqual({ ok: false, error: "service_timing_conflict" });
  });

  it("rejects incomplete period", () => {
    expect(
      parseServiceTimingFromBody({
        service_date: "",
        service_period_from: "2026-04-01",
        service_period_to: "",
      })
    ).toEqual({ ok: false, error: "service_period_incomplete" });
  });

  it("rejects missing timing", () => {
    expect(parseServiceTimingFromBody({})).toEqual({ ok: false, error: "service_timing_required" });
  });

  it("rejects from after to", () => {
    expect(
      parseServiceTimingFromBody({
        service_date: "",
        service_period_from: "2026-05-01",
        service_period_to: "2026-04-01",
      })
    ).toEqual({ ok: false, error: "service_period_order_invalid" });
  });
});

describe("serviceTimingPdfMeta", () => {
  it("uses period label when both ends set", () => {
    expect(
      serviceTimingPdfMeta({
        service_date: "",
        service_period_from: "2026-04-01",
        service_period_to: "2026-04-15",
      })
    ).toEqual({ label: "PASLAUGOS LAIKOTARPIS", value: "2026-04-01 – 2026-04-15" });
  });

  it("uses single-date label when service_date set", () => {
    expect(
      serviceTimingPdfMeta({
        service_date: "2026-04-09",
        service_period_from: "",
        service_period_to: "",
      })
    ).toEqual({ label: "PASLAUGOS DATA", value: "2026-04-09" });
  });
});

describe("numbering", () => {
  it("formats per document type prefix (3-digit pad)", () => {
    expect(formatNumberForDocumentType("sales_invoice", 1)).toBe("SF-001");
    expect(formatNumberForDocumentType("proforma_invoice", 12)).toBe("ISK-012");
    expect(formatNumberForDocumentType("credit_note", 3)).toBe("KS-003");
    expect(formatNumberForDocumentType("debit_note", 4)).toBe("DS-004");
    expect(formatNumberForDocumentType("vat_invoice", 99)).toBe("PVM-099");
  });

  it("peeks next from last sequence", () => {
    expect(peekNextNumberFromLastSequence("sales_invoice", 0)).toBe("SF-001");
    expect(peekNextNumberFromLastSequence("sales_invoice", 5)).toBe("SF-006");
  });

  it("salesSequenceFloor reads settings", () => {
    expect(salesSequenceFloor({ invoice_sequence_floor_sales: null })).toBe(0);
    expect(salesSequenceFloor({ invoice_sequence_floor_sales: 1 })).toBe(1);
  });

  it("effectiveLastSequenceForPreview bumps SF by floor", () => {
    expect(effectiveLastSequenceForPreview("sales_invoice", 0, { invoice_sequence_floor_sales: 1 })).toBe(1);
    expect(peekNextNumberFromLastSequence("sales_invoice", 1)).toBe("SF-002");
    expect(effectiveLastSequenceForPreview("proforma_invoice", 0, { invoice_sequence_floor_sales: 1 })).toBe(0);
  });
});

describe("validateServiceTimingFields", () => {
  it("accepts single date only", () => {
    expect(
      validateServiceTimingFields({
        service_date: "2026-04-01",
        service_period_from: "",
        service_period_to: "",
      })
    ).toBeNull();
  });

  it("rejects single date and period together", () => {
    expect(
      validateServiceTimingFields({
        service_date: "2026-04-01",
        service_period_from: "2026-04-01",
        service_period_to: "2026-04-30",
      })
    ).toBe("service_timing_conflict");
  });

  it("rejects incomplete period", () => {
    expect(
      validateServiceTimingFields({
        service_date: "",
        service_period_from: "2026-04-01",
        service_period_to: "",
      })
    ).toBe("service_period_incomplete");
  });

  it("rejects period end before start", () => {
    expect(
      validateServiceTimingFields({
        service_date: "",
        service_period_from: "2026-04-10",
        service_period_to: "2026-04-01",
      })
    ).toBe("service_period_order_invalid");
  });
});
