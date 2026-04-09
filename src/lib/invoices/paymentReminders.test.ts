import { describe, expect, it } from "vitest";
import {
  applyReminderAction,
  daysBetweenIso,
  isInvoiceEligibleForPaymentReminder,
  isScheduledReminderDay,
  nextScheduledReminderStrictlyAfter,
  shouldShowPaymentReminder,
} from "./paymentReminders";
import { deriveInvoiceStatus } from "./invoiceStatus";

describe("payment reminder schedule", () => {
  it("counts calendar days between ISO dates", () => {
    expect(daysBetweenIso("2026-04-01", "2026-04-01")).toBe(0);
    expect(daysBetweenIso("2026-04-01", "2026-04-02")).toBe(1);
    expect(daysBetweenIso("2026-04-01", "2026-04-04")).toBe(3);
  });

  it("flags due, +1, +3, +7 and daily from +8", () => {
    const due = "2026-04-01";
    expect(isScheduledReminderDay(due, "2026-03-31")).toBe(false);
    expect(isScheduledReminderDay(due, "2026-04-01")).toBe(true);
    expect(isScheduledReminderDay(due, "2026-04-02")).toBe(true);
    expect(isScheduledReminderDay(due, "2026-04-03")).toBe(false);
    expect(isScheduledReminderDay(due, "2026-04-04")).toBe(true);
    expect(isScheduledReminderDay(due, "2026-04-08")).toBe(true);
    expect(isScheduledReminderDay(due, "2026-04-09")).toBe(true);
  });

  it("next scheduled after date skips non-reminder days", () => {
    expect(nextScheduledReminderStrictlyAfter("2026-04-01", "2026-04-01")).toBe("2026-04-02");
    expect(nextScheduledReminderStrictlyAfter("2026-04-01", "2026-04-02")).toBe("2026-04-04");
  });
});

describe("shouldShowPaymentReminder", () => {
  const due = "2026-04-10";
  const today = "2026-04-10";

  it("shows when scheduled, not snoozed, not prompted today", () => {
    expect(
      shouldShowPaymentReminder({
        dueDate: due,
        today,
        reminder: { snoozed_until: "1970-01-01", last_prompt_date: null },
      })
    ).toBe(true);
  });

  it("hides when last_prompt_date is today", () => {
    expect(
      shouldShowPaymentReminder({
        dueDate: due,
        today,
        reminder: { snoozed_until: "1970-01-01", last_prompt_date: today },
      })
    ).toBe(false);
  });

  it("hides when before snoozed_until", () => {
    expect(
      shouldShowPaymentReminder({
        dueDate: due,
        today,
        reminder: { snoozed_until: "2026-04-11", last_prompt_date: null },
      })
    ).toBe(false);
  });
});

describe("applyReminderAction", () => {
  it("tomorrow snoozes one day", () => {
    const r = applyReminderAction("tomorrow", "2026-04-01", "2026-04-10", null);
    expect(r.snoozed_until).toBe("2026-04-11");
    expect(r.last_prompt_date).toBe("2026-04-10");
  });

  it("not_received advances to next schedule slot after today", () => {
    const r = applyReminderAction("not_received", "2026-04-01", "2026-04-10", null);
    expect(r.snoozed_until).toBe("2026-04-11");
  });
});

describe("invoice eligibility for reminders", () => {
  it("issued with balance is eligible", () => {
    expect(isInvoiceEligibleForPaymentReminder("issued", "2026-01-01", null, 10)).toBe(true);
  });

  it("draft and paid are not", () => {
    expect(isInvoiceEligibleForPaymentReminder("draft", null, null, 10)).toBe(false);
    expect(isInvoiceEligibleForPaymentReminder("paid", "2026-01-01", null, 0)).toBe(false);
  });
});

describe("status after payments (domain)", () => {
  const base = {
    cancelledAt: null as string | null,
    issuedAt: "2026-01-01T00:00:00.000Z",
    dueDate: "2026-02-01",
    total: 100,
    today: "2026-01-15",
  };

  it("full payment marks paid", () => {
    expect(deriveInvoiceStatus({ ...base, amountPaid: 100 })).toBe("paid");
  });

  it("partial payment marks partially_paid", () => {
    expect(deriveInvoiceStatus({ ...base, amountPaid: 40 })).toBe("partially_paid");
  });

  it("unpaid past due is overdue", () => {
    expect(
      deriveInvoiceStatus({
        ...base,
        dueDate: "2026-01-01",
        today: "2026-01-20",
        amountPaid: 0,
      })
    ).toBe("overdue");
  });

  it("overdue clears when fully paid", () => {
    expect(
      deriveInvoiceStatus({
        ...base,
        dueDate: "2026-01-01",
        today: "2026-01-20",
        amountPaid: 100,
      })
    ).toBe("paid");
  });
});
