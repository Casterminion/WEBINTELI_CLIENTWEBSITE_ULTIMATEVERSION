"use client";

import { normalizeBuyerCountry } from "@/lib/invoices/buyerIdentification";
import type { BuyerType, InvoiceLineItem, InvoicePayload } from "@/lib/invoices/types";
import { computeLineTotal } from "@/lib/invoices/types";
import { syncDisplayFieldsFromDocumentType } from "@/lib/invoices/types";
import { formatSellerContactLine } from "@/lib/invoices/sellerContact";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABEL_LT,
  documentTypeSelectable,
  isCorrectionDocumentType,
  type DocumentType,
} from "@/lib/invoices/documentTypes";
import { buildNonVatVatSummaryLine } from "@/lib/invoices/companyInvoiceSettings";
import { formatInvoiceApiError } from "@/lib/invoices/invoiceUiErrors";
import { inferServiceTimingUiMode, validateServiceTimingFields } from "@/lib/invoices/serviceTiming";
import { isDraftPlaceholderInvoiceNumber } from "@/lib/invoices/invoiceNumbering";
import { useLanguage } from "@/contexts/LanguageContext";

type Labels = Record<string, string | undefined>;

type TaxFormSettings = {
  enable_vat_invoices: boolean;
  default_vat_footer_note: string;
  seller_not_vat_payer_note?: string;
  tax_profile_type?: "non_vat" | "vat" | "vat_svs";
  /** From `resolveInvoiceTaxPresentation`; default true if omitted (non-VAT MVP). */
  showNonVatPdfTaxNote?: boolean;
  showLineVatColumns?: boolean;
};

type Props = {
  value: InvoicePayload;
  onChange: (next: InvoicePayload) => void;
  /** When true, next invoice number is being loaded from the server */
  invoiceNumberLoading?: boolean;
  taxSettings?: TaxFormSettings | null;
  readOnly?: boolean;
  /** Hide credit/debit note types on the global “new invoice” screen */
  hideCorrectionDocumentTypes?: boolean;
  /** Lock document type (e.g. correction drafts linked to an original invoice) */
  lockDocumentType?: boolean;
  /** Hide seller block (name, code, currency, address, contacts, bank) — e.g. new invoice when data comes from Buhalterija settings */
  hideSellerSection?: boolean;
};

function inputCls() {
  return "w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--admin-accent)]";
}

const BUYER_ISO_COUNTRIES = [
  "LT",
  "EE",
  "LV",
  "PL",
  "DE",
  "NL",
  "BE",
  "FR",
  "GB",
  "IE",
  "SE",
  "DK",
  "NO",
  "FI",
  "AT",
  "CH",
  "US",
  "CA",
  "AU",
] as const;

