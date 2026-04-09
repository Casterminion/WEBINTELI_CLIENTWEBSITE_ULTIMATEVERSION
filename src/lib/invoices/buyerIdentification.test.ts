import { describe, expect, it } from "vitest";
import { BUYER_ISSUE_ERROR, buyerIssueValidationErrorCode, legacyBuyerCodeColumn } from "./buyerIdentification";

describe("buyerIssueValidationErrorCode", () => {
  it("allows natural person without company identifiers", () => {
    expect(
      buyerIssueValidationErrorCode({
        buyer_type: "natural_person",
        buyer_country: "LT",
        buyer_company_code: "",
        buyer_registration_number: "",
      })
    ).toBeNull();
  });

  it("requires LT company code for LT B2B", () => {
    expect(
      buyerIssueValidationErrorCode({
        buyer_type: "company",
        buyer_country: "LT",
        buyer_company_code: "",
        buyer_registration_number: "",
      })
    ).toBe(BUYER_ISSUE_ERROR.LT_B2B_COMPANY_CODE);
  });

  it("requires registration id for foreign B2B", () => {
    expect(
      buyerIssueValidationErrorCode({
        buyer_type: "company",
        buyer_country: "DE",
        buyer_company_code: "",
        buyer_registration_number: "",
      })
    ).toBe(BUYER_ISSUE_ERROR.FOREIGN_COMPANY_REGISTRATION);
  });

  it("accepts foreign B2B with registration number", () => {
    expect(
      buyerIssueValidationErrorCode({
        buyer_type: "company",
        buyer_country: "DE",
        buyer_company_code: "",
        buyer_registration_number: "HRB123",
      })
    ).toBeNull();
  });
});

describe("legacyBuyerCodeColumn", () => {
  it("uses company code for LT", () => {
    expect(
      legacyBuyerCodeColumn({
        buyer_type: "company",
        buyer_country: "LT",
        buyer_company_code: "305555555",
        buyer_registration_number: "",
      })
    ).toBe("305555555");
  });

  it("uses registration number for foreign", () => {
    expect(
      legacyBuyerCodeColumn({
        buyer_type: "company",
        buyer_country: "DE",
        buyer_company_code: "",
        buyer_registration_number: "HRB999",
      })
    ).toBe("HRB999");
  });
});
