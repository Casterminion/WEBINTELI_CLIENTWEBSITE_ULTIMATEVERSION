"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import {
  FALLBACK_VAT_FOOTER_PRIMARY,
  resolveInvoiceTaxPresentation,
} from "@/lib/invoices/companyInvoiceSettings";
import type { AdminCompanyTaxSettingsRow } from "@/lib/invoices/types";
import { sumIssuedSalesInvoiceTotalsEur, VAT_THRESHOLDS } from "@/lib/invoices/buhalterijaDashboardMetrics";
import { BuhalterijaNav } from "@/components/admin/buhalterija/BuhalterijaNav";

/** IBAN: strip separators, uppercase, cap length, group in fours for readability (e.g. paste LT087044090116319200). */
function formatIbanInput(value: string): string {
  const alnum = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 34);
  if (!alnum) return "";
  const parts: string[] = [];
  for (let i = 0; i < alnum.length; i += 4) {
    parts.push(alnum.slice(i, i + 4));
  }
  return parts.join(" ");
}

type FormState = {
  company_name: string;
  company_code: string;
  company_vat_code: string;
  company_address: string;
  company_email: string;
  company_phone: string;
  company_website: string;
  company_country: string;
  bank_name: string;
  bank_account: string;
  bank_swift: string;
  default_currency: string;
  default_payment_term_days: string;
  default_invoice_notes: string;
  default_vat_footer_note: string;
  seller_not_vat_payer_note: string;
  tax_profile_type: "non_vat" | "vat" | "vat_svs";
  enable_vat_invoices: boolean;
  invoice_number_prefix_sales: string;
  invoice_number_prefix_proforma: string;
  invoice_number_prefix_credit: string;
  invoice_number_prefix_debit: string;
  invoice_number_prefix_vat: string;
  /** Jau panaudotų SF sekos vietų skaičius už ribų (pvz. 1 jei ranka išrašėte SF-001). */
  invoice_sequence_floor_sales: string;
};

function rowToForm(row: AdminCompanyTaxSettingsRow): FormState {
  return {
    company_name: row.company_name ?? "",
    company_code: row.company_code ?? "",
    company_vat_code: row.company_vat_code ?? "",
    company_address: row.company_address ?? "",
    company_email: row.company_email ?? "",
    company_phone: row.company_phone ?? "",
    company_website: row.company_website ?? "",
    company_country: row.company_country ?? "LT",
    bank_name: row.bank_name ?? "",
    bank_account: formatIbanInput(row.bank_account ?? ""),
    bank_swift: row.bank_swift ?? "",
    default_currency: row.default_currency ?? "EUR",
    default_payment_term_days: String(row.default_payment_term_days ?? 7),
    default_invoice_notes: row.default_invoice_notes ?? "",
    default_vat_footer_note: row.default_vat_footer_note ?? "",
    seller_not_vat_payer_note: row.seller_not_vat_payer_note ?? "",
    tax_profile_type: row.tax_profile_type,
    enable_vat_invoices:
      row.tax_profile_type === "non_vat" ? row.enable_vat_invoices : true,
    invoice_number_prefix_sales: row.invoice_number_prefix_sales ?? "",
    invoice_number_prefix_proforma: row.invoice_number_prefix_proforma ?? "",
    invoice_number_prefix_credit: row.invoice_number_prefix_credit ?? "",
    invoice_number_prefix_debit: row.invoice_number_prefix_debit ?? "",
    invoice_number_prefix_vat: row.invoice_number_prefix_vat ?? "",
    invoice_sequence_floor_sales:
      row.invoice_sequence_floor_sales !== null && row.invoice_sequence_floor_sales !== undefined
        ? String(row.invoice_sequence_floor_sales)
        : "",
  };
}

