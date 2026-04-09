import { amountDue } from "./invoiceStatus";

export type PaymentRowLike = {
  amount: unknown;
  payment_date: string;
};

/**
 * Aggregates for UI / APIs: paid sum, balance, count, last payment date.
 */
export function summarizeInvoicePayments(total: number, payments: PaymentRowLike[]) {
  const amountPaid = Math.round(
    payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) * 100
  ) / 100;
  const amount_due = amountDue(total, amountPaid);
  const payment_count = payments.length;
  const last_payment_date =
    payments.length === 0
      ? null
      : payments.reduce((best, p) => (p.payment_date > best ? p.payment_date : best), payments[0].payment_date);
  return { amount_paid: amountPaid, amount_due, payment_count, last_payment_date };
}

const ROUND = 0.01;

/** Block overpayment beyond a small float tolerance. */
export function paymentWouldExceedBalance(
  currentPaid: number,
  invoiceTotal: number,
  newPaymentAmount: number
): boolean {
  const due = amountDue(invoiceTotal, currentPaid);
  return newPaymentAmount > due + ROUND;
}
