"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { formatEur, localTodayISO } from "@/lib/adminFormat";
import type { AdminCompanyTaxSettingsRow } from "@/lib/invoices/types";
import {
  aggregateOutstandingEur,
  clampPercent,
  estimateMonthsToMainThreshold,
  sumIssuedInMonthEur,
  sumIssuedSalesInvoiceTotalsEur,
  VAT_THRESHOLDS,
  vatMainThresholdZone,
  type InvoiceRowForStatus,
  type VatProgressZone,
} from "@/lib/invoices/buhalterijaDashboardMetrics";
import { DOCUMENT_TYPE_LABEL_LT } from "@/lib/invoices/documentTypes";
import { BuhalterijaNav } from "./BuhalterijaNav";

type InvRow = {
  id: string;
  invoice_number: string;
  issue_date: string;
  total: unknown;
  status: string;
  document_type: string;
  issued_at: string | null;
  cancelled_at: string | null;
  due_date: string;
  buyer_name: string | null;
};

/** Hero ring — larger focal progress (display % uses clamped share of threshold). */
const VAT_RING = { r: 62, size: 168, c: 84, stroke: 11 } as const;
const RING_C = 2 * Math.PI * VAT_RING.r;

function zoneColors(zone: VatProgressZone): {
  ring: string;
  bar: string;
  label: string;
  badgeBg: string;
} {
  if (zone === "critical") {
    return {
      ring: "#f87171",
      bar: "rgba(248,113,113,0.92)",
      label: "#fecaca",
      badgeBg: "rgba(248,113,113,0.14)",
    };
  }
  if (zone === "near") {
    return {
      ring: "#fb923c",
      bar: "rgba(251,146,60,0.9)",
      label: "#fdba74",
      badgeBg: "rgba(251,146,60,0.14)",
    };
  }
  if (zone === "approaching") {
    return {
      ring: "#eab308",
      bar: "rgba(234,179,8,0.88)",
      label: "#fde047",
      badgeBg: "rgba(234,179,8,0.12)",
    };
  }
  return {
    ring: "#2dd4bf",
    bar: "rgba(45,212,191,0.88)",
    label: "#99f6e4",
    badgeBg: "rgba(45,212,191,0.12)",
  };
}

function YesNoRow({
  label,
  value,
  onChange,
  disabled,
  yesLabel,
  noLabel,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  yesLabel: string;
  noLabel: string;
}) {
  const seg = (active: boolean) =>
    `flex-1 min-w-0 rounded-md py-1.5 px-2 text-[11px] font-medium transition-colors text-center ${
      active ? "" : "hover:opacity-90"
    }`;

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] leading-snug min-w-0 flex-1" style={{ color: "var(--admin-text)" }}>
        {label}
      </span>
      <div
        className="flex shrink-0 w-[7.25rem] rounded-lg p-0.5 gap-0.5"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid var(--admin-border)",
        }}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(true)}
          className={seg(value)}
          style={
            value
              ? { background: "var(--admin-accent)", color: "#fff" }
              : { color: "var(--admin-text-muted)" }
          }
        >
          {yesLabel}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(false)}
          className={seg(!value)}
          style={
            !value
              ? { background: "rgba(255,255,255,0.1)", color: "var(--admin-text)" }
              : { color: "var(--admin-text-muted)" }
          }
        >
          {noLabel}
        </button>
      </div>
    </div>
  );
}

