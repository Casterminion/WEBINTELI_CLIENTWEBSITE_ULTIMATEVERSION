import { describe, expect, it, vi } from "vitest";
import {
  FALLBACK_VAT_FOOTER_PRIMARY,
  buildNonVatVatSummaryLine,
  invoiceNumberPrefixForDocumentType,
  resolveInvoiceTaxPresentation,
  sellerPayloadFromCompanySettings,
} from "./companyInvoiceSettings";
import type { AdminCompanyTaxSettingsRow } from "./types";

function baseSettings(over: Partial<AdminCompanyTaxSettingsRow> = {}): AdminCompanyTaxSettingsRow {
  return {
    user_id: "u1",
    tax_profile_type: "non_vat",
    default_vat_footer_note: "Custom primary.",
    vat_turnover_manual_eur: null,
    purchases_services_from_foreign: false,
    provides_b2b_services_to_eu: false,
    enable_vat_invoices: false,
    require_buyer_company_code: true,
    updated_at: new Date().toISOString(),
    company_name: "MB Testas",
    company_code: "305555555",
    company_vat_code: null,
    company_address: "Vilnius",
    company_email: "a@b.lt",
    company_phone: "+37060000000",
    company_website: null,
    company_country: "LT",
    bank_name: "SWED",
    bank_account: "LT000000000000000000",
    bank_swift: null,
    default_currency: "EUR",
    default_payment_term_days: 14,
    default_invoice_notes: "Pay by wire.",
    seller_not_vat_payer_note: "",
    invoice_number_prefix_sales: null,
    invoice_number_prefix_proforma: null,
    invoice_number_prefix_credit: null,
    invoice_number_prefix_debit: null,
    invoice_number_prefix_vat: null,
    ...over,
  };
}

describe("buildNonVatVatSummaryLine", () => {
  it("uses fallback primary when default_vat_footer_note empty", () => {
    expect(
      buildNonVatVatSummaryLine({
        default_vat_footer_note: "",
        seller_not_vat_payer_note: "",
      })
    ).toBe(FALLBACK_VAT_FOOTER_PRIMARY);
  });

  it("appends optional seller_not_vat_payer_note", () => {
    expect(
      buildNonVatVatSummaryLine({
        default_vat_footer_note: "Line A.",
        seller_not_vat_payer_note: "Line B.",
      })
    ).toBe("Line A.\n\nLine B.");
  });
});

describe("sellerPayloadFromCompanySettings", () => {
  it("maps company row to seller payload fields", () => {
    const s = baseSettings({
      seller_not_vat_payer_note: "Pardavėjas nėra PVM mokėtojas.",
    });
    const p = sellerPayloadFromCompanySettings(s);
    expect(p.seller_name).toBe("MB Testas");
    expect(p.seller_code).toBe("305555555");
    expect(p.seller_address).toBe("Vilnius");
    expect(p.seller_email).toBe("a@b.lt");
    expect(p.seller_phone).toBe("+37060000000");
    expect(p.seller_bank_account).toBe("LT000000000000000000");
    expect(p.currency).toBe("EUR");
    expect(p.tax_profile_snapshot).toEqual({ type: "non_vat" });
    expect(p.vat_summary_line).toContain("Custom primary.");
    expect(p.vat_summary_line).toContain("Pardavėjas nėra PVM mokėtojas.");
  });
});

describe("resolveInvoiceTaxPresentation", () => {
  it("non_vat: VAT invoice hidden without env/db flag", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_VAT_INVOICES", "");
    const r = resolveInvoiceTaxPresentation(baseSettings({ enable_vat_invoices: false }));
    expect(r.taxProfileType).toBe("non_vat");
    expect(r.vatInvoiceSelectable).toBe(false);
    expect(r.companyVatCodeRequired).toBe(false);
    expect(r.showNonVatPdfTaxNote).toBe(true);
    expect(r.showLineVatColumns).toBe(false);
    vi.unstubAllEnvs();
  });

  it("vat profile: VAT invoice selectable and VAT code required", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_VAT_INVOICES", "");
    const r = resolveInvoiceTaxPresentation(
      baseSettings({ tax_profile_type: "vat", enable_vat_invoices: false })
    );
    expect(r.vatInvoiceSelectable).toBe(true);
    expect(r.companyVatCodeRequired).toBe(true);
    expect(r.showNonVatPdfTaxNote).toBe(false);
    vi.unstubAllEnvs();
  });
});

describe("invoiceNumberPrefixForDocumentType", () => {
  it("returns built-in prefix when settings null", () => {
    expect(invoiceNumberPrefixForDocumentType("sales_invoice", null)).toBe("SF");
  });

  it("uses DB override when set", () => {
    const s = baseSettings({ invoice_number_prefix_sales: "  xx  " });
    expect(invoiceNumberPrefixForDocumentType("sales_invoice", s)).toBe("XX");
  });
});
