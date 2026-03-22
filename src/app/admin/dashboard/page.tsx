"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { localTodayISO } from "@/lib/adminFormat";
import styles from "./DashboardPage.module.css";

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

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const a = t.admin;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ today: 0, bestDay: 0, monthTotal: 0, allTime: 0 });

  const today = useMemo(() => localTodayISO(), []);
  const now = useMemo(() => new Date(), []);

  const reload = useCallback(async (uid: string) => {
    setError(null);
    const { data, error: qErr } = await supabase
      .from("lead_outreach_events")
      .select("created_at")
      .eq("created_by", uid);

    if (qErr) {
      setError(qErr.message);
      return;
    }

    const rows = (data ?? []) as { created_at: string }[];
    setMetrics(aggregateOutreachMetrics(rows, today, now));
  }, [today, now]);

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
    </div>
  );
}
