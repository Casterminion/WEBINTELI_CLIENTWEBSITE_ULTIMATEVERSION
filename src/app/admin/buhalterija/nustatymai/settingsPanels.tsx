"use client";

import { useCompanySettings, type FormState } from "./companySettingsContext";

export function SantraukaPanel() {
  const { form, presentation, lab } = useCompanySettings();
  if (!form) return null;

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "var(--admin-text-muted)" }}>
        {lab("companySettingsIntro", "Duomenys naudojami naujoms sąskaitoms; išrašytos sąskaitos lieka istorijoje.")}
      </p>
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
    </div>
  );
}

export function CompanyPanel() {
  const { form, setForm, fieldStyle, inputCls, lab } = useCompanySettings();
  if (!form) return null;

  return (
    <section className="space-y-4 rounded-xl border p-4 md:p-5" style={{ borderColor: "var(--admin-border)" }}>
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
  );
}

export function BankPanel() {
  const { form, setForm, fieldStyle, inputCls, lab, formatIbanInput } = useCompanySettings();
  if (!form) return null;

  return (
    <section className="space-y-4 rounded-xl border p-4 md:p-5" style={{ borderColor: "var(--admin-border)" }}>
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
            onChange={(e) => setForm((f) => (f ? { ...f, bank_account: formatIbanInput(e.target.value) } : f))}
            onBlur={() => setForm((f) => (f ? { ...f, bank_account: formatIbanInput(f.bank_account) } : f))}
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
  );
}

export function InvoicePanel() {
  const { form, setForm, fieldStyle, inputCls, lab } = useCompanySettings();
  if (!form) return null;

  return (
    <section className="space-y-4 rounded-xl border p-4 md:p-5" style={{ borderColor: "var(--admin-border)" }}>
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
  );
}

export function TaxPanel() {
  const { form, setForm, fieldStyle, inputCls, lab, turnoverSuggestedVat, setTurnoverSuggestedVat } = useCompanySettings();
  if (!form) return null;

  return (
    <section className="space-y-4 rounded-xl border p-4 md:p-5" style={{ borderColor: "var(--admin-border)" }}>
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
          style={{ borderColor: "var(--admin-border)", background: "rgba(255,255,255,0.02)", color: "var(--admin-text-muted)" }}
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
  );
}
