"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import {
  VAT_EU_GOODS_ACQUISITIONS_THRESHOLD_EUR,
  VAT_TURNOVER_THRESHOLD_EUR,
} from "@/lib/invoices/vatThresholds";
import type { AdminCompanyTaxSettingsRow } from "@/lib/invoices/types";
import styles from "./DashboardPage.module.css";

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function VatMonitorCard() {
  const { t } = useLanguage();
  const a = t.admin;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [approxYtd, setApproxYtd] = useState<number | null>(null);
  const [manual, setManual] = useState("");
  const [purchForeign, setPurchForeign] = useState(false);
  const [b2bEu, setB2bEu] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const y = new Date().getFullYear();
    const from = `${y}-01-01`;
    const to = `${y}-12-31`;

    const [settingsRes, invRes] = await Promise.all([
      supabase.from("admin_company_tax_settings").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("admin_invoices")
        .select("total,status")
        .eq("user_id", user.id)
        .eq("document_type", "sales_invoice")
        .gte("issue_date", from)
        .lte("issue_date", to),
    ]);

    if (settingsRes.error) {
      setErr(settingsRes.error.message);
      setLoading(false);
      return;
    }

    let row = settingsRes.data as AdminCompanyTaxSettingsRow | null;
    if (!row) {
      const ins = await supabase.from("admin_company_tax_settings").insert({ user_id: user.id }).select("*").single();
      if (ins.error) {
        setErr(ins.error.message);
        setLoading(false);
        return;
      }
      row = ins.data as AdminCompanyTaxSettingsRow;
    }

    setManual(row.vat_turnover_manual_eur != null ? String(row.vat_turnover_manual_eur) : "");
    setPurchForeign(row.purchases_services_from_foreign);
    setB2bEu(row.provides_b2b_services_to_eu);

    if (invRes.error) {
      setApproxYtd(null);
    } else {
      const list = (invRes.data ?? []) as { total: unknown; status: string }[];
      let sum = 0;
      for (const r of list) {
        if (r.status === "draft" || r.status === "cancelled") continue;
        sum += Number(r.total) || 0;
      }
      setApproxYtd(Math.round(sum * 100) / 100);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-shot Supabase fetch on mount (matches dashboard reload pattern) */
    void load();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [load]);

  const save = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    setErr(null);
    const n = manual.trim() === "" ? null : Math.max(0, Number(manual.replace(",", ".")) || 0);
    const { error } = await supabase
      .from("admin_company_tax_settings")
      .update({
        vat_turnover_manual_eur: n,
        purchases_services_from_foreign: purchForeign,
        provides_b2b_services_to_eu: b2bEu,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) setErr(error.message);
  };

  const manualNum = manual.trim() === "" ? null : Math.max(0, Number(manual.replace(",", ".")) || 0);
  const refTurnover = manualNum ?? approxYtd ?? 0;
  const pctMain = clampPct((refTurnover / VAT_TURNOVER_THRESHOLD_EUR) * 100);
  const pctEu = clampPct((refTurnover / VAT_EU_GOODS_ACQUISITIONS_THRESHOLD_EUR) * 100);

  if (loading) {
    return (
      <section className={styles.card} aria-label={a?.dashboardVatMonitorTitle ?? "VAT monitor"}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{a?.dashboardVatMonitorTitle ?? "VAT monitoring"}</h2>
        </div>
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin opacity-60" />
        </div>
      </section>
    );
  }

  return (
    <section className={styles.card} aria-label={a?.dashboardVatMonitorTitle ?? "VAT monitor"}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>{a?.dashboardVatMonitorTitle ?? "VAT monitoring"}</h2>
      </div>
      <div className={styles.milestoneBody}>
        <p className={styles.milestoneHint} style={{ marginBottom: "0.75rem" }}>
          {a?.dashboardVatMonitorDisclaimer ?? ""}
        </p>

        {err ? (
          <p className={styles.milestoneHint} style={{ color: "#fca5a5", borderTop: "none", paddingTop: 0 }}>
            {err}
          </p>
        ) : null}

        <div className="space-y-3 text-sm" style={{ color: "var(--admin-text, #e5e5e5)" }}>
          <div>
            <div className="flex justify-between text-xs mb-1 opacity-80">
              <span>{a?.dashboardVatThresholdSales ?? "Turnover"}</span>
              <span className="tabular-nums">
                {refTurnover.toLocaleString("lt-LT")} / {VAT_TURNOVER_THRESHOLD_EUR.toLocaleString("lt-LT")} €
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-amber-500/80" style={{ width: `${pctMain}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1 opacity-80">
              <span>{a?.dashboardVatThresholdAcquisitions ?? "EU goods"}</span>
              <span className="tabular-nums">
                {refTurnover.toLocaleString("lt-LT")} / {VAT_EU_GOODS_ACQUISITIONS_THRESHOLD_EUR.toLocaleString("lt-LT")} €
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-sky-500/70" style={{ width: `${pctEu}%` }} />
            </div>
          </div>

          {approxYtd != null ? (
            <p className="text-xs opacity-70">
              {a?.dashboardVatApproxYtd ?? "Approx. YTD"}:{" "}
              <strong className="tabular-nums">{approxYtd.toLocaleString("lt-LT")} €</strong>
            </p>
          ) : null}

          <label className="flex flex-col gap-1 text-xs">
            <span>{a?.dashboardVatManualTurnover ?? "Manual"}</span>
            <input
              type="text"
              inputMode="decimal"
              className={styles.milestoneInput}
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              disabled={saving}
            />
          </label>

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={purchForeign} onChange={(e) => setPurchForeign(e.target.checked)} />
            {a?.dashboardVatPurchasesForeign ?? "Foreign purchases"}
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={b2bEu} onChange={(e) => setB2bEu(e.target.checked)} />
            {a?.dashboardVatB2bEu ?? "B2B EU"}
          </label>

          <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void save()}>
            {saving ? (a?.dashboardVatSaving ?? "…") : (a?.dashboardVatSaveSettings ?? "Save")}
          </button>
        </div>
      </div>
    </section>
  );
}
