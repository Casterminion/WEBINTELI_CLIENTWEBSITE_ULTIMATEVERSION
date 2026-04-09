"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import {
  FALLBACK_VAT_FOOTER_PRIMARY,
  resolveInvoiceTaxPresentation,
} from "@/lib/invoices/companyInvoiceSettings";
import type { AdminCompanyTaxSettingsRow } from "@/lib/invoices/types";
import { sumIssuedSalesInvoiceTotalsEur, VAT_THRESHOLDS } from "@/lib/invoices/buhalterijaDashboardMetrics";

type Admin = NonNullable<ReturnType<typeof useLanguage>["t"]["admin"]>;

export const SETTINGS_BASE_PATH = "/admin/buhalterija/nustatymai" as const;

export type SettingsSegment = "santrauka" | "company" | "bank" | "invoice" | "tax";

export const SETTINGS_NAV: {
  segment: SettingsSegment;
  navLabelKey: keyof Admin;
  navFb: string;
  pageTitleKey: keyof Admin;
  pageTitleFb: string;
}[] = [
  {
    segment: "santrauka",
    navLabelKey: "companySettingsNavSummary",
    navFb: "Santrauka",
    pageTitleKey: "companySettingsTitle",
    pageTitleFb: "Įmonės ir sąskaitų nustatymai",
  },
  {
    segment: "company",
    navLabelKey: "companySettingsSectionCompany",
    navFb: "Įmonės duomenys",
    pageTitleKey: "companySettingsSectionCompany",
    pageTitleFb: "Įmonės duomenys",
  },
  {
    segment: "bank",
    navLabelKey: "companySettingsSectionBank",
    navFb: "Banko rekvizitai",
    pageTitleKey: "companySettingsSectionBank",
    pageTitleFb: "Banko rekvizitai",
  },
  {
    segment: "invoice",
    navLabelKey: "companySettingsSectionInvoice",
    navFb: "Sąskaitų nustatymai",
    pageTitleKey: "companySettingsSectionInvoice",
    pageTitleFb: "Sąskaitų nustatymai",
  },
  {
    segment: "tax",
    navLabelKey: "companySettingsSectionTax",
    navFb: "Mokesčių nustatymai",
    pageTitleKey: "companySettingsSectionTax",
    pageTitleFb: "Mokesčių nustatymai",
  },
];

/** IBAN: strip separators, uppercase, cap length, group in fours for readability. */
export function formatIbanInput(value: string): string {
  const alnum = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 34);
  if (!alnum) return "";
  const parts: string[] = [];
  for (let i = 0; i < alnum.length; i += 4) {
    parts.push(alnum.slice(i, i + 4));
  }
  return parts.join(" ");
}

export type FormState = {
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
  invoice_sequence_floor_sales: string;
};

