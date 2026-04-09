"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Eye, FileDown, Loader2, Pencil, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { formatEur } from "@/lib/adminFormat";
import { DOCUMENT_TYPE_LABEL_LT } from "@/lib/invoices/documentTypes";
import type { AdminInvoiceRow } from "@/lib/invoices/types";
import { computeInvoiceSubtotal } from "@/lib/invoices/types";
import { BuhalterijaNav } from "@/components/admin/buhalterija/BuhalterijaNav";

function startOfYearISO(y: number): string {
  return `${y}-01-01`;
}

function endOfYearISO(y: number): string {
  return `${y}-12-31`;
}

export default function SaskaitosSarasasPage() {
  const { t, locale } = useLanguage();
  const a = t.admin;

  const statusLabel = useCallback(
    (status: string) => {
      const labels: Record<string, string | undefined> = {
        draft: a?.buhalterijaStatusDraft,
        issued: a?.buhalterijaStatusWaitingPayment,
        partially_paid: a?.buhalterijaStatusPartiallyPaid,
        paid: a?.buhalterijaStatusPaidFull,
        overdue: a?.buhalterijaStatusOverdueLt,
        cancelled: a?.buhalterijaStatusCancelled,
      };
      return labels[status] ?? status;
    },
    [a]
  );
  const [rows, setRows] = useState<AdminInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportFrom, setExportFrom] = useState(() => startOfYearISO(new Date().getFullYear()));
  const [exportTo, setExportTo] = useState(() => endOfYearISO(new Date().getFullYear()));
  const [zipBusy, setZipBusy] = useState(false);

  const reload = useCallback(async () => {
    setErr(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setRows([]);
      return;
    }
    const { data, error } = await supabase
      .from("admin_invoices")
      .select("*")
      .eq("user_id", user.id)
      .order("issue_date", { ascending: false });
    if (error) {
      setErr(error.message);
      setRows([]);
      return;
    }
    setRows((data ?? []) as AdminInvoiceRow[]);
  }, []);

  useEffect(() => {
    let c = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (c) return;
      if (!user) {
        setLoading(false);
        return;
      }
      await reload();
      if (!c) setLoading(false);
    })();
    return () => {
      c = true;
    };
  }, [reload]);

  const openPdf = async (path: string | null) => {
    if (!path) return;
    const { data, error } = await supabase.storage.from("admin-invoices").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return;
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const downloadPdfSigned = async (path: string | null, invoiceNumber: string) => {
    if (!path) return;
    const { data, error } = await supabase.storage.from("admin-invoices").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return;
    const safe = invoiceNumber.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "invoice";
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = `${safe}.pdf`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  };

  const deleteRow = async (row: AdminInvoiceRow) => {
    if (row.status !== "draft") {
      window.alert(a?.buhalterijaOnlyDraftDelete ?? "Only drafts can be deleted.");
      return;
    }
    if (!window.confirm(a?.buhalterijaDeleteConfirm ?? "Delete?")) return;
    setDeletingId(row.id);
    setErr(null);
    try {
      if (row.pdf_storage_path) {
        await supabase.storage.from("admin-invoices").remove([row.pdf_storage_path]);
      }
      const { error: dErr } = await supabase.from("admin_invoices").delete().eq("id", row.id);
      if (dErr) {
        setErr(dErr.message);
        return;
      }
      await reload();
    } finally {
      setDeletingId(null);
    }
  };

  const downloadZip = async () => {
    setZipBusy(true);
    setErr(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setErr("Unauthorized");
        return;
      }
      const res = await fetch("/api/admin/invoices/export-zip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ date_from: exportFrom, date_to: exportTo }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setErr(j?.error ?? `ZIP ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const aEl = document.createElement("a");
      aEl.href = url;
      aEl.download = `saskaitos-${exportFrom}_${exportTo}.zip`;
      aEl.click();
      URL.revokeObjectURL(url);
    } finally {
      setZipBusy(false);
    }
  };

  const fieldStyle = useMemo(
    () => ({
      borderColor: "var(--admin-border)",
      color: "var(--admin-text)",
      background: "var(--admin-bg-elevated)",
    }),
    []
  );

  if (loading) {
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

  return (
    <div className="space-y-6">
      <BuhalterijaNav />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight" style={{ color: "var(--admin-text)" }}>
            {a?.buhalterijaInvoices ?? "Invoices"}
          </h1>
          <p className="mt-0.5 max-w-2xl text-xs" style={{ color: "var(--admin-text-muted)" }}>
            {a?.buhalterijaInvoicesPageSubtitle ?? a?.buhalterijaSubtitle ?? ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/buhalterija/saskaitos/nauja"
            className="inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white"
            style={{ background: "var(--admin-accent)" }}
          >
            {a?.buhalterijaNewInvoice ?? "New invoice"}
          </Link>
        </div>
      </header>

      {err && (
        <div
          className="rounded-md border px-4 py-3 text-sm"
          style={{ borderColor: "var(--admin-border)", color: "var(--admin-accent)" }}
        >
          {err}
        </div>
      )}

      <section
        className="rounded-lg border p-4 space-y-3"
        style={{ borderColor: "var(--admin-border)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
          {a?.buhalterijaExportTitle ?? "Export"}
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {a?.buhalterijaDateFrom ?? "From"}
            </label>
            <input
              type="date"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
              style={fieldStyle}
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {a?.buhalterijaDateTo ?? "To"}
            </label>
            <input
              type="date"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
              style={fieldStyle}
            />
          </div>
          <button
            type="button"
            disabled={zipBusy}
            onClick={() => void downloadZip()}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
            style={{ borderColor: "var(--admin-border)", color: "var(--admin-text)" }}
          >
            {zipBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {zipBusy ? a?.buhalterijaExporting ?? "…" : a?.buhalterijaDownloadZip ?? "ZIP"}
          </button>
        </div>
      </section>

      <div
        className="rounded-lg border overflow-x-auto"
        style={{ borderColor: "var(--admin-border)" }}
      >
        <table className="w-full text-left text-sm min-w-[640px]">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--admin-border)" }}>
              <th className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--admin-text-muted)" }}>
                {a?.buhalterijaInvoiceNumber ?? "No."}
              </th>
              <th className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--admin-text-muted)" }}>
                {a?.buhalterijaIssueDate ?? "Date"}
              </th>
              <th className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--admin-text-muted)" }}>
                {a?.buhalterijaDocumentKind ?? "Type"}
              </th>
              <th className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--admin-text-muted)" }}>
                {a?.buhalterijaClient ?? "Client"}
              </th>
              <th className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--admin-text-muted)" }}>
                {a?.buhalterijaStatus ?? "Status"}
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-right" style={{ color: "var(--admin-text-muted)" }}>
                {a?.buhalterijaTotal ?? "Total"}
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-right" style={{ color: "var(--admin-text-muted)" }}>
                {a?.buhalterijaActions ?? "Actions"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: "var(--admin-text-muted)" }}>
                  {a?.buhalterijaNoInvoices ?? "No invoices"}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const r = row as AdminInvoiceRow;
                const total =
                  r.total != null && r.total !== undefined
                    ? Number(r.total)
                    : computeInvoiceSubtotal(r.line_items);
                const money =
                  r.currency === "EUR"
                    ? formatEur(total)
                    : new Intl.NumberFormat(locale === "lt" ? "lt-LT" : "en-GB", {
                        style: "currency",
                        currency: r.currency,
                      }).format(total);
                const docKey = r.document_type ?? "sales_invoice";
                const docLabel =
                  DOCUMENT_TYPE_LABEL_LT[docKey as keyof typeof DOCUMENT_TYPE_LABEL_LT] ?? docKey;
                const st = r.status ?? "issued";
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--admin-border)" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--admin-text)" }}>
                      {r.invoice_number}
                    </td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: "var(--admin-text-muted)" }}>
                      {r.issue_date}
                    </td>
                    <td className="px-4 py-3 max-w-[140px] truncate text-xs" style={{ color: "var(--admin-text-muted)" }}>
                      {docLabel}
                    </td>
                    <td className="px-4 py-3 max-w-[160px] truncate" style={{ color: "var(--admin-text)" }}>
                      {r.buyer_name}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--admin-text-muted)" }}>
                      {statusLabel(st)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: "var(--admin-text)" }}>
                      {money}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Link
                          href={`/admin/buhalterija/saskaitos/${r.id}`}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium"
                          style={{ color: "var(--admin-accent)" }}
                          title={a?.buhalterijaViewDetail ?? "Open"}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          disabled={!r.pdf_storage_path}
                          onClick={() => void openPdf(r.pdf_storage_path)}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium disabled:opacity-40"
                          style={{ color: "var(--admin-accent)" }}
                          title={a?.buhalterijaViewPdf ?? "View"}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={!r.pdf_storage_path}
                          onClick={() => void downloadPdfSigned(r.pdf_storage_path, r.invoice_number)}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium disabled:opacity-40"
                          style={{ color: "var(--admin-accent)" }}
                          title={a?.buhalterijaDownloadPdf ?? "Download"}
                        >
                          <FileDown className="h-3.5 w-3.5" />
                        </button>
                        {st === "draft" ? (
                          <Link
                            href={`/admin/buhalterija/saskaitos/${r.id}/redaguoti`}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium"
                            style={{ color: "var(--admin-accent)" }}
                            title={a?.buhalterijaEdit ?? "Edit"}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          disabled={deletingId === r.id || st !== "draft"}
                          onClick={() => void deleteRow(r)}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-rose-500 disabled:opacity-40"
                          title={a?.buhalterijaDelete ?? "Delete"}
                        >
                          {deletingId === r.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