export default function SaskaituNustatymaiPage() {
  const { t } = useLanguage();
  const a = t.admin;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [row, setRow] = useState<AdminCompanyTaxSettingsRow | null>(null);
  /** True when form was pre-filled: turnover monitoring ≥ 45k while DB still had non_vat. */
  const [turnoverSuggestedVat, setTurnoverSuggestedVat] = useState(false);

  const fieldStyle = useMemo(
    () => ({
      borderColor: "var(--admin-border)",
      color: "var(--admin-text)",
      background: "var(--admin-bg-elevated)",
    }),
    []
  );

  const lab = useCallback(
    (key: keyof NonNullable<typeof a>, fb: string) => (a?.[key] as string) ?? fb,
    [a]
  );

  const load = useCallback(async () => {
    setErr(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    let { data: ts } = await supabase.from("admin_company_tax_settings").select("*").eq("user_id", user.id).maybeSingle();
    if (!ts) {
      const ins = await supabase.from("admin_company_tax_settings").insert({ user_id: user.id }).select("*").single();
      if (ins.error) {
        setErr(ins.error.message);
        setLoading(false);
        return;
      }
      ts = ins.data;
    }
    const r = ts as AdminCompanyTaxSettingsRow;
    setRow(r);

    const { data: invData } = await supabase
      .from("admin_invoices")
      .select("issue_date,total,status,document_type")
      .eq("user_id", user.id)
      .order("issue_date", { ascending: false })
      .limit(800);

    const y = new Date().getFullYear();
    const prefix = `${y}-`;
    const ytdRows = (invData ?? []).filter((inv) => String(inv.issue_date).startsWith(prefix));
    const approxYtd = sumIssuedSalesInvoiceTotalsEur(ytdRows);
    const manual =
      r.vat_turnover_manual_eur != null && Number.isFinite(Number(r.vat_turnover_manual_eur))
        ? Math.max(0, Number(r.vat_turnover_manual_eur))
        : null;
    const refTurnover = manual ?? approxYtd;

    let nextForm = rowToForm(r);
    let suggested = false;
    if (refTurnover >= VAT_THRESHOLDS.main && r.tax_profile_type === "non_vat") {
      nextForm = { ...nextForm, tax_profile_type: "vat", enable_vat_invoices: true };
      suggested = true;
    }

    setTurnoverSuggestedVat(suggested);
    setForm(nextForm);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const presentation = row ? resolveInvoiceTaxPresentation(row) : null;

  const navSections = useMemo(
    () =>
      [
        { id: "settings-summary", labelKey: "companySettingsNavSummary" as const, fb: "Santrauka" },
        { id: "settings-company", labelKey: "companySettingsSectionCompany" as const, fb: "Įmonės duomenys" },
        { id: "settings-bank", labelKey: "companySettingsSectionBank" as const, fb: "Banko rekvizitai" },
        { id: "settings-invoice", labelKey: "companySettingsSectionInvoice" as const, fb: "Sąskaitų nustatymai" },
        { id: "settings-tax", labelKey: "companySettingsSectionTax" as const, fb: "Mokesčių nustatymai" },
      ] as const,
    []
  );

  const [activeSectionId, setActiveSectionId] = useState("settings-summary");

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (!form) return;
    const elements = navSections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length === 0) return;
        intersecting.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        setActiveSectionId(intersecting[0].target.id);
      },
      { root: null, rootMargin: "-8% 0px -48% 0px", threshold: [0, 0.08, 0.2] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [form, navSections]);

  const save = async () => {
    if (!form) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (!form.company_name.trim() || !form.company_code.trim()) {
      setErr(lab("companySettingsValidationCompany", "Įmonės pavadinimas ir kodas privalomi."));
      return;
    }
    if (!formatIbanInput(form.bank_account).replace(/\s/g, "")) {
      setErr(lab("companySettingsValidationBank", "Nurodykite banko sąskaitą (IBAN)."));
      return;
    }
    const term = Math.max(0, Math.min(365, parseInt(form.default_payment_term_days, 10) || 0));
    if (form.tax_profile_type === "vat" || form.tax_profile_type === "vat_svs") {
      if (!form.company_vat_code.trim()) {
        setErr(lab("companySettingsValidationVatCode", "PVM mokėtojo kodas privalomas pasirinkus PVM profilį."));
        return;
      }
    }

    setSaving(true);
    setErr(null);
    const patch: Record<string, unknown> = {
      company_name: form.company_name.trim(),
      company_code: form.company_code.trim(),
      company_vat_code: form.company_vat_code.trim() || null,
      company_address: form.company_address.trim(),
      company_email: form.company_email.trim(),
      company_phone: form.company_phone.trim(),
      company_website: form.company_website.trim() || null,
      company_country: form.company_country.trim().slice(0, 2).toUpperCase() || "LT",
      bank_name: form.bank_name.trim() || null,
      bank_account: formatIbanInput(form.bank_account),
      bank_swift: form.bank_swift.trim() || null,
      default_currency: form.default_currency.trim().toUpperCase().slice(0, 3) || "EUR",
      default_payment_term_days: term,
      default_invoice_notes: form.default_invoice_notes.trim(),
      default_vat_footer_note: form.default_vat_footer_note.trim() || FALLBACK_VAT_FOOTER_PRIMARY,
      seller_not_vat_payer_note: form.seller_not_vat_payer_note.trim(),
      tax_profile_type: form.tax_profile_type,
      enable_vat_invoices: form.enable_vat_invoices,
      invoice_number_prefix_sales: form.invoice_number_prefix_sales.trim() || null,
      invoice_number_prefix_proforma: form.invoice_number_prefix_proforma.trim() || null,
      invoice_number_prefix_credit: form.invoice_number_prefix_credit.trim() || null,
      invoice_number_prefix_debit: form.invoice_number_prefix_debit.trim() || null,
      invoice_number_prefix_vat: form.invoice_number_prefix_vat.trim() || null,
      invoice_sequence_floor_sales: (() => {
        const t = form.invoice_sequence_floor_sales.trim();
        if (!t) return null;
        const n = parseInt(t, 10);
        if (!Number.isFinite(n) || n < 0) return null;
        return n;
      })(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("admin_company_tax_settings").update(patch).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    await load();
  };

  const resetFromDb = () => {
    if (row) {
      setForm(rowToForm(row));
      setTurnoverSuggestedVat(false);
    }
    setErr(null);
  };

  if (loading || !form) {
    return (
      <div className="space-y-6">
        <BuhalterijaNav />
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--admin-accent)" }} />
          <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>
            {a?.buhalterijaLoading ?? "Loading…"}
          </p>
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--admin-accent)]";

  return (
    <div className="space-y-6 max-w-6xl">
      <BuhalterijaNav />

      <nav
        className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1 lg:hidden"
        style={{ WebkitOverflowScrolling: "touch" }}
        aria-label={lab("companySettingsNavAria", "Nustatymų skyriai")}
      >
        {navSections.map((s) => {
          const active = activeSectionId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollToSection(s.id)}
              className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                borderColor: active ? "var(--admin-accent)" : "var(--admin-border)",
                background: active ? "var(--admin-bg-elevated)" : "transparent",
                color: active ? "var(--admin-accent)" : "var(--admin-text-muted)",
              }}
            >
              {lab(s.labelKey, s.fb)}
            </button>
          );
        })}
      </nav>

      <div className="lg:flex lg:gap-10 lg:items-start">
        <aside
          className="hidden lg:flex flex-col w-56 shrink-0 sticky top-4 self-start max-h-[calc(100dvh-5rem)]"
          aria-label={lab("companySettingsNavAria", "Nustatymų skyriai")}
        >
          <nav className="flex-1 min-h-0 overflow-y-auto space-y-0.5 pr-1 -mr-1">
            {navSections.map((s) => {
              const active = activeSectionId === s.id;
              return (
                <button
                  key={`aside-${s.id}`}
                  type="button"
                  onClick={() => scrollToSection(s.id)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors border-l-2"
                  style={{
                    borderLeftColor: active ? "var(--admin-accent)" : "transparent",
                    background: active ? "var(--admin-bg-elevated)" : "transparent",
                    color: active ? "var(--admin-text)" : "var(--admin-text-muted)",
                  }}
                >
                  {lab(s.labelKey, s.fb)}
                </button>
              );
            })}
          </nav>
          <div className="mt-6 shrink-0 space-y-2 border-t pt-4" style={{ borderColor: "var(--admin-border)" }}>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--admin-accent)" }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {lab("companySettingsSave", "Išsaugoti nustatymus")}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={resetFromDb}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium"
              style={{ borderColor: "var(--admin-border)", color: "var(--admin-text)" }}
            >
              {lab("companySettingsReload", "Atnaujinti įmonės duomenis")}
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
          <div id="settings-summary" className="scroll-mt-28 space-y-4">
            <div>
              <Link
                href="/admin/buhalterija"
                className="text-xs font-medium hover:underline"
                style={{ color: "var(--admin-accent)" }}
              >
                ← {a?.buhalterijaBackToOverview ?? a?.buhalterijaBackToList ?? "Back"}
              </Link>
              <h1 className="mt-2 text-xl font-semibold tracking-tight md:text-2xl" style={{ color: "var(--admin-text)" }}>
                {lab("companySettingsTitle", "Įmonės ir sąskaitų nustatymai")}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--admin-text-muted)" }}>
                {lab("companySettingsIntro", "Duomenys naudojami naujoms sąskaitoms; išrašytos sąskaitos lieka istorijoje.")}
              </p>
            </div>

            {presentation ? (
              <div
                className="rounded-xl border px-4 py-3 text-sm"
                style={{ borderColor: "var(--admin-border)", background: "var(--admin-bg-elevated)" }}
              >
                <p className="font-medium" style={{ color: "var(--admin-text)" }}>
                  {lab("companySettingsCurrentTaxMode", "Dabartinis režimas")}:{" "}
                  <span style={{ color: "var(--admin-accent)" }}>
                    {form.tax_profile_type === "non_vat"
                      ? lab("taxProfileNonVat", "Ne PVM mokėtojas")
                      : form.tax_profile_type === "vat"
                        ? lab("taxProfileVat", "PVM mokėtojas")
                        : lab("taxProfileVatSvs", "PVM mokėtojas (SVS)")}
                  </span>
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--admin-text-muted)" }}>
                  {lab("companySettingsFooterPreview", "PDF ne PVM pastaba")}: {presentation.nonVatVatSummaryLine.slice(0, 120)}
                  {presentation.nonVatVatSummaryLine.length > 120 ? "…" : ""}
                </p>
              </div>
            ) : null}

            {err ? (
              <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: "var(--admin-border)", color: "#fca5a5" }}>
                {err}
              </div>
            ) : null}
          </div>

          <section
            id="settings-company"
            className="scroll-mt-28 space-y-4 rounded-xl border p-4 md:p-5"
            style={{ borderColor: "var(--admin-border)" }}
          >
            <h2 className="text-sm font-semibold tracking-tight md:text-base" style={{ color: "var(--admin-text)" }}>
              {lab("companySettingsSectionCompany", "Įmonės duomenys")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs sm:col-span-2">
            <span style={{ color: "var(--admin-text-muted)" }}>{lab("companySettingsCompanyName", "Įmonės pavadinimas")}</span>
            <input
              className={`${inputCls} mt-1`}
              style={fieldStyle}
              value={form.company_name}
              onChange={(e) => setForm((f) => (f ? { ...f, company_name: e.target.value } : f))}
            />
          </label>
          <label className="block text-xs">
            <span style={{ color: "var(--admin-text-muted)" }}>{lab("companySettingsCompanyCode", "Įmonės kodas")}</span>
            <input
              className={`${inputCls} mt-1`}
              style={fieldStyle}
              value={form.company_code}
              onChange={(e) => setForm((f) => (f ? { ...f, company_code: e.target.value } : f))}
            />
          </label>
          <label className="block text-xs">
            <span style={{ color: "var(--admin-text-muted)" }}>{lab("companySettingsVatCode", "PVM mokėtojo kodas")}</span>
            <input
              className={`${inputCls} mt-1`}
              style={fieldStyle}
              value={form.company_vat_code}
              onChange={(e) => setForm((f) => (f ? { ...f, company_vat_code: e.target.value } : f))}
            />
          </label>
          <label className="block text-xs sm:col-span-2">
            <span style={{ color: "var(--admin-text-muted)" }}>{lab("companySettingsAddress", "Adresas")}</span>
            <input
              className={`${inputCls} mt-1`}
              style={fieldStyle}
              value={form.company_address}
              onChange={(e) => setForm((f) => (f ? { ...f, company_address: e.target.value } : f))}
            />
          </label>
          <label className="block text-xs">
            <span style={{ color: "var(--admin-text-muted)" }}>{lab("companySettingsCountry", "Šalis (ISO)")}</span>
            <input
              className={`${inputCls} mt-1`}
              style={fieldStyle}
              value={form.company_country}
              onChange={(e) => setForm((f) => (f ? { ...f, company_country: e.target.value } : f))}
            />
          </label>
          <label className="block text-xs">
            <span style={{ color: "var(--admin-text-muted)" }}>{lab("companySettingsWebsite", "Svetainė")}</span>
            <input
              className={`${inputCls} mt-1`}
              style={fieldStyle}
              value={form.company_website}
              onChange={(e) => setForm((f) => (f ? { ...f, company_website: e.target.value } : f))}
            />
          </label>
          <label className="block text-xs">
            <span style={{ color: "var(--admin-text-muted)" }}>{lab("companySettingsEmail", "El. paštas")}</span>
            <input
              className={`${inputCls} mt-1`}
              style={fieldStyle}
              value={form.company_email}
              onChange={(e) => setForm((f) => (f ? { ...f, company_email: e.target.value } : f))}
            />
          </label>
          <label className="block text-xs">
            <span style={{ color: "var(--admin-text-muted)" }}>{lab("companySettingsPhone", "Telefonas")}</span>
            <input
              className={`${inputCls} mt-1`}
              style={fieldStyle}
              value={form.company_phone}
              onChange={(e) => setForm((f) => (f ? { ...f, company_phone: e.target.value } : f))}
            />
          </label>
            </div>
          </section>

          <section
            id="settings-bank"
            className="scroll-mt-28 space-y-4 rounded-xl border p-4 md:p-5"
            style={{ borderColor: "var(--admin-border)" }}
          >
            <h2 className="text-sm font-semibold tracking-tight md:text-base" style={{ color: "var(--admin-text)" }}>
              {lab("companySettingsSectionBank", "Banko rekvizitai")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs sm:col-span-2">
            <span style={{ color: "var(--admin-text-muted)" }}>{lab("companySettingsBankName", "Bankas")}</span>
            <input
              className={`${inputCls} mt-1`}
              style={fieldStyle}
              value={form.bank_name}
              onChange={(e) => setForm((f) => (f ? { ...f, bank_name: e.target.value } : f))}
            />
          </label>
          <label className="block text-xs sm:col-span-2">
            <span style={{ color: "var(--admin-text-muted)" }}>{lab("companySettingsBankAccount", "Banko sąskaita (IBAN)")}</span>
            <input
              className={`${inputCls} mt-1 font-mono tracking-wide`}
              style={fieldStyle}
              value={form.bank_account}
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) =>
                setForm((f) => (f ? { ...f, bank_account: formatIbanInput(e.target.value) } : f))
              }
              onBlur={() =>
                setForm((f) => (f ? { ...f, bank_account: formatIbanInput(f.bank_account) } : f))
              }
            />
          </label>
          <label className="block text-xs sm:col-span-2">
            <span style={{ color: "var(--admin-text-muted)" }}>{lab("companySettingsBankSwift", "SWIFT / BIC")}</span>
            <input
              className={`${inputCls} mt-1`}
              style={fieldStyle}
              value={form.bank_swift}
              onChange={(e) => setForm((f) => (f ? { ...f, bank_swift: e.target.value } : f))}
            />
          </label>
            </div>
          </section>

          <section
            id="settings-invoice"
            className="scroll-mt-28 space-y-4 rounded-xl border p-4 md:p-5"
            style={{ borderColor: "var(--admin-border)" }}
          >
            <h2 className="text-sm font-semibold tracking-tight md:text-base" style={{ color: "var(--admin-text)" }}>
              {lab("companySettingsSectionInvoice", "Sąskaitų nustatymai")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs">
            <span style={{ color: "var(--admin-text-muted)" }}>{lab("companySettingsDefaultCurrency", "Numatytoji valiuta")}</span>
            <input
              className={`${inputCls} mt-1`}
              style={fieldStyle}
              value={form.default_currency}
              onChange={(e) => setForm((f) => (f ? { ...f, default_currency: e.target.value } : f))}
            />
          </label>
          <label className="block text-xs">
            <span style={{ color: "var(--admin-text-muted)" }}>
              {lab("companySettingsPaymentTerm", "Numatytasis mokėjimo terminas (dienomis)")}
            </span>
            <input
              type="number"
              min={0}
              max={365}
              className={`${inputCls} mt-1`}
              style={fieldStyle}
              value={form.default_payment_term_days}
              onChange={(e) => setForm((f) => (f ? { ...f, default_payment_term_days: e.target.value } : f))}
            />
          </label>
          <label className="block text-xs sm:col-span-2">
            <span style={{ color: "var(--admin-text-muted)" }}>{lab("companySettingsDefaultNotes", "Numatytoji pastaba")}</span>
            <textarea
              rows={4}
              className={`${inputCls} mt-1 font-mono text-xs`}
              style={fieldStyle}
              value={form.default_invoice_notes}
              onChange={(e) => setForm((f) => (f ? { ...f, default_invoice_notes: e.target.value } : f))}
            />
          </label>
          <label className="block text-xs sm:col-span-2">
            <span style={{ color: "var(--admin-text-muted)" }}>
              {lab("companySettingsNonVatFooter", "Pastaba ne PVM mokėtojui (pirmoji PDF eilutė)")}
            </span>
            <input
              className={`${inputCls} mt-1`}
              style={fieldStyle}
              value={form.default_vat_footer_note}
              onChange={(e) => setForm((f) => (f ? { ...f, default_vat_footer_note: e.target.value } : f))}
            />
          </label>
          <label className="block text-xs sm:col-span-2">
            <span style={{ color: "var(--admin-text-muted)" }}>
              {lab("companySettingsSellerNotVatLine", "Pardavėjo PVM statuso eilutė (antra, neprivaloma)")}
            </span>
            <input
              className={`${inputCls} mt-1`}
              style={fieldStyle}
              value={form.seller_not_vat_payer_note}
              onChange={(e) => setForm((f) => (f ? { ...f, seller_not_vat_payer_note: e.target.value } : f))}
            />
          </label>
          <p className="text-[10px] sm:col-span-2" style={{ color: "var(--admin-text-muted)" }}>
            {lab("companySettingsPrefixHint", "Serijų prefiksai (tuščia = numatytasis: SF, ISK, KS, DS, PVM)")}
          </p>
          {(
            [
              ["invoice_number_prefix_sales", "SF"],
              ["invoice_number_prefix_proforma", "ISK"],
              ["invoice_number_prefix_credit", "KS"],
              ["invoice_number_prefix_debit", "DS"],
              ["invoice_number_prefix_vat", "PVM"],
            ] as const
          ).map(([key, fb]) => (
            <label key={key} className="block text-xs">
              <span style={{ color: "var(--admin-text-muted)" }}>
                {fb} {lab("companySettingsPrefixLabel", "prefiksas")}
              </span>
              <input
                className={`${inputCls} mt-1 font-mono uppercase`}
                style={fieldStyle}
                placeholder={fb}
                value={form[key]}
                onChange={(e) => setForm((f) => (f ? { ...f, [key]: e.target.value } : f))}
              />
            </label>
          ))}
          <label className="block text-xs sm:col-span-2">
            <span style={{ color: "var(--admin-text-muted)" }}>
              {lab("companySettingsSequenceFloorSales", "SF seka: jau panaudota už programos ribų")}
            </span>
            <input
              type="number"
              min={0}
              className={`${inputCls} mt-1 max-w-[200px]`}
              style={fieldStyle}
              placeholder="0"
              value={form.invoice_sequence_floor_sales}
              onChange={(e) => setForm((f) => (f ? { ...f, invoice_sequence_floor_sales: e.target.value } : f))}
            />
            <p className="mt-1 text-[10px] leading-snug" style={{ color: "var(--admin-text-muted)" }}>
              {lab(
                "companySettingsSequenceFloorSalesHint",
                "Pvz. įrašykite 1, jei jau išrašėte SF-001 ranka — kita programa rodys SF-002."
              )}
            </p>
          </label>
            </div>
          </section>

          <section
            id="settings-tax"
            className="scroll-mt-28 space-y-4 rounded-xl border p-4 md:p-5"
            style={{ borderColor: "var(--admin-border)" }}
          >
            <h2 className="text-sm font-semibold tracking-tight md:text-base" style={{ color: "var(--admin-text)" }}>
              {lab("companySettingsSectionTax", "Mokesčių nustatymai")}
            </h2>
            {turnoverSuggestedVat ? (
              <p
                className="rounded-lg border px-3 py-2.5 text-xs leading-relaxed"
                style={{
                  borderColor: "rgba(251,191,36,0.35)",
                  background: "rgba(251,191,36,0.08)",
                  color: "var(--admin-text-muted)",
                }}
              >
                {lab(
                  "companySettingsTaxProfileAutoFromTurnover",
                  "Pagal apyvartos stebėjimą (45 000 € riba) profilis parinktas „PVM mokėtojas“. Įveskite PVM mokėtojo kodą ir išsaugokite."
                )}
              </p>
            ) : null}
            <label className="block text-xs">
              <span style={{ color: "var(--admin-text-muted)" }}>{lab("companySettingsTaxProfile", "Mokesčių profilis")}</span>
              <select
                className={`${inputCls} mt-1`}
                style={fieldStyle}
                value={form.tax_profile_type}
                onChange={(e) => {
                  const v = e.target.value as FormState["tax_profile_type"];
                  setTurnoverSuggestedVat(false);
                  setForm((f) =>
                    f
                      ? {
                          ...f,
                          tax_profile_type: v,
                          enable_vat_invoices: v === "non_vat" ? false : true,
                        }
                      : f
                  );
                }}
              >
                <option value="non_vat">{lab("taxProfileNonVat", "Ne PVM mokėtojas")}</option>
                <option value="vat">{lab("taxProfileVat", "PVM mokėtojas")}</option>
                <option value="vat_svs">{lab("taxProfileVatSvs", "PVM mokėtojas (SVS)")}</option>
              </select>
            </label>
            {form.tax_profile_type === "non_vat" ? (
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.enable_vat_invoices}
                  onChange={(e) => setForm((f) => (f ? { ...f, enable_vat_invoices: e.target.checked } : f))}
                />
                {lab("companySettingsEnableVatInvoices", "Įgalinti PVM sąskaitų tipą (papildomai prie profilio)")}
              </label>
            ) : (
              <p
                className="rounded-lg border px-3 py-2.5 text-xs leading-relaxed"
                style={{
                  borderColor: "var(--admin-border)",
                  background: "rgba(255,255,255,0.02)",
                  color: "var(--admin-text-muted)",
                }}
              >
                <span className="font-medium" style={{ color: "var(--admin-text)" }}>
                  {lab("companySettingsVatInvoiceTypeLabel", "PVM sąskaitų tipas")}
                </span>
                {" — "}
                {lab(
                  "companySettingsVatInvoicesAutoByProfile",
                  "įjungta automatiškai pagal PVM mokėtojo profilį."
                )}
              </p>
            )}
          </section>

          <div id="settings-actions" className="flex flex-wrap gap-2 scroll-mt-28 pt-2 lg:hidden">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--admin-accent)" }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {lab("companySettingsSave", "Išsaugoti nustatymus")}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={resetFromDb}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium"
              style={{ borderColor: "var(--admin-border)", color: "var(--admin-text)" }}
            >
              {lab("companySettingsReload", "Atnaujinti įmonės duomenis")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
