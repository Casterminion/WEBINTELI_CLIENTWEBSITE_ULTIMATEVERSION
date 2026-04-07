"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import type { AdminInvoiceRow, InvoicePayload } from "@/lib/invoices/types";
import { rowToPayload } from "@/lib/invoices/types";
import { InvoiceEditorForm } from "@/components/admin/invoices/InvoiceEditorForm";
import { InvoicePdfPreview } from "@/components/admin/invoices/InvoicePdfPreview";
import { safePdfFilename } from "@/lib/invoices/supabaseUserFromRequest";

export default function RedaguotiSaskaitaPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { t } = useLanguage();
  const a = t.admin;

  const [data, setData] = useState<InvoicePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const previewLabel = useMemo(() => a?.buhalterijaPreview ?? "Preview", [a?.buhalterijaPreview]);

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
        setData({ ...rowToPayload(row as AdminInvoiceRow), id });
        setErr(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const generatePdf = useCallback(async () => {
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
        setErr(j?.error ?? `Error ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const aEl = document.createElement("a");
      aEl.href = url;
      aEl.download = safePdfFilename(data.invoice_number);
      aEl.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }, [data, id]);

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

  if (!data) {
    return (
      <div className="rounded-md border px-4 py-6 text-sm" style={{ borderColor: "var(--admin-border)" }}>
        {err ?? "Not found"}
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

      {err && err !== "not_found" && (
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
