"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { isCorrectionDocumentType } from "@/lib/invoices/documentTypes";
import type { AdminCompanyTaxSettingsRow, AdminInvoiceRow, InvoicePayload } from "@/lib/invoices/types";
import { rowToPayload } from "@/lib/invoices/types";
import { InvoiceEditorForm } from "@/components/admin/invoices/InvoiceEditorForm";
import { InvoicePdfPreview } from "@/components/admin/invoices/InvoicePdfPreview";
import { resolveInvoiceTaxPresentation } from "@/lib/invoices/companyInvoiceSettings";
import { formatInvoiceApiError } from "@/lib/invoices/invoiceUiErrors";
import { validateServiceTimingFields } from "@/lib/invoices/serviceTiming";
import { safePdfFilename } from "@/lib/invoices/supabaseUserFromRequest";

export default function RedaguotiSaskaitaPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { t } = useLanguage();
  const a = t.admin;

  const [data, setData] = useState<InvoicePayload | null>(null);
  const [rowStatus, setRowStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [taxSettings, setTaxSettings] = useState<AdminCompanyTaxSettingsRow | null>(null);

  const previewLabel = useMemo(() => a?.buhalterijaPreview ?? "Preview", [a?.buhalterijaPreview]);

  const serviceTimingInvalid = useMemo(
    () => (data ? validateServiceTimingFields(data) !== null : false),
    [data]
  );

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
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: row, error } = await supabase.from("admin_invoices").select("*").eq("id", id).maybeSingle();
      if (cancelled) return;
      if (error || !row) {
        setErr(error?.message ?? "not_found");
        setData(null);
      } else {
        const r = row as AdminInvoiceRow;
        setRowStatus(r.status);
        if (r.status !== "draft") {
          router.replace(`/admin/buhalterija/saskaitos/${id}`);
          return;
        }
        setData({ ...rowToPayload(r), id });
        setErr(null);
      }
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (u) {
        const { data: ts } = await supabase
          .from("admin_company_tax_settings")
          .select("*")
          .eq("user_id", u.id)
          .maybeSingle();
        if (!cancelled && ts) setTaxSettings(ts as AdminCompanyTaxSettingsRow);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const saveDraft = useCallback(async () => {
    if (!data) return;
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
      const res = await fetch(`/api/admin/invoices/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ...data, id }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setErr(formatInvoiceApiError(j?.error, a as Record<string, string | undefined>) || `Error ${res.status}`);
      }
    } finally {
      setBusy(false);
    }
  }, [data, id, a]);

  const issuePdf = useCallback(async () => {
    if (!data) return;
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
      const patchRes = await fetch(`/api/admin/invoices/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ...data, id }),
      });
      if (!patchRes.ok) {
        const j = (await patchRes.json().catch(() => null)) as { error?: string } | null;
        setErr(formatInvoiceApiError(j?.error, a as Record<string, string | undefined>) || `Error ${patchRes.status}`);
        return;
      }

      const res = await fetch(`/api/admin/invoices/${id}/issue`, {
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
      router.replace(`/admin/buhalterija/saskaitos/${id}`);
    } finally {
      setBusy(false);
    }
  }, [data, id, router, a]);

  const downloadPreview = useCallback(async () => {
    if (!data) return;
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
        body: JSON.stringify({ ...data, id }),
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
  }, [data, id, a]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--admin-accent)" }} />
        <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>
          {a?.buhalterijaLoading ?? "Loading…"}
        </p>
      </div>
    );
  }

  const lockDocumentType = Boolean(
    (data && data.related_invoice_id && isCorrectionDocumentType(data.document_type)) ||
      (data && data.document_type === "sales_invoice" && Boolean(data.source_proforma_id?.trim())) ||
      (data && data.document_type === "proforma_invoice")
  );

  if (!data || rowStatus !== "draft") {
    return (
      <div className="rounded-md border px-4 py-6 text-sm space-y-2" style={{ borderColor: "var(--admin-border)" }}>
        <p>{err ?? a?.buhalterijaNotDraftHint ?? "Not a draft."}</p>
        {id ? (
          <Link href={`/admin/buhalterija/saskaitos/${id}`} className="text-xs font-medium underline" style={{ color: "var(--admin-accent)" }}>
            {a?.buhalterijaInvoiceDetail ?? "Open invoice"}
          </Link>
        ) : null}
      </div>
    );
  }

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
            {a?.buhalterijaEditInvoice ?? "Edit invoice"}
          </h1>
          <p className="mt-0.5 text-xs" style={{ color: "var(--admin-text-muted)" }}>
            {data.invoice_number} · {data.issue_date}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || serviceTimingInvalid}
            onClick={() => void saveDraft()}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
            style={{ borderColor: "var(--admin-border)", color: "var(--admin-text)" }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {a?.buhalterijaSaveDraft ?? "Save draft"}
          </button>
          <button
            type="button"
            disabled={busy || serviceTimingInvalid}
            onClick={() => void downloadPreview()}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
            style={{ borderColor: "var(--admin-border)", color: "var(--admin-text)" }}
          >
            {a?.buhalterijaDownloadPreview ?? "Preview PDF"}
          </button>
          <button
            type="button"
            disabled={busy || serviceTimingInvalid}
            onClick={() => void issuePdf()}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: "var(--admin-accent)" }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? a?.buhalterijaGenerating ?? "…" : a?.buhalterijaIssuePdf ?? "Issue PDF"}
          </button>
        </div>
      </div>

      {err && err !== "not_found" && (
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
          lockDocumentType={lockDocumentType}
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
