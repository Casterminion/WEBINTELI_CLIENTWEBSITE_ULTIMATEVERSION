import { describe, expect, it } from "vitest";
import { formatInvoiceApiError } from "./invoiceUiErrors";

describe("formatInvoiceApiError", () => {
  it("uses admin translation when present", () => {
    expect(
      formatInvoiceApiError("service_timing_conflict", {
        buhalterijaErrServiceTimingConflict: "Custom EN/LT message",
      })
    ).toBe("Custom EN/LT message");
  });

  it("falls back to Lithuanian default when admin missing", () => {
    const s = formatInvoiceApiError("lt_b2b_company_code_required", {});
    expect(s).toContain("įmonės kodas");
  });

  it("returns raw code for unknown errors", () => {
    expect(formatInvoiceApiError("unknown_code_xyz", {})).toBe("unknown_code_xyz");
  });
});