export default function BuhalterijaDashboardView() {
  const { t } = useLanguage();
  const a = t.admin;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvRow[]>([]);
  const [paidMap, setPaidMap] = useState<Map<string, number>>(new Map());

  const [manualTurnover, setManualTurnover] = useState("");
  const [manualEuAcq, setManualEuAcq] = useState("");
  const [purchForeign, setPurchForeign] = useState(false);
  const [b2bEu, setB2bEu] = useState(false);

  const todayIso = useMemo(() => localTodayISO(), []);
  const now = useMemo(() => new Date(), []);

  const load = useCallback(async () => {
    setErr(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [settingsRes, invRes, payRes] = await Promise.all([
      supabase.from("admin_company_tax_settings").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("admin_invoices")
        .select(
          "id,invoice_number,issue_date,total,status,document_type,issued_at,cancelled_at,due_date,buyer_name"
        )
        .eq("user_id", user.id)
        .order("issue_date", { ascending: false })
        .limit(800),
      supabase.from("admin_invoice_payments").select("invoice_id,amount").eq("user_id", user.id),
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

    setManualTurnover(row.vat_turnover_manual_eur != null ? String(row.vat_turnover_manual_eur) : "");
    const euRaw = row.vat_eu_acquisitions_manual_eur;
    setManualEuAcq(euRaw != null ? String(euRaw) : "");
    setPurchForeign(row.purchases_services_from_foreign);
    setB2bEu(row.provides_b2b_services_to_eu);

    if (!invRes.error && invRes.data) {
      setInvoices(invRes.data as InvRow[]);
    } else {
      setInvoices([]);
    }

    const m = new Map<string, number>();
    if (!payRes.error && payRes.data) {
      for (const p of payRes.data as { invoice_id: string; amount: unknown }[]) {
        const id = p.invoice_id;
        const amt = Number(p.amount) || 0;
        m.set(id, (m.get(id) ?? 0) + amt);
      }
    }
    setPaidMap(m);
    setLoading(false);
  }, [now]);

  useEffect(() => {
    void load();
  }, [load]);

  const ytdRows = useMemo(() => {
    const y = now.getFullYear();
    const prefix = `${y}-`;
    return invoices.filter((r) => String(r.issue_date).startsWith(prefix));
  }, [invoices, now]);

  const approxYtd = useMemo(() => sumIssuedSalesInvoiceTotalsEur(ytdRows), [ytdRows]);

  const manualNum = manualTurnover.trim() === "" ? null : Math.max(0, Number(manualTurnover.replace(",", ".")) || 0);
  const refTurnover = manualNum ?? approxYtd;
  const rawMainPct =
    VAT_THRESHOLDS.main > 0 ? Math.max(0, (refTurnover / VAT_THRESHOLDS.main) * 100) : 0;
  const pctDisplay = clampPercent(rawMainPct);
  const zone = vatMainThresholdZone(rawMainPct);
  const colors = zoneColors(zone);

  const euManualNum =
    manualEuAcq.trim() === "" ? null : Math.max(0, Number(manualEuAcq.replace(",", ".")) || 0);
  const refEu = euManualNum ?? 0;
  const pctEu = clampPercent((refEu / VAT_THRESHOLDS.euGoods) * 100);

  const issuedMonth = useMemo(
    () => sumIssuedInMonthEur(ytdRows, now.getFullYear(), now.getMonth()),
    [ytdRows, now]
  );

  const outstanding = useMemo(() => {
    const forStatus: InvoiceRowForStatus[] = invoices.map((r) => ({
      id: r.id,
      total: r.total,
      issued_at: r.issued_at,
      cancelled_at: r.cancelled_at,
      due_date: r.due_date,
      status: r.status,
    }));
    return aggregateOutstandingEur(forStatus, paidMap, todayIso);
  }, [invoices, paidMap, todayIso]);

  const recent = useMemo(() => {
    const issued = invoices.filter((r) => r.issued_at && r.status !== "cancelled" && r.status !== "draft");
    return issued.slice(0, 4);
  }, [invoices]);

  const monthsToThreshold = useMemo(
    () => estimateMonthsToMainThreshold(approxYtd, now, VAT_THRESHOLDS.main),
    [approxYtd, now]
  );

  const zoneLabel = useMemo(() => {
    if (zone === "critical") return a?.buhalterijaVatZoneCritical ?? "Reikia dėmesio";
    if (zone === "near") return a?.buhalterijaVatZoneNear ?? "Beveik prie ribos";
    if (zone === "approaching") return a?.buhalterijaVatZoneApproaching ?? "Artėjate prie ribos";
    return a?.buhalterijaVatZoneSafe ?? "Saugus intervalas";
  }, [zone, a]);

  const remainingMain = Math.max(0, VAT_THRESHOLDS.main - refTurnover);

  const saveVatSettings = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    setErr(null);
    const n = manualTurnover.trim() === "" ? null : Math.max(0, Number(manualTurnover.replace(",", ".")) || 0);
    const eu =
      manualEuAcq.trim() === "" ? null : Math.max(0, Number(manualEuAcq.replace(",", ".")) || 0);
    const patch: Record<string, unknown> = {
      vat_turnover_manual_eur: n,
      vat_eu_acquisitions_manual_eur: eu,
      purchases_services_from_foreign: purchForeign,
      provides_b2b_services_to_eu: b2bEu,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("admin_company_tax_settings").update(patch).eq("user_id", user.id);
    setSaving(false);
    if (error) setErr(error.message);
    else await load();
  };

  const lab = (key: keyof NonNullable<typeof a>, fb: string) => (a?.[key] as string) ?? fb;

  const thrMainStr = VAT_THRESHOLDS.main.toLocaleString("lt-LT");
  const refTurnStr = refTurnover.toLocaleString("lt-LT");

  if (loading) {
    return (
      <div className="space-y-4">
        <BuhalterijaNav />
        <div className="flex flex-col items-center justify-center gap-3 py-12 md:py-16">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--admin-accent)" }} />
          <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>
            {a?.buhalterijaDashboardLoading ?? a?.buhalterijaLoading ?? "…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-4">
      <BuhalterijaNav />

      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl" style={{ color: "var(--admin-text)" }}>
          {a?.buhalterijaTabOverview ?? "Apžvalga"}
        </h1>
        <p className="max-w-xl text-sm leading-relaxed" style={{ color: "var(--admin-text-muted)" }}>
          {a?.buhalterijaDashboardSubtitle ?? ""}
        </p>
      </header>

      {err ? (
        <div className="rounded-lg border px-3 py-2.5 text-sm text-rose-300" style={{ borderColor: "var(--admin-border)" }}>
          {err}
        </div>
      ) : null}

      <div className="space-y-4 md:grid md:grid-cols-12 md:items-start md:gap-4 md:space-y-0">
        {/* VAT hero + subpanel */}
        <section
          className="rounded-2xl border md:col-span-8 min-w-0 overflow-hidden"
          style={{
            borderColor: "var(--admin-border)",
            background:
              "linear-gradient(160deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 45%, rgba(255,255,255,0.01) 100%)",
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-stretch">
            {/* Focal hero */}
            <div className="flex-1 min-w-0 p-5 md:p-6 lg:p-7 flex flex-col gap-5">
              <h2 className="text-[15px] font-semibold tracking-tight md:text-base" style={{ color: "var(--admin-text)" }}>
                {a?.dashboardVatMonitorTitle ?? "PVM registracijos stebėjimas"}
              </h2>

              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
                <div className="relative shrink-0" style={{ width: VAT_RING.size, height: VAT_RING.size }}>
                  <svg width={VAT_RING.size} height={VAT_RING.size} className="-rotate-90" aria-hidden>
                    <circle
                      cx={VAT_RING.c}
                      cy={VAT_RING.c}
                      r={VAT_RING.r}
                      fill="none"
                      stroke="rgba(255,255,255,0.07)"
                      strokeWidth={VAT_RING.stroke}
                    />
                    <circle
                      cx={VAT_RING.c}
                      cy={VAT_RING.c}
                      r={VAT_RING.r}
                      fill="none"
                      stroke={colors.ring}
                      strokeWidth={VAT_RING.stroke}
                      strokeLinecap="round"
                      strokeDasharray={RING_C}
                      strokeDashoffset={RING_C - (pctDisplay / 100) * RING_C}
                      className="transition-[stroke-dashoffset] duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span
                      className="text-4xl font-semibold tabular-nums tracking-tight md:text-[2.75rem]"
                      style={{ color: "var(--admin-text)" }}
                    >
                      {Math.round(pctDisplay)}%
                    </span>
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left w-full">
                  <div
                    className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider mx-auto sm:mx-0"
                    style={{ background: colors.badgeBg, color: colors.label }}
                  >
                    {zoneLabel}
                  </div>

                  <p className="text-xl font-semibold tabular-nums tracking-tight md:text-2xl leading-snug" style={{ color: "var(--admin-text)" }}>
                    {remainingMain > 0
                      ? (a?.buhalterijaVatRemainingTo45k ?? "Liko {amount} € iki {threshold} € ribos")
                          .replace("{amount}", remainingMain.toLocaleString("lt-LT"))
                          .replace("{threshold}", thrMainStr)
                      : (a?.buhalterijaVatOverThreshold ??
                        "Viršyta riba — peržiūrėkite PVM prievolę su specialistu.")}
                  </p>

                  <p className="text-sm tabular-nums" style={{ color: "var(--admin-text-muted)" }}>
                    {(a?.buhalterijaVatPercentShort ?? "Pasiekta {p} % ribos").replace("{p}", String(Math.round(pctDisplay)))}
                  </p>

                  <p className="text-xs leading-relaxed max-w-md mx-auto sm:mx-0" style={{ color: "var(--admin-text-muted)" }}>
                    {a?.buhalterijaVatMethodologyShort ?? "Stebėjimo rodiklis pagal sistemos duomenis."}
                  </p>

                  <p className="text-sm font-medium tabular-nums tracking-tight" style={{ color: "var(--admin-text)" }}>
                    {(a?.buhalterijaVatNumericProgress ?? "{current} € / {max} €")
                      .replace("{current}", refTurnStr)
                      .replace("{max}", thrMainStr)}
                  </p>

                  <div className="pt-1 space-y-2 max-w-lg mx-auto sm:mx-0">
                    <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${pctDisplay}%`, background: colors.bar }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-medium tabular-nums" style={{ color: "var(--admin-text-muted)" }}>
                      <span>0</span>
                      <span>15k</span>
                      <span>30k</span>
                      <span>45k</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[10px] leading-relaxed opacity-55 max-w-2xl mx-auto sm:mx-0 text-center sm:text-left" style={{ color: "var(--admin-text-muted)" }}>
                {a?.dashboardVatMonitorDisclaimer ?? ""}
              </p>
            </div>

            {/* Subpanel */}
            <div
              className="lg:w-[min(100%,17.5rem)] xl:w-[19rem] shrink-0 border-t lg:border-t-0 lg:border-l p-4 md:p-5 flex flex-col gap-4"
              style={{
                borderColor: "var(--admin-border)",
                background: "rgba(0,0,0,0.12)",
              }}
            >
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--admin-text-muted)" }}>
                {a?.buhalterijaVatSubpanelTitle ?? "Papildomi PVM rodikliai"}
              </h3>

              <div className="space-y-2">
                <p className="text-[11px] font-medium" style={{ color: "var(--admin-text)" }}>
                  {a?.buhalterijaVatEuGoodsTitle ?? "ES prekių įsigijimai (14 000 €)"}
                </p>
                <div className="flex justify-between text-[10px] tabular-nums" style={{ color: "var(--admin-text-muted)" }}>
                  <span>
                    {refEu.toLocaleString("lt-LT")} / {VAT_THRESHOLDS.euGoods.toLocaleString("lt-LT")} €
                  </span>
                  <span>{pctEu}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full bg-sky-400/70 transition-all" style={{ width: `${pctEu}%` }} />
                </div>
              </div>

              <div className="space-y-2.5 pt-1 border-t" style={{ borderColor: "var(--admin-border)" }}>
                <YesNoRow
                  label={a?.dashboardVatPurchasesForeign ?? ""}
                  value={purchForeign}
                  onChange={setPurchForeign}
                  disabled={saving}
                  yesLabel={a?.buhalterijaVatYes ?? "Taip"}
                  noLabel={a?.buhalterijaVatNo ?? "Ne"}
                />
                <YesNoRow
                  label={a?.dashboardVatB2bEu ?? ""}
                  value={b2bEu}
                  onChange={setB2bEu}
                  disabled={saving}
                  yesLabel={a?.buhalterijaVatYes ?? "Taip"}
                  noLabel={a?.buhalterijaVatNo ?? "Ne"}
                />
              </div>

              {purchForeign || b2bEu ? (
                <p className="text-[10px] leading-snug rounded-lg px-2.5 py-2" style={{ color: "var(--admin-text-muted)", background: "rgba(251,191,36,0.06)" }}>
                  {a?.buhalterijaVatFlagWarning ?? ""}
                </p>
              ) : null}

              <details className="group rounded-lg border overflow-hidden" style={{ borderColor: "var(--admin-border)" }}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-[11px] font-medium transition-colors hover:bg-[var(--admin-bg-elevated)] [&::-webkit-details-marker]:hidden">
                  <span style={{ color: "var(--admin-text)" }}>{a?.buhalterijaVatAdjustSection ?? "Pakoreguoti stebėjimą"}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" style={{ color: "var(--admin-text-muted)" }} />
                </summary>
                <div className="space-y-3 border-t px-3 py-3" style={{ borderColor: "var(--admin-border)" }}>
                  <label className="block space-y-1">
                    <span className="text-[10px]" style={{ color: "var(--admin-text-muted)" }}>
                      {a?.dashboardVatManualTurnover ?? ""}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      disabled={saving}
                      value={manualTurnover}
                      onChange={(e) => setManualTurnover(e.target.value)}
                      className="w-full rounded-lg border px-2.5 py-2 text-xs outline-none focus:border-[var(--admin-accent)]"
                      style={{
                        borderColor: "var(--admin-border)",
                        background: "var(--admin-bg-elevated)",
                        color: "var(--admin-text)",
                      }}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px]" style={{ color: "var(--admin-text-muted)" }}>
                      {a?.buhalterijaVatEuGoodsManual ?? ""}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      disabled={saving}
                      value={manualEuAcq}
                      onChange={(e) => setManualEuAcq(e.target.value)}
                      className="w-full rounded-lg border px-2.5 py-2 text-xs outline-none focus:border-[var(--admin-accent)]"
                      style={{
                        borderColor: "var(--admin-border)",
                        background: "var(--admin-bg-elevated)",
                        color: "var(--admin-text)",
                      }}
                    />
                  </label>
                  <p className="text-[10px] leading-relaxed" style={{ color: "var(--admin-text-muted)" }}>
                    <span className="opacity-90">{a?.dashboardVatApproxYtd ?? ""}:</span>{" "}
                    <strong className="tabular-nums text-[var(--admin-text)]">{approxYtd.toLocaleString("lt-LT")} €</strong>
                  </p>
                  {monthsToThreshold != null && approxYtd > 0 && approxYtd < VAT_THRESHOLDS.main ? (
                    <p className="text-[10px] leading-relaxed" style={{ color: "var(--admin-text-muted)" }}>
                      {(a?.buhalterijaVatProjection ?? "Pagal dabartinį SF tempą ribą galite pasiekti po ~{n} mėn.").replace(
                        "{n}",
                        String(monthsToThreshold)
                      )}
                    </p>
                  ) : null}
                </div>
              </details>

              <button
                type="button"
                disabled={saving}
                onClick={() => void saveVatSettings()}
                className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{ background: "var(--admin-accent)" }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {a?.dashboardVatSaveSettings ?? "Išsaugoti"}
              </button>
            </div>
          </div>
        </section>

        {/* KPI + recent */}
        <div className="space-y-3 md:col-span-4 md:min-h-0 flex flex-col gap-3">
          <div className="grid gap-3 grid-cols-1">
            {[
              {
                title: a?.buhalterijaIssuedThisMonth ?? "",
                value: formatEur(issuedMonth),
                hint: a?.buhalterijaIssuedThisMonthHint ?? "",
              },
              {
                title: a?.buhalterijaUnpaidTotal ?? "",
                value: formatEur(outstanding.unpaidTotalEur),
                hint: a?.buhalterijaUnpaidHint ?? "",
              },
              {
                title: a?.buhalterijaOverdueTitle ?? "",
                value:
                  outstanding.overdueCount > 0
                    ? `${outstanding.overdueCount} · ${formatEur(outstanding.overdueTotalEur)}`
                    : "—",
                hint: a?.buhalterijaOverdueHint ?? "",
              },
            ].map((card, i) => (
              <div
                key={i}
                className="rounded-2xl border px-4 py-4 flex flex-col min-h-[7.5rem]"
                style={{ borderColor: "var(--admin-border)", background: "var(--admin-bg-elevated)" }}
              >
                <h3 className="text-[10px] font-semibold uppercase tracking-wider leading-tight" style={{ color: "var(--admin-text-muted)" }}>
                  {card.title}
                </h3>
                <p className="mt-3 text-xl font-semibold tabular-nums tracking-tight leading-none" style={{ color: "var(--admin-text)" }}>
                  {card.value}
                </p>
                <p className="mt-auto pt-3 text-[10px] leading-snug line-clamp-2" style={{ color: "var(--admin-text-muted)" }}>
                  {card.hint}
                </p>
              </div>
            ))}
          </div>

          <div
            className="rounded-2xl border px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            style={{ borderColor: "var(--admin-border)", background: "var(--admin-bg-elevated)" }}
          >
            <div className="min-w-0 space-y-1">
              <h3 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
                {a?.buhalterijaInvoicesCtaTitle ?? "Sąskaitos"}
              </h3>
              <p className="text-xs leading-relaxed max-w-sm" style={{ color: "var(--admin-text-muted)" }}>
                {a?.buhalterijaInvoicesCtaBody ?? ""}
              </p>
            </div>
            <Link
              href="/admin/buhalterija/saskaitos"
              className="inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors border"
              style={{
                borderColor: "var(--admin-border)",
                color: "var(--admin-accent)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              {a?.buhalterijaInvoicesCtaButton ?? "Atidaryti sąrašą"}
            </Link>
          </div>

          <section
            className="rounded-2xl border overflow-hidden flex flex-col min-h-0 md:flex-1"
            style={{ borderColor: "var(--admin-border)", background: "var(--admin-bg-elevated)" }}
          >
            <div className="px-4 py-3 border-b flex justify-between items-center gap-2" style={{ borderColor: "var(--admin-border)" }}>
              <h2 className="text-xs font-semibold tracking-tight truncate" style={{ color: "var(--admin-text)" }}>
                {a?.buhalterijaRecentInvoices ?? ""}
              </h2>
              <Link href="/admin/buhalterija/saskaitos" className="text-[11px] font-semibold shrink-0" style={{ color: "var(--admin-accent)" }}>
                {a?.buhalterijaViewAll ?? ""}
              </Link>
            </div>
            {recent.length === 0 ? (
              <div className="px-4 py-8 text-center space-y-4">
                <p className="text-sm font-medium" style={{ color: "var(--admin-text)" }}>
                  {a?.buhalterijaNoInvoicesDashboard ?? ""}
                </p>
                <Link
                  href="/admin/buhalterija/saskaitos/nauja"
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: "var(--admin-accent)" }}
                >
                  {a?.buhalterijaCreateFirstInvoice ?? ""}
                </Link>
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: "var(--admin-border)" }}>
                {recent.map((r) => {
                  const dt = r.document_type as keyof typeof DOCUMENT_TYPE_LABEL_LT;
                  const label = DOCUMENT_TYPE_LABEL_LT[dt] ?? r.document_type;
                  return (
                    <li key={r.id}>
                      <Link
                        href={`/admin/buhalterija/saskaitos/${r.id}`}
                        className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-0.5 px-4 py-2.5 text-xs hover:bg-[rgba(255,255,255,0.03)] transition-colors items-center"
                      >
                        <span className="font-semibold tabular-nums truncate" style={{ color: "var(--admin-text)" }}>
                          {r.invoice_number}
                        </span>
                        <span className="tabular-nums font-semibold text-right shrink-0 text-sm" style={{ color: "var(--admin-text)" }}>
                          {formatEur(Number(r.total) || 0)}
                        </span>
                        <span className="col-span-2 truncate text-[10px]" style={{ color: "var(--admin-text-muted)" }}>
                          {r.buyer_name ?? "—"} · {r.issue_date} · {label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      <p className="text-[10px] leading-relaxed max-w-3xl opacity-70" style={{ color: "var(--admin-text-muted)" }}>
        {lab(
          "buhalterijaVatAdvisorNote",
          "Ši apžvalga nėra oficiali mokesčių konsultacija. Sprendimus dėl PVM prievolės priimkite su kvalifikuotu buhalteriu ar VMI."
        )}
      </p>
    </div>
  );
}
