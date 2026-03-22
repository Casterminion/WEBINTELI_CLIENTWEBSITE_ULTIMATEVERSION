"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Landmark,
  Loader2,
  PiggyBank,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";
import { AdminFinanceMonthChart } from "@/components/admin/AdminFinanceMonthChart";
import { formatEur, localTodayISO } from "@/lib/adminFormat";

function startOfMonthISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

type FinanceEntry = {
  id: string;
  user_id: string;
  occurred_on: string;
  entry_type: "income" | "expense";
  amount_eur: number;
  note: string | null;
};

type FinTab = "overview" | "income" | "expense";

function YearIncomeExpenseBars({
  months,
  incomeLabel,
  expenseLabel,
}: {
  months: { monthIndex: number; label: string; income: number; expense: number }[];
  incomeLabel: string;
  expenseLabel: string;
}) {
  const maxVal = Math.max(1, ...months.map((m) => m.income + m.expense));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-[10px]" style={{ color: "var(--admin-text-muted)" }}>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500/85" aria-hidden />
          {incomeLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-rose-500/75" aria-hidden />
          {expenseLabel}
        </span>
      </div>
      <div className="flex items-end gap-1 sm:gap-1.5 h-36 px-1">
        {months.map((m) => {
          const hInc = (m.income / maxVal) * 100;
          const hExp = (m.expense / maxVal) * 100;
          return (
            <div key={m.monthIndex} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="flex h-28 w-full max-w-[48px] items-end justify-center gap-0.5 mx-auto">
                <div
                  className="w-[42%] max-w-[18px] rounded-t-sm bg-emerald-500/85 transition-all"
                  style={{ height: `${Math.max(hInc, m.income > 0 ? 4 : 0)}%` }}
                  title={`${incomeLabel}: ${formatEur(m.income)}`}
                />
                <div
                  className="w-[42%] max-w-[18px] rounded-t-sm bg-rose-500/75 transition-all"
                  style={{ height: `${Math.max(hExp, m.expense > 0 ? 4 : 0)}%` }}
                  title={`${expenseLabel}: ${formatEur(m.expense)}`}
                />
              </div>
              <span
                className="text-[9px] font-medium uppercase tracking-tighter truncate w-full text-center"
                style={{ color: "var(--admin-text-muted)" }}
              >
                {m.label.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminFinancaiPage() {
  const { t, locale } = useLanguage();
  const a = t.admin;

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<FinTab>("overview");

  const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>([]);
  const [newEntry, setNewEntry] = useState({
    occurred_on: localTodayISO(),
    amount_eur: "",
    note: "",
  });
  const [savingFinance, setSavingFinance] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => startOfMonthISO(now), [now]);
  const today = useMemo(() => localTodayISO(), []);
  const currentYear = now.getFullYear();

  const reload = useCallback(async (uid: string) => {
    setError(null);
    const fRes = await supabase
      .from("admin_finance_entries")
      .select("*")
      .eq("user_id", uid)
      .order("occurred_on", { ascending: false });
    if (fRes.error) setError(fRes.error.message);
    else setFinanceEntries((fRes.data ?? []) as FinanceEntry[]);
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

  const financeAgg = useMemo(() => {
    const monthRows = financeEntries.filter((e) => e.occurred_on >= monthStart && e.occurred_on <= today);
    const sumIncome = (rows: FinanceEntry[]) =>
      rows.filter((e) => e.entry_type === "income").reduce((s, e) => s + Number(e.amount_eur), 0);
    const sumExpense = (rows: FinanceEntry[]) =>
      rows.filter((e) => e.entry_type === "expense").reduce((s, e) => s + Number(e.amount_eur), 0);
    const incM = sumIncome(monthRows);
    const expM = sumExpense(monthRows);
    const incA = sumIncome(financeEntries);
    const expA = sumExpense(financeEntries);
    return {
      monthIncome: incM,
      monthExpense: expM,
      monthNet: incM - expM,
      allIncome: incA,
      allExpense: expA,
      allNet: incA - expA,
    };
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
        income: dayRows.filter((e) => e.entry_type === "income").reduce((s, e) => s + Number(e.amount_eur), 0),
        expense: dayRows.filter((e) => e.entry_type === "expense").reduce((s, e) => s + Number(e.amount_eur), 0),
      });
    }
    return buckets;
  }, [financeEntries, today]);

  const financeMonthIsEmpty = financeMonthDaily.every((d) => d.income === 0 && d.expense === 0);

  const yearByMonth = useMemo(() => {
    const months: { monthIndex: number; label: string; income: number; expense: number; net: number }[] = [];
    const formatter = new Intl.DateTimeFormat(locale === "lt" ? "lt-LT" : "en-GB", { month: "long" });
    for (let m = 0; m < 12; m += 1) {
      const start = `${currentYear}-${String(m + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(currentYear, m + 1, 0).getDate();
      const end = `${currentYear}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const rows = financeEntries.filter((e) => e.occurred_on >= start && e.occurred_on <= end);
      const income = rows.filter((e) => e.entry_type === "income").reduce((s, e) => s + Number(e.amount_eur), 0);
      const expense = rows.filter((e) => e.entry_type === "expense").reduce((s, e) => s + Number(e.amount_eur), 0);
      months.push({
        monthIndex: m,
        label: formatter.format(new Date(currentYear, m, 1)),
        income,
        expense,
        net: income - expense,
      });
    }
    return months;
  }, [financeEntries, currentYear, locale]);

  const incomeEntries = useMemo(() => financeEntries.filter((e) => e.entry_type === "income"), [financeEntries]);
  const expenseEntries = useMemo(() => financeEntries.filter((e) => e.entry_type === "expense"), [financeEntries]);

  const addFinanceEntry = async (e: React.FormEvent, entry_type: "income" | "expense") => {
    e.preventDefault();
    if (!userId) return;
    const amt = parseFloat(newEntry.amount_eur.replace(",", "."));
    if (Number.isNaN(amt) || amt < 0) {
      setError("Invalid amount");
      return;
    }
    setSavingFinance(true);
    setError(null);
    const { error: insErr } = await supabase.from("admin_finance_entries").insert({
      user_id: userId,
      occurred_on: newEntry.occurred_on,
      entry_type,
      amount_eur: amt,
      note: newEntry.note.trim() || null,
    });
    setSavingFinance(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setNewEntry({ occurred_on: localTodayISO(), amount_eur: "", note: "" });
    await reload(userId);
  };

  const deleteFinanceEntry = async (id: string) => {
    if (!userId) return;
    setDeletingId(id);
    setError(null);
    const { error: delErr } = await supabase.from("admin_finance_entries").delete().eq("id", id);
    setDeletingId(null);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    await reload(userId);
  };

  const tabBtn = (id: FinTab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className="px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
      style={{
        borderColor: tab === id ? "var(--admin-accent)" : "transparent",
        color: tab === id ? "var(--admin-text)" : "var(--admin-text-muted)",
      }}
    >
      {label}
    </button>
  );

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
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight" style={{ color: "var(--admin-text)" }}>
          {a?.financai ?? "Finance"}
        </h1>
        <p className="mt-0.5 max-w-2xl text-xs" style={{ color: "var(--admin-text-muted)" }}>
          {a?.financaiPageSubtitle ?? ""}
        </p>
      </header>

      <div
        className="flex flex-wrap gap-1 border-b"
        style={{ borderColor: "var(--admin-border)" }}
        role="tablist"
      >
        {tabBtn("overview", a?.financaiTabOverview ?? "Dashboard")}
        {tabBtn("income", a?.financaiTabIncome ?? "Income")}
        {tabBtn("expense", a?.financaiTabExpense ?? "Expenses")}
      </div>

      {error && (
        <div
          className="rounded-md border px-4 py-3 text-sm"
          style={{ borderColor: "var(--admin-border)", color: "var(--admin-accent)" }}
        >
          {error}
        </div>
      )}

      {/* ——— Overview: KPIs + charts only ——— */}
      {tab === "overview" && (
        <div className="space-y-8" role="tabpanel">
          <section className="space-y-4" aria-label={a?.dashboardAtAGlance ?? "Summary"}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--admin-text-muted)" }}>
              {a?.dashboardAtAGlance ?? "At a glance"}
            </h2>

            <p className="text-[10px] font-medium uppercase tracking-wider -mt-1" style={{ color: "var(--admin-accent)" }}>
              {a?.dashboardKeyFinanceMonth ?? "This month"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <AdminKpiCard
                large
                accent="var(--admin-accent)"
                label={`${a?.dashboardThisMonth ?? "Month"} · ${a?.dashboardNetProfit ?? "Net"}`}
                icon={financeAgg.monthNet >= 0 ? TrendingUp : TrendingDown}
                value={
                  <span
                    style={{
                      color: financeAgg.monthNet >= 0 ? "var(--admin-success, #22c55e)" : "#f87171",
                    }}
                  >
                    {formatEur(financeAgg.monthNet)}
                  </span>
                }
              />
              <AdminKpiCard
                label={`${a?.dashboardThisMonth ?? "Month"} · ${a?.dashboardRevenue ?? "Revenue"}`}
                icon={Wallet}
                value={formatEur(financeAgg.monthIncome)}
              />
              <AdminKpiCard
                label={`${a?.dashboardThisMonth ?? "Month"} · ${a?.dashboardExpenses ?? "Expenses"}`}
                icon={Landmark}
                value={formatEur(financeAgg.monthExpense)}
              />
            </div>

            <p className="text-[10px] font-medium uppercase tracking-wider pt-2" style={{ color: "var(--admin-text-muted)" }}>
              {a?.dashboardAllTime ?? "All time"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <AdminKpiCard
                label={`${a?.dashboardAllTime ?? "All"} · ${a?.dashboardNetProfit ?? "Net"}`}
                icon={financeAgg.allNet >= 0 ? TrendingUp : TrendingDown}
                value={
                  <span
                    style={{
                      color: financeAgg.allNet >= 0 ? "var(--admin-success, #22c55e)" : "#f87171",
                    }}
                  >
                    {formatEur(financeAgg.allNet)}
                  </span>
                }
              />
              <AdminKpiCard
                label={`${a?.dashboardAllTime ?? "All"} · ${a?.dashboardRevenue ?? "Revenue"}`}
                icon={PiggyBank}
                value={formatEur(financeAgg.allIncome)}
              />
              <AdminKpiCard
                label={`${a?.dashboardAllTime ?? "All"} · ${a?.dashboardExpenses ?? "Expenses"}`}
                icon={Wallet}
                value={formatEur(financeAgg.allExpense)}
              />
            </div>
          </section>

          <section
            className="rounded-xl border overflow-hidden p-5 space-y-4"
            style={{ borderColor: "var(--admin-border)", background: "var(--admin-panel)" }}
            aria-label={a?.financaiOverviewCharts ?? "Charts"}
          >
            <h2 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
              {a?.financaiOverviewCharts ?? "Charts"}
            </h2>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: "var(--admin-text-muted)" }}>
                {a?.dashboardKeyFinanceMonth ?? "This month"} · {a?.dashboardNetProfit ?? "Net"} ({a?.dashboardFinanceChartLegend ?? ""})
              </p>
              <AdminFinanceMonthChart
                days={financeMonthDaily}
                ariaLabel={a?.dashboardFinanceChartLegend}
                isEmpty={financeMonthIsEmpty}
                emptyLabel={a?.dashboardFinanceNoActivity}
              />
            </div>
            <div className="pt-2 border-t" style={{ borderColor: "var(--admin-border)" }}>
              <p className="text-[10px] font-medium uppercase tracking-wider mb-3" style={{ color: "var(--admin-text-muted)" }}>
                {currentYear} · {a?.dashboardRevenue ?? "Income"} / {a?.dashboardExpenses ?? "Expenses"}
              </p>
              <YearIncomeExpenseBars
                months={yearByMonth}
                incomeLabel={a?.dashboardIncome ?? "Income"}
                expenseLabel={a?.dashboardExpense ?? "Expense"}
              />
            </div>
          </section>
        </div>
      )}

      {/* ——— Income: form + table ——— */}
      {tab === "income" && (
        <div className="space-y-6" role="tabpanel">
          <section
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--admin-border)", background: "var(--admin-panel)" }}
          >
            <div className="border-b px-5 py-3" style={{ borderColor: "var(--admin-border)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
                {a?.financaiIncomeSection ?? "Income"}
              </h2>
            </div>
            <div className="p-5 space-y-6">
              <form
                onSubmit={(e) => void addFinanceEntry(e, "income")}
                className="rounded-lg border p-4 space-y-3"
                style={{ borderColor: "var(--admin-border)" }}
              >
                <p className="text-xs font-medium" style={{ color: "var(--admin-text)" }}>
                  {a?.dashboardAddEntry ?? "Add"} · {a?.dashboardIncome ?? "Income"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <label className="block text-xs">
                    <span style={{ color: "var(--admin-text-muted)" }}>{a?.dashboardDate ?? "Date"}</span>
                    <input
                      type="date"
                      required
                      value={newEntry.occurred_on}
                      onChange={(ev) => setNewEntry((n) => ({ ...n, occurred_on: ev.target.value }))}
                      className="admin-input mt-1 w-full rounded-lg px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-xs">
                    <span style={{ color: "var(--admin-text-muted)" }}>{a?.dashboardAmountEur ?? "Amount"}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="0.00"
                      value={newEntry.amount_eur}
                      onChange={(ev) => setNewEntry((n) => ({ ...n, amount_eur: ev.target.value }))}
                      className="admin-input mt-1 w-full rounded-lg px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-xs sm:col-span-2 lg:col-span-2">
                    <span style={{ color: "var(--admin-text-muted)" }}>{a?.dashboardNote ?? "Note"}</span>
                    <input
                      type="text"
                      value={newEntry.note}
                      onChange={(ev) => setNewEntry((n) => ({ ...n, note: ev.target.value }))}
                      className="admin-input mt-1 w-full rounded-lg px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={savingFinance || !userId}
                  className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                  style={{ background: "var(--admin-accent)", color: "#fff" }}
                >
                  {savingFinance ? (a?.dashboardSavingEntry ?? "…") : (a?.dashboardAddEntry ?? "Add")}
                </button>
              </form>

              <div>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--admin-text)" }}>
                  {a?.dashboardYearByMonth ?? "Year"} ({currentYear}) — {a?.dashboardIncome ?? "Income"}
                </p>
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--admin-border)" }}>
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr style={{ background: "var(--admin-bg)", color: "var(--admin-text-muted)" }}>
                        <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider">{a?.dashboardMonth ?? "Month"}</th>
                        <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider">{a?.dashboardRevenue ?? "Revenue"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearByMonth.map((row) => (
                        <tr key={row.monthIndex} style={{ borderTop: "1px solid var(--admin-border)" }}>
                          <td className="px-3 py-2 capitalize" style={{ color: "var(--admin-text)" }}>
                            {row.label}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatEur(row.income)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--admin-text)" }}>
                  {a?.dashboardEntries ?? "Entries"}
                </p>
                {incomeEntries.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>
                    {a?.dashboardNoEntries ?? "No entries."}
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--admin-border)" }}>
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr style={{ background: "var(--admin-bg)", color: "var(--admin-text-muted)" }}>
                          <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider">{a?.dashboardDate ?? "Date"}</th>
                          <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider">{a?.dashboardAmountEur ?? "Amount"}</th>
                          <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider">{a?.dashboardNote ?? "Note"}</th>
                          <th className="w-10 px-2 py-2" aria-label="Delete" />
                        </tr>
                      </thead>
                      <tbody>
                        {incomeEntries.map((entry) => (
                          <tr key={entry.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                            <td className="px-3 py-2 tabular-nums" style={{ color: "var(--admin-text)" }}>
                              {entry.occurred_on}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{formatEur(Number(entry.amount_eur))}</td>
                            <td className="px-3 py-2 max-w-[240px] truncate" style={{ color: "var(--admin-text-muted)" }}>
                              {entry.note ?? "—"}
                            </td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={() => void deleteFinanceEntry(entry.id)}
                                disabled={deletingId === entry.id}
                                className="p-1.5 rounded transition-colors hover:bg-red-500/10"
                                style={{ color: "var(--admin-text-muted)" }}
                                title={a?.dashboardDeleteEntry ?? "Delete"}
                                aria-label={a?.dashboardDeleteEntry ?? "Delete"}
                              >
                                {deletingId === entry.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ——— Expenses: form + table ——— */}
      {tab === "expense" && (
        <div className="space-y-6" role="tabpanel">
          <section
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--admin-border)", background: "var(--admin-panel)" }}
          >
            <div className="border-b px-5 py-3" style={{ borderColor: "var(--admin-border)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
                {a?.financaiExpenseSection ?? "Expenses"}
              </h2>
            </div>
            <div className="p-5 space-y-6">
              <form
                onSubmit={(e) => void addFinanceEntry(e, "expense")}
                className="rounded-lg border p-4 space-y-3"
                style={{ borderColor: "var(--admin-border)" }}
              >
                <p className="text-xs font-medium" style={{ color: "var(--admin-text)" }}>
                  {a?.dashboardAddEntry ?? "Add"} · {a?.dashboardExpense ?? "Expense"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <label className="block text-xs">
                    <span style={{ color: "var(--admin-text-muted)" }}>{a?.dashboardDate ?? "Date"}</span>
                    <input
                      type="date"
                      required
                      value={newEntry.occurred_on}
                      onChange={(ev) => setNewEntry((n) => ({ ...n, occurred_on: ev.target.value }))}
                      className="admin-input mt-1 w-full rounded-lg px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-xs">
                    <span style={{ color: "var(--admin-text-muted)" }}>{a?.dashboardAmountEur ?? "Amount"}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="0.00"
                      value={newEntry.amount_eur}
                      onChange={(ev) => setNewEntry((n) => ({ ...n, amount_eur: ev.target.value }))}
                      className="admin-input mt-1 w-full rounded-lg px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-xs sm:col-span-2 lg:col-span-2">
                    <span style={{ color: "var(--admin-text-muted)" }}>{a?.dashboardNote ?? "Note"}</span>
                    <input
                      type="text"
                      value={newEntry.note}
                      onChange={(ev) => setNewEntry((n) => ({ ...n, note: ev.target.value }))}
                      className="admin-input mt-1 w-full rounded-lg px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={savingFinance || !userId}
                  className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                  style={{ background: "var(--admin-accent)", color: "#fff" }}
                >
                  {savingFinance ? (a?.dashboardSavingEntry ?? "…") : (a?.dashboardAddEntry ?? "Add")}
                </button>
              </form>

              <div>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--admin-text)" }}>
                  {a?.dashboardYearByMonth ?? "Year"} ({currentYear}) — {a?.dashboardExpenses ?? "Expenses"}
                </p>
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--admin-border)" }}>
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr style={{ background: "var(--admin-bg)", color: "var(--admin-text-muted)" }}>
                        <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider">{a?.dashboardMonth ?? "Month"}</th>
                        <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider">{a?.dashboardExpenses ?? "Expenses"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearByMonth.map((row) => (
                        <tr key={row.monthIndex} style={{ borderTop: "1px solid var(--admin-border)" }}>
                          <td className="px-3 py-2 capitalize" style={{ color: "var(--admin-text)" }}>
                            {row.label}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatEur(row.expense)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--admin-text)" }}>
                  {a?.dashboardEntries ?? "Entries"}
                </p>
                {expenseEntries.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>
                    {a?.dashboardNoEntries ?? "No entries."}
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--admin-border)" }}>
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr style={{ background: "var(--admin-bg)", color: "var(--admin-text-muted)" }}>
                          <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider">{a?.dashboardDate ?? "Date"}</th>
                          <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider">{a?.dashboardAmountEur ?? "Amount"}</th>
                          <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider">{a?.dashboardNote ?? "Note"}</th>
                          <th className="w-10 px-2 py-2" aria-label="Delete" />
                        </tr>
                      </thead>
                      <tbody>
                        {expenseEntries.map((entry) => (
                          <tr key={entry.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                            <td className="px-3 py-2 tabular-nums" style={{ color: "var(--admin-text)" }}>
                              {entry.occurred_on}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{formatEur(Number(entry.amount_eur))}</td>
                            <td className="px-3 py-2 max-w-[240px] truncate" style={{ color: "var(--admin-text-muted)" }}>
                              {entry.note ?? "—"}
                            </td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={() => void deleteFinanceEntry(entry.id)}
                                disabled={deletingId === entry.id}
                                className="p-1.5 rounded transition-colors hover:bg-red-500/10"
                                style={{ color: "var(--admin-text-muted)" }}
                                title={a?.dashboardDeleteEntry ?? "Delete"}
                                aria-label={a?.dashboardDeleteEntry ?? "Delete"}
                              >
                                {deletingId === entry.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