export function rowToForm(row: AdminCompanyTaxSettingsRow): FormState {
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
    enable_vat_invoices: row.tax_profile_type === "non_vat" ? row.enable_vat_invoices : true,
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

type CompanySettingsContextValue = {
  loading: boolean;
  saving: boolean;
  err: string | null;
  form: FormState | null;
  setForm: React.Dispatch<React.SetStateAction<FormState | null>>;
  row: AdminCompanyTaxSettingsRow | null;
  turnoverSuggestedVat: boolean;
  setTurnoverSuggestedVat: React.Dispatch<React.SetStateAction<boolean>>;
  presentation: ReturnType<typeof resolveInvoiceTaxPresentation> | null;
  fieldStyle: React.CSSProperties;
  inputCls: string;
  lab: (key: keyof Admin, fb: string) => string;
  formRootRef: React.RefObject<HTMLDivElement | null>;
  handleFormBlurCapture: (e: FocusEvent<HTMLDivElement>) => void;
  handleFormKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  formatIbanInput: (v: string) => string;
};

const CompanySettingsContext = createContext<CompanySettingsContextValue | null>(null);

export function CompanySettingsProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const a = t.admin;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [row, setRow] = useState<AdminCompanyTaxSettingsRow | null>(null);
  const [turnoverSuggestedVat, setTurnoverSuggestedVat] = useState(false);

  const formRootRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<FormState | null>(null);
  const lastSavedJsonRef = useRef<string>("");
  const blurSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistInFlightRef = useRef(false);

  const fieldStyle = useMemo(
    () => ({
      borderColor: "var(--admin-border)",
      color: "var(--admin-text)",
      background: "var(--admin-bg-elevated)",
    }),
    []
  );

  const inputCls =
    "w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--admin-accent)]";

  const lab = useCallback((key: keyof Admin, fb: string) => (a?.[key] as string) ?? fb, [a]);

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
    lastSavedJsonRef.current = JSON.stringify(nextForm);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    return () => {
      if (blurSaveTimerRef.current) clearTimeout(blurSaveTimerRef.current);
    };
  }, []);

  const presentation = row ? resolveInvoiceTaxPresentation(row) : null;

  const persistForm = useCallback(
    async (formData: FormState): Promise<boolean> => {
      if (persistInFlightRef.current) return false;
      persistInFlightRef.current = true;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return false;

        if (!formData.company_name.trim() || !formData.company_code.trim()) {
          setErr(lab("companySettingsValidationCompany", "Įmonės pavadinimas ir kodas privalomi."));
          return false;
        }
        if (!formatIbanInput(formData.bank_account).replace(/\s/g, "")) {
          setErr(lab("companySettingsValidationBank", "Nurodykite banko sąskaitą (IBAN)."));
          return false;
        }
        const term = Math.max(0, Math.min(365, parseInt(formData.default_payment_term_days, 10) || 0));
        if (formData.tax_profile_type === "vat" || formData.tax_profile_type === "vat_svs") {
          if (!formData.company_vat_code.trim()) {
            setErr(lab("companySettingsValidationVatCode", "PVM mokėtojo kodas privalomas pasirinkus PVM profilį."));
            return false;
          }
        }

        setSaving(true);
        setErr(null);
        try {
          const patch: Record<string, unknown> = {
            company_name: formData.company_name.trim(),
            company_code: formData.company_code.trim(),
            company_vat_code: formData.company_vat_code.trim() || null,
            company_address: formData.company_address.trim(),
            company_email: formData.company_email.trim(),
            company_phone: formData.company_phone.trim(),
            company_website: formData.company_website.trim() || null,
            company_country: formData.company_country.trim().slice(0, 2).toUpperCase() || "LT",
            bank_name: formData.bank_name.trim() || null,
            bank_account: formatIbanInput(formData.bank_account),
            bank_swift: formData.bank_swift.trim() || null,
            default_currency: formData.default_currency.trim().toUpperCase().slice(0, 3) || "EUR",
            default_payment_term_days: term,
            default_invoice_notes: formData.default_invoice_notes.trim(),
            default_vat_footer_note: formData.default_vat_footer_note.trim() || FALLBACK_VAT_FOOTER_PRIMARY,
            seller_not_vat_payer_note: formData.seller_not_vat_payer_note.trim(),
            tax_profile_type: formData.tax_profile_type,
            enable_vat_invoices: formData.enable_vat_invoices,
            invoice_number_prefix_sales: formData.invoice_number_prefix_sales.trim() || null,
            invoice_number_prefix_proforma: formData.invoice_number_prefix_proforma.trim() || null,
            invoice_number_prefix_credit: formData.invoice_number_prefix_credit.trim() || null,
            invoice_number_prefix_debit: formData.invoice_number_prefix_debit.trim() || null,
            invoice_number_prefix_vat: formData.invoice_number_prefix_vat.trim() || null,
            invoice_sequence_floor_sales: (() => {
              const t = formData.invoice_sequence_floor_sales.trim();
              if (!t) return null;
              const n = parseInt(t, 10);
              if (!Number.isFinite(n) || n < 0) return null;
              return n;
            })(),
            updated_at: new Date().toISOString(),
          };

          const { error } = await supabase.from("admin_company_tax_settings").update(patch).eq("user_id", user.id);
          if (error) {
            setErr(error.message);
            return false;
          }
          await load();
          return true;
        } finally {
          setSaving(false);
        }
      } finally {
        persistInFlightRef.current = false;
      }
    },
    [lab, load]
  );

  const scheduleAutosave = useCallback(() => {
    if (blurSaveTimerRef.current) clearTimeout(blurSaveTimerRef.current);
    blurSaveTimerRef.current = setTimeout(() => {
      blurSaveTimerRef.current = null;
      const f = formRef.current;
      if (!f || JSON.stringify(f) === lastSavedJsonRef.current) return;
      void persistForm(f);
    }, 450);
  }, [persistForm]);

  const handleFormBlurCapture = useCallback(
    (e: FocusEvent<HTMLDivElement>) => {
      const rel = e.relatedTarget as Node | null;
      if (rel && formRootRef.current?.contains(rel)) return;
      scheduleAutosave();
    },
    [scheduleAutosave]
  );

  const handleFormKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "Enter" || e.repeat) return;
      const el = e.target as HTMLElement;
      if (el.tagName === "TEXTAREA") return;
      if (el.tagName === "BUTTON") return;
      if (el.tagName !== "INPUT" && el.tagName !== "SELECT") return;
      e.preventDefault();
      if (blurSaveTimerRef.current) {
        clearTimeout(blurSaveTimerRef.current);
        blurSaveTimerRef.current = null;
      }
      const f = formRef.current;
      if (!f || JSON.stringify(f) === lastSavedJsonRef.current) return;
      void persistForm(f);
    },
    [persistForm]
  );

  const value = useMemo<CompanySettingsContextValue>(
    () => ({
      loading,
      saving,
      err,
      form,
      setForm,
      row,
      turnoverSuggestedVat,
      setTurnoverSuggestedVat,
      presentation,
      fieldStyle,
      inputCls,
      lab,
      formRootRef,
      handleFormBlurCapture,
      handleFormKeyDown,
      formatIbanInput,
    }),
    [
      loading,
      saving,
      err,
      form,
      row,
      turnoverSuggestedVat,
      presentation,
      fieldStyle,
      lab,
      handleFormBlurCapture,
      handleFormKeyDown,
    ]
  );

  return <CompanySettingsContext.Provider value={value}>{children}</CompanySettingsContext.Provider>;
}

export function useCompanySettings() {
  const ctx = useContext(CompanySettingsContext);
  if (!ctx) throw new Error("useCompanySettings must be used within CompanySettingsProvider");
  return ctx;
}
