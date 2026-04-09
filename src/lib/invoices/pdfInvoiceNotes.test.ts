import { describe, expect, it } from "vitest";
import { pdfNotesWithoutTaxSummaryDuplicates } from "./pdfInvoiceNotes";

describe("pdfNotesWithoutTaxSummaryDuplicates", () => {
  it("removes lines that duplicate tax summary (case/spacing insensitive)", () => {
    const tax = "PVM neskaičiuojamas.\n\nPardavėjas nėra PVM mokėtojas.";
    const notes = "Apmokėjimas bankiniu pavedimu.\nPVM neskaičiuojamas.\nPardavėjas nėra PVM mokėtojas.";
    expect(pdfNotesWithoutTaxSummaryDuplicates(notes, tax)).toBe("Apmokėjimas bankiniu pavedimu.");
  });

  it("returns empty when notes only repeat tax lines", () => {
    const tax = "PVM neskaičiuojamas.";
    expect(pdfNotesWithoutTaxSummaryDuplicates("PVM neskaičiuojamas.", tax)).toBe("");
  });
});
