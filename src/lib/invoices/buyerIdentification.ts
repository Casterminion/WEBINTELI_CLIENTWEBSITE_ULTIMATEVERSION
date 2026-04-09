export type BuyerType = "company" | "natural_person";

type BuyerIdFields = {
  buyer_type: BuyerType;
  buyer_country: string;
  buyer_company_code: string;
  buyer_registration_number: string;
};

/** API / validation error codes (map to LT messages in UI). */
export const BUYER_ISSUE_ERROR = {
  LT_B2B_COMPANY_CODE: "lt_b2b_company_code_required",
  FOREIGN_COMPANY_REGISTRATION: "foreign_company_registration_required",
} as const;

export function normalizeBuyerCountry(raw: string | undefined | null): string {
  const t = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (t.length === 2) return t;
  return "LT";
}

export function normalizeBuyerType(raw: unknown): BuyerType {
  return raw === "natural_person" ? "natural_person" : "company";
}

/** Primary identifier stored in legacy buyer_code column (reports / compat). */
export function legacyBuyerCodeColumn(p: BuyerIdFields): string | null {
  if (p.buyer_type === "natural_person") return null;
  const cc = normalizeBuyerCountry(p.buyer_country);
  if (cc === "LT") {
    const v = p.buyer_company_code.trim();
    return v || null;
  }
  const r = p.buyer_registration_number.trim();
  return r || null;
}

/**
 * Blocks issuing a final invoice when required B2B identification is missing.
 * Returns an error code or null if OK.
 */
export function buyerIssueValidationErrorCode(p: BuyerIdFields): (typeof BUYER_ISSUE_ERROR)[keyof typeof BUYER_ISSUE_ERROR] | null {
  if (p.buyer_type !== "company") return null;
  const cc = normalizeBuyerCountry(p.buyer_country);
  if (cc === "LT") {
    if (!p.buyer_company_code.trim()) return BUYER_ISSUE_ERROR.LT_B2B_COMPANY_CODE;
    return null;
  }
  if (!p.buyer_registration_number.trim()) return BUYER_ISSUE_ERROR.FOREIGN_COMPANY_REGISTRATION;
  return null;
}

export function buyerIdentificationIncompleteForDisplay(p: BuyerIdFields): boolean {
  return buyerIssueValidationErrorCode(p) !== null;
}
