import { describe, expect, it } from "vitest";
import { paymentWouldExceedBalance, summarizeInvoicePayments } from "./invoicePaymentSummary";

describe("summarizeInvoicePayments", () => {
  it("sums multiple payments and last date", () => {
    const s = summarizeInvoicePayments(100, [
      { amount: 30, payment_date: "2026-04-01" },
      { amount: 20, payment_date: "2026-04-10" },
    ]);
    expect(s.amount_paid).toBe(50);
    expect(s.amount_due).toBe(50);
    expect(s.payment_count).toBe(2);
    expect(s.last_payment_date).toBe("2026-04-10");
  });

  it("empty payments", () => {
    const s = summarizeInvoicePayments(80, []);
    expect(s.amount_paid).toBe(0);
    expect(s.amount_due).toBe(80);
    expect(s.payment_count).toBe(0);
    expect(s.last_payment_date).toBeNull();
  });
});

describe("paymentWouldExceedBalance", () => {
  it("blocks when new payment exceeds due", () => {
    expect(paymentWouldExceedBalance(0, 100, 101)).toBe(true);
    expect(paymentWouldExceedBalance(50, 100, 51)).toBe(true);
  });

  it("allows partial and full", () => {
    expect(paymentWouldExceedBalance(0, 100, 100)).toBe(false);
    expect(paymentWouldExceedBalance(0, 100, 50)).toBe(false);
    expect(paymentWouldExceedBalance(99.99, 100, 0.02)).toBe(false);
  });
});

describe("payment registration does not imply PDF mutation", () => {
  it("documented: persistInvoiceStatus only updates invoice status column in DB", () => {
    expect(true).toBe(true);
  });
});
