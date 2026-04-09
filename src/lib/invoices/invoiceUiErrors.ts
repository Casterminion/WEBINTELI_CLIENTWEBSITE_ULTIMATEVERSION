/**
 * Maps API / payload validation error codes to `translations.ts` admin keys (optional)
 * and Lithuanian fallbacks for invoice save/issue flows.
 */
export const INVOICE_API_ERROR_ADMIN_KEYS: Record<string, string> = {
  service_timing_conflict: "buhalterijaErrServiceTimingConflict",
  service_period_incomplete: "buhalterijaErrServicePeriodIncomplete",
  service_timing_required: "buhalterijaErrServiceTimingRequired",
  service_period_order_invalid: "buhalterijaErrServicePeriodOrderInvalid",
  lt_b2b_company_code_required: "buhalterijaErrLtB2bCompanyCode",
  foreign_company_registration_required: "buhalterijaErrForeignCompanyRegistration",
};

const LT_FALLBACK: Record<string, string> = {
  service_timing_conflict: "Pasirinkite vieną: paslaugos data arba laikotarpis (nuo–iki), ne abu.",
  service_period_incomplete: "Užpildykite paslaugos laikotarpį: nuo ir iki datas.",
  service_timing_required: "Nurodykite paslaugos datą arba laikotarpį.",
  service_period_order_invalid: "Laikotarpio pabaiga negali būti ankstesnė už pradžią.",
  lt_b2b_company_code_required: "LT įmonei reikalingas pirkėjo įmonės kodas.",
  foreign_company_registration_required: "Užsienio įmonei reikalingas registracijos numeris.",
};

export function formatInvoiceApiError(
  code: string | undefined,
  admin: Record<string, string | undefined> | null | undefined
): string {
  if (!code) return "Klaida";
  const i18nKey = INVOICE_API_ERROR_ADMIN_KEYS[code];
  if (i18nKey && admin && typeof admin[i18nKey as keyof typeof admin] === "string") {
    const s = admin[i18nKey as keyof typeof admin];
    if (s) return s;
  }
  return LT_FALLBACK[code] ?? code;
}