export function InvoiceEditorForm({
  value,
  onChange,
  invoiceNumberLoading,
  taxSettings,
  readOnly,
  hideCorrectionDocumentTypes,
  lockDocumentType,
  hideSellerSection,
}: Props) {
  const { t } = useLanguage();
  const a = t.admin as Labels;

  const patch = (partial: Partial<InvoicePayload>) => onChange({ ...value, ...partial });

  const setDocumentType = (document_type: DocumentType) => {
    onChange(syncDisplayFieldsFromDocumentType({ ...value, document_type }));
  };

  const patchSellerContact = (partial: Partial<Pick<InvoicePayload, "seller_email" | "seller_phone">>) => {
    const email = partial.seller_email !== undefined ? partial.seller_email : value.seller_email;
    const phone = partial.seller_phone !== undefined ? partial.seller_phone : value.seller_phone;
    onChange({
      ...value,
      ...partial,
      seller_contact_line: formatSellerContactLine(email, phone),
    });
  };

  const patchBuyerContact = (partial: Partial<Pick<InvoicePayload, "buyer_email" | "buyer_phone">>) => {
    const email = partial.buyer_email !== undefined ? partial.buyer_email : value.buyer_email;
    const phone = partial.buyer_phone !== undefined ? partial.buyer_phone : value.buyer_phone;
    onChange({
      ...value,
      ...partial,
      buyer_contact: formatSellerContactLine(email, phone),
    });
  };

  const patchLine = (index: number, partial: Partial<InvoiceLineItem>) => {
    const line_items = value.line_items.map((row, i) => {
      if (i !== index) return row;
      const next = { ...row, ...partial };
      next.line_total = computeLineTotal(next);
      return next;
    });
    onChange({ ...value, line_items });
  };

  const addLine = () => {
    onChange({
      ...value,
      line_items: [
        ...value.line_items,
        { description: "", quantity: 1, unit: "vnt.", unit_price: 0, line_total: 0 },
      ],
    });
  };

  const removeLine = (index: number) => {
    if (value.line_items.length <= 1) return;
    onChange({
      ...value,
      line_items: value.line_items.filter((_, i) => i !== index),
    });
  };

  const lab = (key: keyof typeof a, fallback: string) => (a[key] as string) ?? fallback;

  const fieldStyle = {
    borderColor: "var(--admin-border)",
    color: "var(--admin-text)",
    background: "var(--admin-bg-elevated)",
  } as const;

  const ro = readOnly ? { readOnly: true, className: `${inputCls()} opacity-80 cursor-not-allowed` } : { className: inputCls() };

  const applyDefaultVatNote = () => {
    if (!taxSettings) return;
    patch({
      vat_summary_line: buildNonVatVatSummaryLine({
        default_vat_footer_note: taxSettings.default_vat_footer_note,
        seller_not_vat_payer_note: taxSettings.seller_not_vat_payer_note ?? "",
      }),
    });
  };

  const serviceUiMode = inferServiceTimingUiMode(value);
  const serviceTimingErr = readOnly ? null : validateServiceTimingFields(value);
  const showNonVatTaxNote =
    taxSettings?.showNonVatPdfTaxNote !== undefined ? taxSettings.showNonVatPdfTaxNote : true;

  const buyerCountryNorm = normalizeBuyerCountry(value.buyer_country);
  const isBuyerCompany = value.buyer_type === "company";
  const showLtCompanyCode = isBuyerCompany && buyerCountryNorm === "LT";
  const showForeignReg = isBuyerCompany && buyerCountryNorm !== "LT";
  const countrySelectOptions = [...BUYER_ISO_COUNTRIES];
  if (!countrySelectOptions.includes(buyerCountryNorm as (typeof BUYER_ISO_COUNTRIES)[number])) {
    countrySelectOptions.push(buyerCountryNorm as (typeof BUYER_ISO_COUNTRIES)[number]);
    countrySelectOptions.sort();
  }

  const setServiceTimingMode = (mode: "single" | "period") => {
    const issue = value.issue_date.trim();
    if (mode === "single") {
      onChange({
        ...value,
        service_period_from: "",
        service_period_to: "",
        service_date: value.service_date.trim() || issue,
      });
    } else {
      onChange({
        ...value,
        service_date: "",
        service_period_from: value.service_period_from.trim() || issue,
        service_period_to: value.service_period_to.trim() || issue,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div
        className="grid gap-4 sm:grid-cols-2 rounded-lg border p-4"
        style={{ borderColor: "var(--admin-border)" }}
      >
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
            {lab("buhalterijaDocumentKind", "Dokumento tipas")}
          </label>
          {lockDocumentType || readOnly ? (
            <div
              className={`${inputCls()} opacity-90`}
              style={fieldStyle}
              title={lab("buhalterijaDocumentTypeLocked", "Document type is fixed for this correction")}
            >
              {DOCUMENT_TYPE_LABEL_LT[value.document_type]}
              {value.related_invoice_id && isCorrectionDocumentType(value.document_type) ? (
                <span className="block text-[10px] font-normal mt-1" style={{ color: "var(--admin-text-muted)" }}>
                  {lab("buhalterijaCorrectionLinkedHint", "Linked to an existing invoice")}
                </span>
              ) : value.source_proforma_id?.trim() ? (
                <span className="block text-[10px] font-normal mt-1" style={{ color: "var(--admin-text-muted)" }}>
                  {lab(
                    "buhalterijaFinalFromProformaHint",
                    "Galutinė sąskaita susieta su išankstine — dokumento tipas fiksuotas."
                  )}
                </span>
              ) : value.document_type === "proforma_invoice" && lockDocumentType ? (
                <span className="block text-[10px] font-normal mt-1" style={{ color: "var(--admin-text-muted)" }}>
                  {lab(
                    "buhalterijaProformaTypeLockedHint",
                    "Tipas „Išankstinė sąskaita“ lieka fiksuotas. Galutinei sąskaitai naudokite veiksmą sąskaitos peržiūroje."
                  )}
                </span>
              ) : null}
            </div>
          ) : (
            <select
              className={inputCls()}
              style={fieldStyle}
              value={value.document_type}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            >
              {DOCUMENT_TYPES.filter((dt) => {
                if (hideCorrectionDocumentTypes && isCorrectionDocumentType(dt)) return false;
                return documentTypeSelectable(dt, {
                  enableVatFromDb: taxSettings?.enable_vat_invoices,
                  taxProfileType: taxSettings?.tax_profile_type,
                });
              }).map((dt) => (
                <option key={dt} value={dt}>
                  {DOCUMENT_TYPE_LABEL_LT[dt]}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
            {lab("buhalterijaInvoiceNumber", "Invoice no.")}
            {invoiceNumberLoading ? (
              <span className="ml-2 font-normal opacity-70">…</span>
            ) : null}
          </label>
          <input
            className={`${inputCls()} cursor-not-allowed opacity-90`}
            style={fieldStyle}
            readOnly
            aria-readonly="true"
            title={lab("buhalterijaInvoiceNumberReadonly", "Assigned automatically")}
            value={value.invoice_number}
          />
          {isDraftPlaceholderInvoiceNumber(value.invoice_number) ? (
            <p className="mt-1 text-[10px] leading-snug" style={{ color: "var(--admin-text-muted)" }}>
              {lab(
                "buhalterijaDraftNumberHint",
                "Juodraščio vidinis ID. Galutinis serijos numeris (pvz. SF-001) bus suteiktas išrašant dokumentą."
              )}
            </p>
          ) : !value.id &&
            value.invoice_number.trim() !== "" &&
            value.invoice_number.trim() !== "—" ? (
            <p className="mt-1 text-[10px] leading-snug" style={{ color: "var(--admin-text-muted)" }}>
              {lab(
                "buhalterijaInvoiceNumberPreviewHint",
                "Numatomas kitas numeris — tik peržiūra, ne rezervacija. Išsaugojus juodraštį bus vidinis DRAFT-ID; galutinis numeris suteikiamas tik išrašant."
              )}
            </p>
          ) : null}
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
            {lab("buhalterijaIssueDate", "Issue date")}
          </label>
          <input
            type="date"
            {...ro}
            style={fieldStyle}
            value={value.issue_date}
            onChange={(e) => patch({ issue_date: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2 space-y-2">
          <label className="block text-xs font-medium" style={{ color: "var(--admin-text-muted)" }}>
            {lab("buhalterijaServiceTimingLabel", "Paslaugos data / laikotarpis")}
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => setServiceTimingMode("single")}
              className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60"
              style={{
                borderColor: "var(--admin-border)",
                background: serviceUiMode === "single" ? "var(--admin-accent)" : "var(--admin-bg-elevated)",
                color: serviceUiMode === "single" ? "#fff" : "var(--admin-text)",
              }}
            >
              {lab("buhalterijaServiceTimingSingle", "Viena data")}
            </button>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => setServiceTimingMode("period")}
              className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60"
              style={{
                borderColor: "var(--admin-border)",
                background: serviceUiMode === "period" ? "var(--admin-accent)" : "var(--admin-bg-elevated)",
                color: serviceUiMode === "period" ? "#fff" : "var(--admin-text)",
              }}
            >
              {lab("buhalterijaServiceTimingPeriod", "Laikotarpis")}
            </button>
          </div>
          {serviceUiMode === "single" ? (
            <input
              type="date"
              {...ro}
              style={fieldStyle}
              value={value.service_date}
              onChange={(e) => patch({ service_date: e.target.value })}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                  {lab("buhalterijaDateFrom", "Nuo")}
                </label>
                <input
                  type="date"
                  {...ro}
                  style={fieldStyle}
                  value={value.service_period_from}
                  onChange={(e) => patch({ service_period_from: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                  {lab("buhalterijaDateTo", "Iki")}
                </label>
                <input
                  type="date"
                  {...ro}
                  style={fieldStyle}
                  value={value.service_period_to}
                  onChange={(e) => patch({ service_period_to: e.target.value })}
                />
              </div>
            </div>
          )}
          {serviceTimingErr ? (
            <p className="text-[10px] text-rose-500 leading-snug" role="alert">
              {formatInvoiceApiError(serviceTimingErr, a as Record<string, string | undefined>)}
            </p>
          ) : (
            <p className="text-[10px] leading-snug" style={{ color: "var(--admin-text-muted)" }}>
              {lab("buhalterijaServiceTimingHelper", "Viena data arba laikotarpis nuo–iki; negalima abiejų vienu metu.")}
            </p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
            {lab("buhalterijaDueDate", "Due date")}
          </label>
          <input
            type="date"
            {...ro}
            style={fieldStyle}
            value={value.due_date}
            onChange={(e) => patch({ due_date: e.target.value })}
          />
        </div>
      </div>

      {!hideSellerSection ? (
        <section
          className="rounded-lg border p-4 space-y-3"
          style={{ borderColor: "var(--admin-border)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
            {lab("buhalterijaSeller", "Seller")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                {lab("buhalterijaSellerName", "Pardavėjo pavadinimas")}
              </label>
              <input
                {...ro}
                style={fieldStyle}
                value={value.seller_name}
                onChange={(e) => patch({ seller_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                {lab("buhalterijaCompanyCode", "Company code")}
              </label>
              <input
                {...ro}
                style={fieldStyle}
                value={value.seller_code}
                onChange={(e) => patch({ seller_code: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                {lab("buhalterijaCurrency", "Currency")}
              </label>
              <input
                {...ro}
                style={fieldStyle}
                value={value.currency}
                onChange={(e) => patch({ currency: e.target.value.toUpperCase().slice(0, 3) })}
                maxLength={3}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                {lab("buhalterijaAddress", "Address")}
              </label>
              <input
                {...ro}
                style={fieldStyle}
                value={value.seller_address}
                onChange={(e) => patch({ seller_address: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                {lab("buhalterijaSellerEmail", "Email")}
              </label>
              <input
                type="email"
                autoComplete="email"
                {...ro}
                style={fieldStyle}
                value={value.seller_email}
                onChange={(e) => patchSellerContact({ seller_email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                {lab("buhalterijaSellerPhone", "Phone")}
              </label>
              <input
                type="tel"
                autoComplete="tel"
                {...ro}
                style={fieldStyle}
                value={value.seller_phone}
                onChange={(e) => patchSellerContact({ seller_phone: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                {lab("buhalterijaBankAccount", "Bank account")}
              </label>
              <input
                {...ro}
                style={fieldStyle}
                value={value.seller_bank_account}
                onChange={(e) => patch({ seller_bank_account: e.target.value })}
              />
            </div>
          </div>
        </section>
      ) : null}

      <section
        className="rounded-lg border p-4 space-y-3"
        style={{ borderColor: "var(--admin-border)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
          {lab("buhalterijaBuyer", "Buyer")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {lab("buhalterijaClient", "Client")}{" "}
              <span className="text-rose-500">*</span>
            </label>
            <input
              {...ro}
              style={fieldStyle}
              value={value.buyer_name}
              onChange={(e) => patch({ buyer_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {lab("buhalterijaBuyerType", "Buyer type")}
            </label>
            {readOnly ? (
              <div className={`${inputCls()} opacity-90`} style={fieldStyle}>
                {value.buyer_type === "natural_person"
                  ? lab("buhalterijaBuyerTypeNatural", "Fizinis asmuo")
                  : lab("buhalterijaBuyerTypeCompany", "Įmonė (B2B)")}
              </div>
            ) : (
              <select
                className={inputCls()}
                style={fieldStyle}
                value={value.buyer_type}
                onChange={(e) => patch({ buyer_type: e.target.value as BuyerType })}
              >
                <option value="company">{lab("buhalterijaBuyerTypeCompany", "Įmonė (B2B)")}</option>
                <option value="natural_person">{lab("buhalterijaBuyerTypeNatural", "Fizinis asmuo")}</option>
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {lab("buhalterijaBuyerCountry", "Šalis (ISO)")}
              {isBuyerCompany ? <span className="text-rose-500"> *</span> : null}
            </label>
            {readOnly ? (
              <div className={`${inputCls()} opacity-90`} style={fieldStyle}>
                {buyerCountryNorm}
              </div>
            ) : (
              <select
                className={inputCls()}
                style={fieldStyle}
                value={buyerCountryNorm}
                onChange={(e) => patch({ buyer_country: normalizeBuyerCountry(e.target.value) })}
              >
                {countrySelectOptions.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            )}
          </div>
          {showLtCompanyCode ? (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                {lab("buhalterijaBuyerCompanyCode", "Pirkėjo įmonės kodas")}
                <span className="text-rose-500"> *</span>
              </label>
              <input
                {...ro}
                style={fieldStyle}
                value={value.buyer_company_code}
                onChange={(e) => patch({ buyer_company_code: e.target.value })}
              />
            </div>
          ) : null}
          {showForeignReg ? (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                {lab("buhalterijaBuyerRegistrationNumber", "Registracijos numeris")}
                <span className="text-rose-500"> *</span>
              </label>
              <input
                {...ro}
                style={fieldStyle}
                value={value.buyer_registration_number}
                onChange={(e) => patch({ buyer_registration_number: e.target.value })}
              />
            </div>
          ) : null}
          {isBuyerCompany ? (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                {lab("buhalterijaBuyerVatNumber", "PVM mokėtojo kodas (nebūtina)")}
              </label>
              <input
                {...ro}
                style={fieldStyle}
                value={value.buyer_vat_number}
                onChange={(e) => patch({ buyer_vat_number: e.target.value })}
              />
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {lab("buhalterijaAddress", "Address")}
            </label>
            <input
              {...ro}
              style={fieldStyle}
              value={value.buyer_address}
              onChange={(e) => patch({ buyer_address: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {lab("buhalterijaBuyerEmail", "Buyer e-mail")}
            </label>
            <input
              type="email"
              autoComplete="email"
              {...ro}
              style={fieldStyle}
              value={value.buyer_email}
              onChange={(e) => patchBuyerContact({ buyer_email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {lab("buhalterijaBuyerPhone", "Buyer phone")}
            </label>
            <input
              type="tel"
              autoComplete="tel"
              {...ro}
              style={fieldStyle}
              value={value.buyer_phone}
              onChange={(e) => patchBuyerContact({ buyer_phone: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section
        className="rounded-lg border p-4 space-y-3"
        style={{ borderColor: "var(--admin-border)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
            {lab("buhalterijaLines", "Services")}
          </h2>
          {!readOnly ? (
            <button
              type="button"
              onClick={addLine}
              className="text-xs font-medium px-3 py-1.5 rounded-md border transition-colors hover:bg-[var(--admin-bg-elevated)]"
              style={{ borderColor: "var(--admin-border)", color: "var(--admin-accent)" }}
            >
              {lab("buhalterijaAddLine", "Add line")}
            </button>
          ) : null}
        </div>
        <div className="space-y-6">
          {value.line_items.map((line, index) => (
            <div
              key={index}
              className="border-b pb-5 last:border-0 last:pb-0 space-y-3"
              style={{ borderColor: "var(--admin-border)" }}
            >
              <div className="min-w-0">
                <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                  {lab("buhalterijaDescription", "Description")}
                </label>
                <textarea
                  {...(readOnly ? { readOnly: true } : {})}
                  className={`${inputCls()} min-h-[72px] w-full resize-y${readOnly ? " opacity-80 cursor-not-allowed" : ""}`}
                  style={fieldStyle}
                  value={line.description}
                  onChange={(e) => patchLine(index, { description: e.target.value })}
                  placeholder={lab(
                    "buhalterijaLineDescPlaceholder",
                    "E.g. Website work for period YYYY-MM-DD–YYYY-MM-DD, or SEO retainer for April 2026"
                  )}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 sm:gap-x-3 sm:items-end">
                <div className="col-span-1 min-w-0 sm:col-span-2">
                  <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                    {lab("buhalterijaQuantity", "Qty")}
                  </label>
                  <input
                    type="number"
                    min={0.001}
                    step="any"
                    {...ro}
                    className={`${ro.className ?? inputCls()} w-full tabular-nums text-right`}
                    style={fieldStyle}
                    value={line.quantity}
                    onChange={(e) => patchLine(index, { quantity: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-1 min-w-0 sm:col-span-2">
                  <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                    {lab("buhalterijaUnit", "Unit")}
                  </label>
                  <input
                    {...ro}
                    className={`${ro.className ?? inputCls()} w-full`}
                    style={fieldStyle}
                    value={line.unit}
                    onChange={(e) => patchLine(index, { unit: e.target.value })}
                  />
                </div>
                <div className="col-span-1 min-w-0 sm:col-span-2">
                  <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                    {lab("buhalterijaUnitPrice", "Price")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    {...ro}
                    className={`${ro.className ?? inputCls()} w-full tabular-nums text-right`}
                    style={fieldStyle}
                    value={line.unit_price}
                    onChange={(e) => patchLine(index, { unit_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-1 min-w-0 sm:col-span-2">
                  <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                    {lab("buhalterijaLineTotal", "Total")}
                  </label>
                  <div
                    className="flex h-10 w-full items-center justify-end rounded-md border px-3 text-sm font-medium tabular-nums"
                    style={{
                      borderColor: "var(--admin-border)",
                      color: "var(--admin-text)",
                      background: "var(--admin-bg-elevated)",
                    }}
                  >
                    {line.line_total.toFixed(2)}
                  </div>
                </div>
                {!readOnly ? (
                  <div className="col-span-2 flex items-end justify-end sm:col-span-4 sm:justify-end sm:pb-px">
                    <button
                      type="button"
                      disabled={value.line_items.length <= 1}
                      onClick={() => removeLine(index)}
                      className="text-xs font-medium disabled:opacity-40"
                      style={{ color: "var(--admin-text-muted)" }}
                    >
                      {lab("buhalterijaRemoveLine", "Remove")}
                    </button>
                  </div>
                ) : (
                  <div className="hidden sm:block sm:col-span-4" aria-hidden />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {showNonVatTaxNote ? (
          <div className="sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <label className="block text-xs font-medium" style={{ color: "var(--admin-text-muted)" }}>
                {lab("buhalterijaPdfTaxNote", "Mokestinė pastaba PDF")}
              </label>
              {!readOnly && taxSettings?.default_vat_footer_note ? (
                <button
                  type="button"
                  onClick={applyDefaultVatNote}
                  className="text-[10px] font-medium underline"
                  style={{ color: "var(--admin-accent)" }}
                >
                  {lab("buhalterijaUseDefaultNote", "Įterpti iš įmonės nustatymų")}
                </button>
              ) : null}
            </div>
            <p className="text-[10px] mb-1.5 leading-snug" style={{ color: "var(--admin-text-muted)" }}>
              {lab(
                "buhalterijaPdfTaxNoteHint",
                "Rodoma PDF apačioje (pvz. ne PVM tekstas pagal jūsų įmonės nustatymus)."
              )}
            </p>
            <input
              {...ro}
              style={fieldStyle}
              value={value.vat_summary_line}
              onChange={(e) => patch({ vat_summary_line: e.target.value })}
            />
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
            {lab("buhalterijaNotes", "Notes")}
          </label>
          <textarea
            {...(readOnly ? { readOnly: true } : {})}
            className={`${inputCls()} min-h-[100px]${readOnly ? " opacity-80 cursor-not-allowed" : ""}`}
            style={fieldStyle}
            value={value.notes}
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
