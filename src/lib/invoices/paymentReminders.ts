import { addDaysToISODate } from "./dateIso";
import type { InvoiceStatus } from "./invoiceStatus";

export type PaymentReminderRow = {
  snoozed_until: string;
  last_prompt_date: string | null;
};

/** Calendar days from `from` to `to` (to − from); pure calendar, no TZ drift. */
export function daysBetweenIso(fromYmd: string, toYmd: string): number {
  const pf = fromYmd.split("-").map((x) => parseInt(x, 10));
  const pt = toYmd.split("-").map((x) => parseInt(x, 10));
  if (pf.length !== 3 || pt.length !== 3 || pf.some(Number.isNaN) || pt.some(Number.isNaN)) return 0;
  const a = Date.UTC(pf[0], pf[1] - 1, pf[2]);
  const b = Date.UTC(pt[0], pt[1] - 1, pt[2]);
  return Math.round((b - a) / 86400000);
}

/**
 * Reminder schedule relative to due date (day 0 = due date):
 * due, +1, +3, +7, then daily from +8 onward.
 */
export function isScheduledReminderDay(dueDateYmd: string, dayYmd: string): boolean {
  const d = daysBetweenIso(dueDateYmd, dayYmd);
  if (d < 0) return false;
  if (d === 0 || d === 1 || d === 3 || d === 7) return true;
  if (d >= 8) return true;
  return false;
}

/** First calendar day strictly after `afterYmd` that is on the reminder schedule (relative to due). */
export function nextScheduledReminderStrictlyAfter(dueDateYmd: string, afterYmd: string): string {
  let d = addDaysToISODate(afterYmd, 1);
  for (let i = 0; i < 800; i++) {
    if (isScheduledReminderDay(dueDateYmd, d)) return d;
    d = addDaysToISODate(d, 1);
  }
  return addDaysToISODate(afterYmd, 1);
}

export function isInvoiceEligibleForPaymentReminder(
  status: InvoiceStatus,
  issuedAt: string | null,
  cancelledAt: string | null,
  amountDue: number
): boolean {
  if (cancelledAt) return false;
  if (!issuedAt) return false;
  if (amountDue <= 0) return false;
  if (status === "draft" || status === "paid" || status === "cancelled") return false;
  return status === "issued" || status === "partially_paid" || status === "overdue";
}

export type ShouldShowReminderInput = {
  dueDate: string;
  today: string;
  reminder: PaymentReminderRow | null;
};

/**
 * Show at most once per calendar day per invoice (last_prompt_date).
 * Respect snoozed_until (first day the prompt may appear again).
 */
export function shouldShowPaymentReminder(input: ShouldShowReminderInput): boolean {
  const { dueDate, today, reminder } = input;
  if (!isScheduledReminderDay(dueDate, today)) return false;

  const snoozedUntil = reminder?.snoozed_until ?? "1970-01-01";
  if (today < snoozedUntil) return false;

  const lastPrompt = reminder?.last_prompt_date ?? null;
  if (lastPrompt === today) return false;

  return true;
}

export type ReminderAction = "not_received" | "tomorrow";

export function applyReminderAction(
  action: ReminderAction,
  dueDate: string,
  today: string,
  previous: PaymentReminderRow | null
): { snoozed_until: string; last_prompt_date: string } {
  const lastPrompt = today;
  if (action === "tomorrow") {
    return { snoozed_until: addDaysToISODate(today, 1), last_prompt_date: lastPrompt };
  }
  const next = nextScheduledReminderStrictlyAfter(dueDate, today);
  return { snoozed_until: next, last_prompt_date: lastPrompt };
}
