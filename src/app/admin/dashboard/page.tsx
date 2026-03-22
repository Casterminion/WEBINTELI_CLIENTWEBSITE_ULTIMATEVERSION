"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { AdminFinanceMonthChart } from "@/components/admin/AdminFinanceMonthChart";
import { formatEur, localTodayISO } from "@/lib/adminFormat";
import styles from "./DashboardPage.module.css";

function startOfMonthISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

const METRIC_KEYS = [
  "sent_emails",
  "calls_made",
  "emails_opened",
  "replies",
  "positive_replies",
  "looms_sent",
  "payment_links_sent",
  "meetings_got",
  "clients_got",
  "upsells",
] as const;

type MetricKey = (typeof METRIC_KEYS)[number];

const METRIC_LABEL_KEYS: Record<
  MetricKey,
  | "milestoneSentEmails"
  | "milestoneCalls"
  | "milestoneEmailsOpened"
  | "milestoneReplies"
  | "milestonePositiveReplies"
  | "milestoneLooms"
  | "milestonePaymentLinks"
  | "milestoneMeetings"
  | "milestoneClients"
  | "milestoneUpsells"
> = {
  sent_emails: "milestoneSentEmails",
  calls_made: "milestoneCalls",
  emails_opened: "milestoneEmailsOpened",
  replies: "milestoneReplies",
  positive_replies: "milestonePositiveReplies",
  looms_sent: "milestoneLooms",
  payment_links_sent: "milestonePaymentLinks",
  meetings_got: "milestoneMeetings",
  clients_got: "milestoneClients",
  upsells: "milestoneUpsells",
};

type DailyMetricRow = {
  id: string;
  user_id: string;
  date: string;
} & Record<MetricKey, number>;

type FinanceEntry = {
  id: string;
  user_id: string;
  occurred_on: string;
  entry_type: "income" | "expense";
  amount_eur: number;
  note: string | null;
};

function emptyMetrics(): Record<MetricKey, number> {
  return {
    sent_emails: 0,
    calls_made: 0,
    emails_opened: 0,
    replies: 0,
    positive_replies: 0,
    looms_sent: 0,
    payment_links_sent: 0,
    meetings_got: 0,
    clients_got: 0,
    upsells: 0,
  };
}

function sumMetrics(rows: DailyMetricRow[]): Record<MetricKey, number> {
  const acc = emptyMetrics();
  for (const row of rows) {
    for (const k of METRIC_KEYS) {
      acc[k] += Number(row[k] ?? 0);
    }
  }
  return acc;
}

function sumIncome(rows: FinanceEntry[]): number {
  return rows.filter((e) => e.entry_type === "income").reduce((s, e) => s + Number(e.amount_eur), 0);
}

