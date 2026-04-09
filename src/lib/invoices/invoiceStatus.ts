export type InvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export type TaxProfileType = "non_vat" | "vat" | "vat_svs";

export type DeriveStatusInput = {
  cancelledAt: string | null;
  issuedAt: string | null;
  dueDate: string; // YYYY-MM-DD
  total: number;
  amountPaid: number;
  today: string; // YYYY-MM-DD local or UTC date string for comparison
};

export function amountDue(total: number, amountPaid: number): number {
  const t = Math.round(total * 100) / 100;
  const p = Math.round(amountPaid * 100) / 100;
  return Math.round((t - p) * 100) / 100;
}

/**
 * Central status rules: cancelled → draft (not issued) → payment-based → overdue vs issued.
 */
export function deriveInvoiceStatus(input: DeriveStatusInput): InvoiceStatus {
  if (input.cancelledAt) return "cancelled";
  if (!input.issuedAt) return "draft";

  const due = amountDue(input.total, input.amountPaid);
  if (due <= 0) return "paid";
  if (input.amountPaid > 0 && due > 0) return "partially_paid";
  if (due > 0 && input.dueDate < input.today) return "overdue";
  return "issued";
}

export function parseTaxProfileType(raw: unknown): TaxProfileType {
  if (raw && typeof raw === "object" && "type" in raw) {
    const t = (raw as { type?: unknown }).type;
    if (t === "vat" || t === "vat_svs" || t === "non_vat") return t;
  }
  return "non_vat";
}
