"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { localTodayISO } from "@/lib/adminFormat";
import {
  resolveInvoiceTaxPresentation,
  sellerPayloadFromCompanySettings,
} from "@/lib/invoices/companyInvoiceSettings";
import { formatInvoiceApiError } from "@/lib/invoices/invoiceUiErrors";
import { validateServiceTimingFields } from "@/lib/invoices/serviceTiming";
import { addDaysToISODate } from "@/lib/invoices/dateIso";
import {
  WEBINTELI_INVOICE_DEFAULTS,
  emptyLineItem,
  type InvoicePayload,
} from "@/lib/invoices/types";
import { InvoiceEditorForm } from "@/components/admin/invoices/InvoiceEditorForm";
import { InvoicePdfPreview } from "@/components/admin/invoices/InvoicePdfPreview";
import { safePdfFilename } from "@/lib/invoices/supabaseUserFromRequest";
import type { AdminCompanyTaxSettingsRow } from "@/lib/invoices/types";

function initialPayload(): InvoicePayload {
  const issue = localTodayISO();
  return {
    ...WEBINTELI_INVOICE_DEFAULTS,
    buyer_name: "",
    invoice_number: "—",
    issue_date: issue,
    service_date: issue,
    due_date: addDaysToISODate(issue, 7),
    line_items: [emptyLineItem()],
    notes: "",
  };
}

