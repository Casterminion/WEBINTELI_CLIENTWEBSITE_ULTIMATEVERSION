"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { localTodayISO } from "@/lib/adminFormat";
import styles from "./DashboardPage.module.css";
import { VatMonitorCard } from "./VatMonitorCard";

/** Local calendar YYYY-MM-DD from an ISO timestamp */
function toLocalDateISO(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isDateInCurrentMonth(dayISO: string, now: Date): boolean {
  const [y, m] = dayISO.split("-").map(Number);
  return y === now.getFullYear() && m === now.getMonth() + 1;
}

function aggregateOutreachMetrics(rows: { created_at: string }[], today: string, now: Date) {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const day = toLocalDateISO(row.created_at);
    if (!day) continue;
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  let bestDay = 0;
  for (const c of byDay.values()) {
    if (c > bestDay) bestDay = c;
  }

  let monthTotal = 0;
  for (const [day, c] of byDay) {
    if (isDateInCurrentMonth(day, now)) monthTotal += c;
  }

  return {
    today: byDay.get(today) ?? 0,
    bestDay,
    monthTotal,
    allTime: rows.length,
  };
}

/** One row per calendar day with a manual integer (e.g. emails_opened). */
function aggregateDailyIntMetrics(
  rows: { date: string; value: number }[],
  today: string,
  now: Date
) {
  let bestDay = 0;
  let monthTotal = 0;
  let allTime = 0;
  let todayVal = 0;

  for (const r of rows) {
    const day = String(r.date).slice(0, 10);
    const v = Math.max(0, Math.floor(Number(r.value) || 0));
    allTime += v;
    if (day === today) todayVal = v;
    if (v > bestDay) bestDay = v;
    if (isDateInCurrentMonth(day, now)) monthTotal += v;
  }

  return { today: todayVal, bestDay, monthTotal, allTime };
}

type MetricBlock = { today: number; bestDay: number; monthTotal: number; allTime: number };

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const a = t.admin;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MetricBlock>({ today: 0, bestDay: 0, monthTotal: 0, allTime: 0 });
  const [emailOpenMetrics, setEmailOpenMetrics] = useState<MetricBlock>({
    today: 0,
    bestDay: 0,
    monthTotal: 0,
    allTime: 0,
  });
  const [emailOpensDraft, setEmailOpensDraft] = useState("0");
  const [savingEmailOpens, setSavingEmailOpens] = useState(false);
  const [emailOpensSaveError, setEmailOpensSaveError] = useState<string | null>(null);

  const today = useMemo(() => localTodayISO(), []);
  const now = useMemo(() => new Date(), []);

  const reload = useCallback(
    async (uid: string) => {
      setError(null);
      const [outreachRes, dailyRes] = await Promise.all([
        supabase.from("lead_outreach_events").select("created_at").eq("created_by", uid),
        supabase.from("admin_daily_metrics").select("date, emails_opened").eq("user_id", uid),
      ]);

      if (outreachRes.error) {
        setError(outreachRes.error.message);
        return;
      }
      if (dailyRes.error) {
        setError(dailyRes.error.message);
        return;
      }

      const outreachRows = (outreachRes.data ?? []) as { created_at: string }[];
      setMetrics(aggregateOutreachMetrics(outreachRows, today, now));

      const dailyRows = (dailyRes.data ?? []) as { date: string; emails_opened: number }[];
      const mapped = dailyRows.map((r) => ({
        date: String(r.date).slice(0, 10),
        value: r.emails_opened,
      }));
      const em = aggregateDailyIntMetrics(mapped, today, now);
      setEmailOpenMetrics(em);
      setEmailOpensDraft(String(em.today));
    },
    [today, now]
  );

  const saveEmailOpens = useCallback(async () => {
    setEmailOpensSaveError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const n = Math.max(0, Math.floor(Number(emailOpensDraft.replace(",", ".")) || 0));
    setSavingEmailOpens(true);
    try {
      const { data: existing, error: selErr } = await supabase
        .from("admin_daily_metrics")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();

      if (selErr) {
        setEmailOpensSaveError(selErr.message);
        return;
      }

      const updatedAt = new Date().toISOString();
      if (existing?.id) {
        const { error: upErr } = await supabase
          .from("admin_daily_metrics")
          .update({ emails_opened: n, updated_at: updatedAt })
          .eq("id", existing.id);
        if (upErr) {
          setEmailOpensSaveError(upErr.message);
          return;
        }
      } else {
        const { error: insErr } = await supabase.from("admin_daily_metrics").insert({
          user_id: user.id,
          date: today,
          emails_opened: n,
        });
        if (insErr) {
          setEmailOpensSaveError(insErr.message);
          return;
        }
      }

      await reload(user.id);
    } finally {
      setSavingEmailOpens(false);
    }
  }, [emailOpensDraft, today, reload]);

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
      await reload(user.id);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

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

      <section className={styles.card} aria-label={a?.dashboardMilestonesTitle ?? "Milestones"}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{a?.dashboardMilestonesTitle ?? "Milestones"}</h2>
        </div>

        <div className={styles.milestoneBody}>
          <div className={styles.milestoneGrid}>
            <div className={styles.milestoneCell}>
              <span className={styles.milestoneLabel}>{a?.dashboardKeyToday ?? "Today"}</span>
              <p className={styles.milestoneValue}>{metrics.today}</p>
            </div>
            <div className={`${styles.milestoneCell} ${styles.milestoneCellHighlight}`}>
              <span className={styles.milestoneLabel}>{a?.dashboardOutreachRecord ?? "Best day"}</span>
              <p className={styles.milestoneValue}>{metrics.bestDay}</p>
            </div>
            <div className={styles.milestoneCell}>
              <span className={styles.milestoneLabel}>{a?.dashboardThisMonth ?? "This month"}</span>
              <p className={styles.milestoneValue}>{metrics.monthTotal}</p>
            </div>
            <div className={styles.milestoneCell}>
              <span className={styles.milestoneLabel}>{a?.dashboardAllTime ?? "All time"}</span>
              <p className={styles.milestoneValue}>{metrics.allTime}</p>
            </div>
          </div>

          <p className={styles.milestoneHint}>
            {(a?.dashboardOutreachBeatHint ?? "Your best day so far: {n} sends.").replace(
              "{n}",
              String(metrics.bestDay)
            )}
          </p>
        </div>
      </section>

      <section className={styles.card} aria-label={a?.milestoneEmailsOpened ?? "Email opens"}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{a?.milestoneEmailsOpened ?? "People opened my emails"}</h2>
        </div>

        <div className={styles.milestoneBody}>
          <div className={styles.milestoneGrid}>
            <div className={styles.milestoneCell}>
              <span className={styles.milestoneLabel}>{a?.dashboardKeyToday ?? "Today"}</span>
              <p className={styles.milestoneValue}>{emailOpenMetrics.today}</p>
            </div>
            <div className={`${styles.milestoneCell} ${styles.milestoneCellHighlight}`}>
              <span className={styles.milestoneLabel}>{a?.dashboardOutreachRecord ?? "Best day"}</span>
              <p className={styles.milestoneValue}>{emailOpenMetrics.bestDay}</p>
            </div>
            <div className={styles.milestoneCell}>
              <span className={styles.milestoneLabel}>{a?.dashboardThisMonth ?? "This month"}</span>
              <p className={styles.milestoneValue}>{emailOpenMetrics.monthTotal}</p>
            </div>
            <div className={styles.milestoneCell}>
              <span className={styles.milestoneLabel}>{a?.dashboardAllTime ?? "All time"}</span>
              <p className={styles.milestoneValue}>{emailOpenMetrics.allTime}</p>
            </div>
          </div>

          <div className={styles.milestoneFormRow}>
            <label className={styles.milestoneInputLabel} htmlFor="email-opens-today">
              {a?.dashboardEmailOpensInputLabel ?? "Opens today (manual)"}
            </label>
            <input
              id="email-opens-today"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              className={styles.milestoneInput}
              value={emailOpensDraft}
              onChange={(e) => setEmailOpensDraft(e.target.value)}
              disabled={savingEmailOpens}
            />
            <button
              type="button"
              className={styles.saveBtn}
              disabled={savingEmailOpens}
              onClick={() => void saveEmailOpens()}
            >
              {savingEmailOpens ? (a?.dashboardSavingMilestones ?? "Saving…") : (a?.dashboardSaveMilestones ?? "Save")}
            </button>
          </div>

          {emailOpensSaveError && (
            <p className={styles.milestoneHint} style={{ color: "#fca5a5", borderTop: "none", paddingTop: 0 }}>
              {emailOpensSaveError}
            </p>
          )}

          <p className={styles.milestoneHint}>
            {(a?.dashboardEmailOpensBeatHint ?? "Your best day for opens: {n}.").replace(
              "{n}",
              String(emailOpenMetrics.bestDay)
            )}
          </p>
        </div>
      </section>

      <VatMonitorCard />
    </div>
  );
}
