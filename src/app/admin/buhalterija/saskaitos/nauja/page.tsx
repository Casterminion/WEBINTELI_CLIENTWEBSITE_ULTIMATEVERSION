"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { localTodayISO } from "@/lib/adminFormat";
import { addDaysToISODate } from "@/lib/invoices/dateIso";
import {
  WEBINTELI_INVOICE_DEFAULTS,
  emptyLineItem,
  type InvoicePayload,
} from "@/lib/invoices/types";
import { InvoiceEditorForm } from "@/components/admin/invoices/InvoiceEditorForm";
import { InvoicePdfPreview } from "@/components/admin/invoices/InvoicePdfPreview";
import { safePdfFilename } from "@/lib/invoices/supabaseUserFromRequest";

function initialPayload(): InvoicePayload {
  const issue = localTodayISO();
  return {
    ...WEBINTELI_INVOICE_DEFAULTS,
    buyer_name: "",
    invoice_number: "SF-001",
    issue_date: issue,
    due_date: addDaysToISODate(issue, 7),
    line_items: [emptyLineItem()],
    notes:
      "PVM neskaičiuojamas (pardavėjas nėra PVM mokėtojas).\nApmokėjimas atliekamas pagal paslaugų teikimo sutartį.",
  };
}

export default function NaujaSaskaitaPage() {
  const { t } = useLanguage();
  const a = t.admin;
  const router = useRouter();
  const [data, setData] = useState<InvoicePayload>(() => initialPayload());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const previewLabel = useMemo(() => a?.buhalterijaPreview ?? "Preview", [a?.buhalterijaPreview]);

  const generatePdf = useCallback(async () => {
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
        setErr(j?.error ?? `Error ${res.status}`);
        return;
      }
      const newId = res.headers.get("x-invoice-id");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const aEl = document.createElement("a");
      aEl.href = url;
      aEl.download = safePdfFilename(data.invoice_number);
      aEl.click();
      URL.revokeObjectURL(url);
      if (newId) {
        router.replace(`/admin/buhalterija/saskaitos/${newId}/redaguoti`);
      }
    } finally {
      setBusy(false);
    }
  }, [data, router]);

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
        <button
          type="button"
          disabled={busy}
          onClick={() => void generatePdf()}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ background: "var(--admin-accent)" }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? a?.buhalterijaGenerating ?? "…" : a?.buhalterijaGeneratePdf ?? "Generate PDF"}
        </button>
      </div>

      {err && (
        <div
          className="rounded-md border px-4 py-3 text-sm"
          style={{ borderColor: "var(--admin-border)", color: "var(--admin-accent)" }}
        >
          {a?.buhalterijaPdfError ?? err}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-2 xl:items-start">
        <InvoiceEditorForm value={data} onChange={setData} />
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