export default function NaujaSaskaitaPage() {
  const { t } = useLanguage();
  const a = t.admin;
  const router = useRouter();
  const [data, setData] = useState<InvoicePayload>(() => initialPayload());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [invoiceNumberLoading, setInvoiceNumberLoading] = useState(true);
  const [taxSettings, setTaxSettings] = useState<AdminCompanyTaxSettingsRow | null>(null);
  const mergedSettingsIntoPayload = useRef(false);

  const previewLabel = useMemo(() => a?.buhalterijaPreview ?? "Preview", [a?.buhalterijaPreview]);

  const serviceTimingInvalid = useMemo(() => validateServiceTimingFields(data) !== null, [data]);

  const taxFormProps = useMemo(() => {
    if (!taxSettings) return null;
    const pres = resolveInvoiceTaxPresentation(taxSettings);
    return {
      enable_vat_invoices: taxSettings.enable_vat_invoices,
      default_vat_footer_note: taxSettings.default_vat_footer_note,
      seller_not_vat_payer_note: taxSettings.seller_not_vat_payer_note,
      tax_profile_type: taxSettings.tax_profile_type,
      showNonVatPdfTaxNote: pres.showNonVatPdfTaxNote,
      showLineVatColumns: pres.showLineVatColumns,
    };
  }, [taxSettings]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      let { data: ts } = await supabase.from("admin_company_tax_settings").select("*").eq("user_id", user.id).maybeSingle();
      if (cancelled) return;
      if (!ts) {
        const ins = await supabase.from("admin_company_tax_settings").insert({ user_id: user.id }).select("*").single();
        if (ins.error || !ins.data) return;
        ts = ins.data;
      }
      const row = ts as AdminCompanyTaxSettingsRow;
      setTaxSettings(row);
      if (mergedSettingsIntoPayload.current) return;
      mergedSettingsIntoPayload.current = true;
      setData((prev) => {
        const issue = prev.issue_date || localTodayISO();
        const term = row.default_payment_term_days ?? 7;
        return {
          ...prev,
          ...sellerPayloadFromCompanySettings(row),
          notes: row.default_invoice_notes?.trim() || prev.notes,
          due_date: addDaysToISODate(issue, term),
        };
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setInvoiceNumberLoading(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled || !session?.access_token) {
          if (!cancelled) setInvoiceNumberLoading(false);
          return;
        }

        const r = await fetch(
          `/api/admin/invoices/next-number?document_type=${encodeURIComponent(data.document_type)}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        if (cancelled) return;
        const j = (await r.json().catch(() => null)) as { next_number?: string; error?: string } | null;
        if (!r.ok || !j?.next_number) {
          setData((prev) => ({ ...prev, invoice_number: j?.error ?? "SF-001" }));
        } else {
          setData((prev) => ({ ...prev, invoice_number: j.next_number! }));
        }
      } finally {
        if (!cancelled) setInvoiceNumberLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data.document_type]);

  const saveDraft = useCallback(async (): Promise<string | null> => {
    setErr(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setErr("Unauthorized");
      return null;
    }
    const res = await fetch("/api/admin/invoices/draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(data),
    });
    const j = (await res.json().catch(() => null)) as { id?: string; invoice_number?: string; error?: string } | null;
    if (!res.ok || !j?.id) {
      setErr(formatInvoiceApiError(j?.error, a as Record<string, string | undefined>) || `Error ${res.status}`);
      return null;
    }
    setData((prev) => ({
      ...prev,
      id: j.id,
      invoice_number: j.invoice_number ?? prev.invoice_number,
    }));
    return j.id;
  }, [data, a]);

  const issuePdf = useCallback(async () => {
    setErr(null);
    setBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setErr("Unauthorized");
        return;
      }
      let invoiceId: string | undefined = data.id;
      if (!invoiceId) {
        const newId = await saveDraft();
        if (!newId) return;
        invoiceId = newId;
      } else {
        const patchRes = await fetch(`/api/admin/invoices/${invoiceId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ ...data, id: invoiceId }),
        });
        if (!patchRes.ok) {
          const pj = (await patchRes.json().catch(() => null)) as { error?: string } | null;
          setErr(formatInvoiceApiError(pj?.error, a as Record<string, string | undefined>) || `Error ${patchRes.status}`);
          return;
        }
      }

      const res = await fetch(`/api/admin/invoices/${invoiceId}/issue`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setErr(formatInvoiceApiError(j?.error, a as Record<string, string | undefined>) || `Error ${res.status}`);
        return;
      }
      const issuedNo = res.headers.get("X-Invoice-Number")?.trim();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const aEl = document.createElement("a");
      aEl.href = url;
      aEl.download = safePdfFilename(issuedNo || data.invoice_number);
      aEl.click();
      URL.revokeObjectURL(url);
      router.replace(`/admin/buhalterija/saskaitos/${invoiceId}`);
    } finally {
      setBusy(false);
    }
  }, [data, router, saveDraft, a]);

  const downloadPreview = useCallback(async () => {
    setErr(null);
    setBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setErr("Unauthorized");
        return;
      }
      const res = await fetch("/api/admin/invoices/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setErr(formatInvoiceApiError(j?.error, a as Record<string, string | undefined>) || `Error ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const aEl = document.createElement("a");
      aEl.href = url;
      aEl.download = safePdfFilename(`perziura-${data.invoice_number}`);
      aEl.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }, [data, a]);

  const onSaveDraftClick = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const id = await saveDraft();
      if (id) router.replace(`/admin/buhalterija/saskaitos/${id}/redaguoti`);
    } finally {
      setBusy(false);
    }
  }, [router, saveDraft]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/buhalterija/saskaitos"
            className="text-xs font-medium hover:underline"
            style={{ color: "var(--admin-accent)" }}
          >
            ← {a?.buhalterijaBackToList ?? "Back"}
          </Link>
          <h1 className="mt-2 text-lg font-semibold tracking-tight" style={{ color: "var(--admin-text)" }}>
            {a?.buhalterijaNewInvoice ?? "New invoice"}
          </h1>
          <p className="mt-0.5 max-w-2xl text-xs" style={{ color: "var(--admin-text-muted)" }}>
            {a?.buhalterijaSubtitle ?? ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || invoiceNumberLoading || serviceTimingInvalid}
            onClick={() => void onSaveDraftClick()}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
            style={{ borderColor: "var(--admin-border)", color: "var(--admin-text)" }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {a?.buhalterijaSaveDraft ?? "Save draft"}
          </button>
          <button
            type="button"
            disabled={busy || invoiceNumberLoading || serviceTimingInvalid}
            onClick={() => void downloadPreview()}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
            style={{ borderColor: "var(--admin-border)", color: "var(--admin-text)" }}
          >
            {a?.buhalterijaDownloadPreview ?? "Preview PDF"}
          </button>
          <button
            type="button"
            disabled={busy || invoiceNumberLoading || serviceTimingInvalid}
            onClick={() => void issuePdf()}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: "var(--admin-accent)" }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? a?.buhalterijaGenerating ?? "…" : a?.buhalterijaIssuePdf ?? "Issue PDF"}
          </button>
        </div>
      </div>

      {err && (
        <div
          className="rounded-md border px-4 py-3 text-sm"
          style={{ borderColor: "var(--admin-border)", color: "var(--admin-accent)" }}
        >
          {err}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-2 xl:items-start">
        <InvoiceEditorForm
          value={data}
          onChange={setData}
          hideCorrectionDocumentTypes
          hideSellerSection
          invoiceNumberLoading={invoiceNumberLoading}
          taxSettings={taxFormProps}
        />
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--admin-text-muted)" }}>
            {a?.buhalterijaPreview ?? "Preview"}
          </p>
          <InvoicePdfPreview data={data} loadingLabel={previewLabel} />
        </div>
      </div>
    </div>
  );
}
