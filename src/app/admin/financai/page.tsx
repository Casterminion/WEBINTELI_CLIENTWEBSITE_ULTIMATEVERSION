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

export default function AdminFinancaiPage() {
  const { t, locale } = useLanguage();
  const a = t.admin;

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>([]);
  const [newEntry, setNewEntry] = useState({
    occurred_on: localTodayISO(),
    entry_type: "income" as "income" | "expense",
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

  const addFinanceEntry = async (e: React.FormEvent) => {
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
      entry_type: newEntry.entry_type,
      amount_eur: amt,
      note: newEntry.note.trim() || null,
    });
    setSavingFinance(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setNewEntry({ occurred_on: localTodayISO(), entry_type: "income", amount_eur: "", note: "" });
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
    <div className="space-y-8">
      <header>
        <h1 className="text-lg font-semibold tracking-tight" style={{ color: "var(--admin-text)" }}>
          {a?.financai ?? "Finance"}
        </h1>
        <p className="mt-0.5 max-w-2xl text-xs" style={{ color: "var(--admin-text-muted)" }}>
          {a?.financaiPageSubtitle ?? ""}
        </p>
      </header>

      {error && (
        <div
          className="rounded-md border px-4 py-3 text-sm"
          style={{ borderColor: "var(--admin-border)", color: "var(--admin-accent)" }}
        >
          {error}
        </div>
      )}

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
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--admin-border)", background: "var(--admin-panel)" }}
      >
        <div className="border-b px-5 py-3" style={{ borderColor: "var(--admin-border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
            {a?.dashboardFinanceTitle ?? "Finance"}
          </h2>
        </div>
        <div className="p-5 space-y-6">
          <form onSubmit={addFinanceEntry} className="rounded-lg border p-4 space-y-3" style={{ borderColor: "var(--admin-border)" }}>
            <p className="text-xs font-medium" style={{ color: "var(--admin-text)" }}>
              {a?.dashboardAddEntry ?? "Add entry"}
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
                <span style={{ color: "var(--admin-text-muted)" }}>{a?.type ?? "Type"}</span>
                <select
                  value={newEntry.entry_type}
                  onChange={(ev) =>
                    setNewEntry((n) => ({ ...n, entry_type: ev.target.value as "income" | "expense" }))
                  }
                  className="admin-input mt-1 w-full rounded-lg px-3 py-2 text-sm"
                >
                  <option value="income">{a?.dashboardIncome ?? "Income"}</option>
                  <option value="expense">{a?.dashboardExpense ?? "Expense"}</option>
                </select>
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
              <label className="block text-xs sm:col-span-2 lg:col-span-1">
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
              {a?.dashboardYearByMonth ?? "Year"} ({currentYear})
            </p>
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--admin-border)" }}>
              <table className="min-w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--admin-bg)", color: "var(--admin-text-muted)" }}>
                    <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider">{a?.dashboardMonth ?? "Month"}</th>
                    <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider">{a?.dashboardRevenue ?? "Revenue"}</th>
                    <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider">{a?.dashboardExpenses ?? "Expenses"}</th>
                    <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider">{a?.dashboardNetProfit ?? "Net"}</th>
                  </tr>
                </thead>
                <tbody>
                  {yearByMonth.map((row) => (
                    <tr key={row.monthIndex} style={{ borderTop: "1px solid var(--admin-border)" }}>
                      <td className="px-3 py-2 capitalize" style={{ color: "var(--admin-text)" }}>
                        {row.label}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatEur(row.income)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatEur(row.expense)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{formatEur(row.net)}</td>
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
            {financeEntries.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>
                {a?.dashboardNoEntries ?? "No entries."}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--admin-border)" }}>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--admin-bg)", color: "var(--admin-text-muted)" }}>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider">{a?.dashboardDate ?? "Date"}</th>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider">{a?.type ?? "Type"}</th>
                      <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider">{a?.dashboardAmountEur ?? "Amount"}</th>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider">{a?.dashboardNote ?? "Note"}</th>
                      <th className="w-10 px-2 py-2" aria-label="Delete" />
                    </tr>
                  </thead>
                  <tbody>
                    {financeEntries.map((entry) => (
                      <tr key={entry.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                        <td className="px-3 py-2 tabular-nums" style={{ color: "var(--admin-text)" }}>
                          {entry.occurred_on}
                        </td>
                        <td className="px-3 py-2" style={{ color: "var(--admin-text-muted)" }}>
                          {entry.entry_type === "income" ? (a?.dashboardIncome ?? "Income") : (a?.dashboardExpense ?? "Expense")}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatEur(Number(entry.amount_eur))}</td>
                        <td className="px-3 py-2 max-w-[200px] truncate" style={{ color: "var(--admin-text-muted)" }}>
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
  );
}