function sumExpense(rows: FinanceEntry[]): number {
  return rows.filter((e) => e.entry_type === "expense").reduce((s, e) => s + Number(e.amount_eur), 0);
}

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const a = t.admin;

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [metricRows, setMetricRows] = useState<DailyMetricRow[]>([]);
  const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>([]);
  const [todayDraft, setTodayDraft] = useState<Record<MetricKey, number>>(emptyMetrics());
  const [savingMetrics, setSavingMetrics] = useState(false);

  const today = useMemo(() => localTodayISO(), []);
  const now = useMemo(() => new Date(), []);

  const monthStart = useMemo(() => startOfMonthISO(now), [now]);

  const reload = useCallback(async (uid: string) => {
    setError(null);
    const [mRes, fRes] = await Promise.all([
      supabase.from("admin_daily_metrics").select("*").eq("user_id", uid),
      supabase.from("admin_finance_entries").select("*").eq("user_id", uid).order("occurred_on", { ascending: true }),
    ]);

    let err: string | null = null;
    if (mRes.error) err = mRes.error.message;
    if (fRes.error) err = err ? `${err} · ${fRes.error.message}` : fRes.error.message;
    setError(err);

    if (!mRes.error) setMetricRows((mRes.data ?? []) as DailyMetricRow[]);
    if (!fRes.error) setFinanceEntries((fRes.data ?? []) as FinanceEntry[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      await reload(user.id);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    const row = metricRows.find((r) => r.date === today);
    if (row) {
      const next = emptyMetrics();
      for (const k of METRIC_KEYS) next[k] = Number(row[k] ?? 0);
      setTodayDraft(next);
    } else {
      setTodayDraft(emptyMetrics());
    }
  }, [metricRows, today]);

  const monthTotals = useMemo(() => {
    const inMonth = metricRows.filter((r) => r.date >= monthStart && r.date <= today);
    return sumMetrics(inMonth);
  }, [metricRows, monthStart, today]);

  const allTimeTotals = useMemo(() => sumMetrics(metricRows), [metricRows]);

  const financeMonth = useMemo(() => {
    const monthRows = financeEntries.filter((e) => e.occurred_on >= monthStart && e.occurred_on <= today);
    const inc = sumIncome(monthRows);
    const exp = sumExpense(monthRows);
    return { income: inc, expense: exp, net: inc - exp };
  }, [financeEntries, monthStart, today]);

  const financeMonthDaily = useMemo(() => {
    const [yStr, mStr, dStr] = today.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    const currentDayNum = parseInt(dStr, 10);
    const buckets: { day: number; income: number; expense: number }[] = [];
    for (let d = 1; d <= currentDayNum; d += 1) {
      const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayRows = financeEntries.filter((e) => e.occurred_on === iso);
      buckets.push({
        day: d,
        income: sumIncome(dayRows),
        expense: sumExpense(dayRows),
      });
    }
    return buckets;
  }, [financeEntries, today]);

  const financeMonthIsEmpty = financeMonth.income === 0 && financeMonth.expense === 0;

  const saveTodayMetrics = async () => {
    if (!userId) return;
    setSavingMetrics(true);
    setError(null);
    const payload = {
      user_id: userId,
      date: today,
      ...todayDraft,
      updated_at: new Date().toISOString(),
    };
    const { error: upErr } = await supabase.from("admin_daily_metrics").upsert(payload, {
      onConflict: "user_id,date",
    });
    setSavingMetrics(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    await reload(userId);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--admin-accent)" }} />
        <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>
          {a?.loadingDashboard ?? "Loading…"}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.pageHeader}>
        <div className="min-w-0">
          <h1 className={styles.title}>{a?.dashboard ?? "Dashboard"}</h1>
          <p className={styles.subtitle}>{a?.dashboardSubtitle ?? ""}</p>
        </div>
        <span className={styles.datePill}>{today}</span>
      </header>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <section className={styles.card} aria-label={a?.dashboardFinanceSnapshot ?? "This month finance"}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{a?.dashboardFinanceSnapshot ?? "This month — finance"}</h2>
          <Link href="/admin/financai" className={styles.ledgerLink}>
            {a?.dashboardViewFinancai ?? "Ledger"} <span aria-hidden>→</span>
          </Link>
        </div>

        <div className={styles.financeBody}>
          <div className={styles.statRail}>
            <div className={styles.statCell}>
              <span className={styles.statLabel}>{a?.dashboardRevenue ?? "Income"}</span>
              <p className={styles.statValue}>{formatEur(financeMonth.income)}</p>
            </div>
            <div className={styles.statCell}>
              <span className={styles.statLabel}>{a?.dashboardExpenses ?? "Expenses"}</span>
              <p className={styles.statValue}>{formatEur(financeMonth.expense)}</p>
            </div>
            <div className={styles.statCell}>
              <span className={styles.statLabel}>{a?.dashboardNetProfit ?? "Net"}</span>
              <p
                className={[
                  styles.statValue,
                  financeMonth.net >= 0 ? styles.statValueNetPos : styles.statValueNetNeg,
                ].join(" ")}
              >
                {formatEur(financeMonth.net)}
              </p>
            </div>
          </div>

          <div className={styles.chartWrap}>
            <AdminFinanceMonthChart
              days={financeMonthDaily}
              ariaLabel={a?.dashboardFinanceChartLegend}
              isEmpty={financeMonthIsEmpty}
              emptyLabel={a?.dashboardFinanceNoActivity}
            />
            {!financeMonthIsEmpty && (
              <p
                className="mt-1.5 text-center text-[10px] font-medium md:text-left"
                style={{ color: "var(--admin-text-muted)", opacity: 0.65, letterSpacing: "0.02em" }}
              >
                {a?.dashboardFinanceChartLegend}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className={styles.card} aria-label={a?.dashboardMilestonesTitle ?? "Milestones"}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{a?.dashboardMilestonesTitle ?? "Milestones"}</h2>
          <button
            type="button"
            onClick={() => void saveTodayMetrics()}
            disabled={savingMetrics || !userId}
            className={styles.saveBtn}
          >
            {savingMetrics ? (a?.dashboardSavingMilestones ?? "…") : (a?.dashboardSaveMilestones ?? "Save")}
          </button>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{a?.dashboardTableMetric ?? "Metric"}</th>
                <th>{a?.dashboardKeyToday ?? "Today"}</th>
                <th>{a?.dashboardThisMonth ?? "Month"}</th>
                <th>{a?.dashboardAllTime ?? "All"}</th>
              </tr>
            </thead>
            <tbody>
              {METRIC_KEYS.map((key) => (
                <tr key={key}>
                  <td>{(a?.[METRIC_LABEL_KEYS[key]] as string) ?? key}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={todayDraft[key]}
                      onChange={(ev) =>
                        setTodayDraft((d) => ({
                          ...d,
                          [key]: Math.max(0, Math.floor(Number(ev.target.value) || 0)),
                        }))
                      }
                      className={`admin-input ${styles.tableInput}`}
                      aria-label={(a?.[METRIC_LABEL_KEYS[key]] as string) ?? key}
                    />
                  </td>
                  <td>{monthTotals[key]}</td>
                  <td>{allTimeTotals[key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
