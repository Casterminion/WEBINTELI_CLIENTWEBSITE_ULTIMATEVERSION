import {
  VAT_EU_GOODS_ACQUISITIONS_THRESHOLD_EUR,
  VAT_TURNOVER_THRESHOLD_EUR,
} from "./vatThresholds";
import { amountDue, deriveInvoiceStatus, type DeriveStatusInput } from "./invoiceStatus";

/** Visual zones for 45k monitoring (percent = unclamped share of threshold × 100). */
export type VatProgressZone = "safe" | "approaching" | "near" | "critical";

/** Progress ring / bar state for 45k main threshold (informal monitoring). */
export function vatMainThresholdZone(percentTowardThreshold: number): VatProgressZone {
  if (percentTowardThreshold >= 100) return "critical";
  if (percentTowardThreshold >= 90) return "near";
  if (percentTowardThreshold >= 72) return "approaching";
  return "safe";
}

export function clampPercent(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/**
 * Sum issued sales_invoice totals (excludes draft & cancelled).
 * Caller should filter by calendar year via query; rows are expected pre-filtered.
 */
export function sumIssuedSalesInvoiceTotalsEur(
  rows: { total: unknown; status: string; document_type?: string }[]
): number {
  let sum = 0;
  for (const r of rows) {
    if (r.document_type && r.document_type !== "sales_invoice") continue;
    if (r.status === "draft" || r.status === "cancelled") continue;
    sum += Number(r.total) || 0;
  }
  return Math.round(sum * 100) / 100;
}

export function sumIssuedInMonthEur(
  rows: { total: unknown; status: string; issue_date: string; document_type?: string }[],
  year: number,
  monthIndex0: number
): number {
  let sum = 0;
  const ym = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}`;
  for (const r of rows) {
    if (r.document_type && r.document_type !== "sales_invoice") continue;
    if (r.status === "draft" || r.status === "cancelled") continue;
    const id = String(r.issue_date ?? "").slice(0, 7);
    if (id !== ym) continue;
    sum += Number(r.total) || 0;
  }
  return Math.round(sum * 100) / 100;
}

export type InvoiceRowForStatus = {
  id: string;
  total: unknown;
  issued_at: string | null;
  cancelled_at: string | null;
  due_date: string;
  status: string;
};

/**
 * Unpaid / overdue EUR from invoices + payment totals map (invoice_id -> sum paid).
 */
export function aggregateOutstandingEur(
  invoices: InvoiceRowForStatus[],
  paidByInvoiceId: Map<string, number>,
  todayIso: string
): { unpaidTotalEur: number; overdueCount: number; overdueTotalEur: number } {
  let unpaidTotalEur = 0;
  let overdueCount = 0;
  let overdueTotalEur = 0;

  for (const inv of invoices) {
    if (inv.status === "draft" || inv.status === "cancelled") continue;
    if (!inv.issued_at) continue;

    const total = Number(inv.total) || 0;
    const amountPaid = paidByInvoiceId.get(inv.id) ?? 0;
    const input: DeriveStatusInput = {
      cancelledAt: inv.cancelled_at,
      issuedAt: inv.issued_at,
      dueDate: inv.due_date,
      total,
      amountPaid,
      today: todayIso,
    };
    const st = deriveInvoiceStatus(input);
    const due = amountDue(total, amountPaid);
    if (due <= 0) continue;

    unpaidTotalEur += due;
    if (st === "overdue") {
      overdueCount += 1;
      overdueTotalEur += due;
    }
  }

  return {
    unpaidTotalEur: Math.round(unpaidTotalEur * 100) / 100,
    overdueCount,
    overdueTotalEur: Math.round(overdueTotalEur * 100) / 100,
  };
}

/**
 * Rough months until 45k at current YTD invoice pace (invoice-derived only, not manual override).
 */
export function estimateMonthsToMainThreshold(
  ytdFromInvoicesEur: number,
  now: Date,
  threshold: number = VAT_TURNOVER_THRESHOLD_EUR
): number | null {
  if (ytdFromInvoicesEur <= 0 || threshold <= 0) return null;
  const start = new Date(now.getFullYear(), 0, 1);
  const daysElapsed = Math.max(
    1,
    Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1
  );
  const daily = ytdFromInvoicesEur / daysElapsed;
  if (daily <= 0) return null;
  const remaining = threshold - ytdFromInvoicesEur;
  if (remaining <= 0) return 0;
  const daysToGo = remaining / daily;
  return Math.round((daysToGo / 30.44) * 10) / 10;
}

export const VAT_THRESHOLDS = {
  main: VAT_TURNOVER_THRESHOLD_EUR,
  euGoods: VAT_EU_GOODS_ACQUISITIONS_THRESHOLD_EUR,
} as const;
