import { describe, expect, it } from "vitest";
import {
  aggregateOutstandingEur,
  clampPercent,
  estimateMonthsToMainThreshold,
  sumIssuedSalesInvoiceTotalsEur,
  vatMainThresholdZone,
} from "./buhalterijaDashboardMetrics";
import { VAT_TURNOVER_THRESHOLD_EUR } from "./vatThresholds";

describe("vatMainThresholdZone", () => {
  it("safe below 72%", () => {
    expect(vatMainThresholdZone(0)).toBe("safe");
    expect(vatMainThresholdZone(71)).toBe("safe");
  });

  it("approaching from 72% until 90%", () => {
    expect(vatMainThresholdZone(72)).toBe("approaching");
    expect(vatMainThresholdZone(89.9)).toBe("approaching");
  });

  it("near from 90% until 100%", () => {
    expect(vatMainThresholdZone(90)).toBe("near");
    expect(vatMainThresholdZone(99)).toBe("near");
  });

  it("critical at or above 100%", () => {
    expect(vatMainThresholdZone(100)).toBe("critical");
    expect(vatMainThresholdZone(150)).toBe("critical");
  });
});

describe("clampPercent", () => {
  it("clamps to 0–100", () => {
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(0)).toBe(0);
    expect(clampPercent(100)).toBe(100);
    expect(clampPercent(120)).toBe(100);
  });
});

describe("sumIssuedSalesInvoiceTotalsEur", () => {
  it("sums issued sales_invoice and vat_invoice; skips draft, cancelled, proforma", () => {
    const sum = sumIssuedSalesInvoiceTotalsEur([
      { total: 100, status: "issued", document_type: "sales_invoice" },
      { total: 40, status: "issued", document_type: "vat_invoice" },
      { total: 50, status: "draft", document_type: "sales_invoice" },
      { total: 999, status: "issued", document_type: "proforma_invoice" },
      { total: 20, status: "cancelled", document_type: "sales_invoice" },
    ]);
    expect(sum).toBe(140);
  });

  it("handles zero state", () => {
    expect(sumIssuedSalesInvoiceTotalsEur([])).toBe(0);
    expect(
      sumIssuedSalesInvoiceTotalsEur([{ total: 0, status: "issued", document_type: "sales_invoice" }])
    ).toBe(0);
  });
});

describe("estimateMonthsToMainThreshold", () => {
  const midYear = new Date(2026, 5, 15);

  it("returns null when YTD is zero", () => {
    expect(estimateMonthsToMainThreshold(0, midYear, VAT_TURNOVER_THRESHOLD_EUR)).toBeNull();
  });

  it("returns 0 when already at or over threshold", () => {
    expect(
      estimateMonthsToMainThreshold(VAT_TURNOVER_THRESHOLD_EUR, midYear, VAT_TURNOVER_THRESHOLD_EUR)
    ).toBe(0);
    expect(
      estimateMonthsToMainThreshold(VAT_TURNOVER_THRESHOLD_EUR + 1000, midYear, VAT_TURNOVER_THRESHOLD_EUR)
    ).toBe(0);
  });

  it("returns positive months when under threshold", () => {
    const m = estimateMonthsToMainThreshold(10_000, midYear, VAT_TURNOVER_THRESHOLD_EUR);
    expect(m).not.toBeNull();
    expect(m!).toBeGreaterThan(0);
  });
});

describe("aggregateOutstandingEur", () => {
  it("returns zeros when no issued invoices", () => {
    const r = aggregateOutstandingEur([], new Map(), "2026-04-09");
    expect(r).toEqual({ unpaidTotalEur: 0, overdueCount: 0, overdueTotalEur: 0 });
  });

  it("does not crash when payment map is empty (treats as unpaid)", () => {
    const r = aggregateOutstandingEur(
      [
        {
          id: "a",
          total: 200,
          issued_at: "2026-01-01T00:00:00Z",
          cancelled_at: null,
          due_date: "2026-02-01",
          status: "issued",
        },
      ],
      new Map(),
      "2026-04-09"
    );
    expect(r.unpaidTotalEur).toBe(200);
    expect(r.overdueCount).toBeGreaterThanOrEqual(1);
  });

  it("ignores drafts and cancelled", () => {
    const r = aggregateOutstandingEur(
      [
        {
          id: "d",
          total: 500,
          issued_at: null,
          cancelled_at: null,
          due_date: "2026-01-01",
          status: "draft",
        },
        {
          id: "c",
          total: 500,
          issued_at: "2026-01-01T00:00:00Z",
          cancelled_at: "2026-01-02T00:00:00Z",
          due_date: "2026-01-01",
          status: "cancelled",
        },
      ],
      new Map(),
      "2026-04-09"
    );
    expect(r.unpaidTotalEur).toBe(0);
  });
});
