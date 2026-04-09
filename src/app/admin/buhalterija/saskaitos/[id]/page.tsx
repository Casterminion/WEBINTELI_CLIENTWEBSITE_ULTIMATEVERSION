"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, FileDown, Loader2, Paperclip, Pencil } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { formatEur, localTodayISO } from "@/lib/adminFormat";
import { InvoiceCorrectionDialog } from "@/components/admin/invoices/InvoiceCorrectionDialog";
import { DOCUMENT_TYPE_LABEL_LT, isCorrectionDocumentType } from "@/lib/invoices/documentTypes";
import { buyerIdentificationIncompleteForDisplay } from "@/lib/invoices/buyerIdentification";
import {
  canCreateCorrectionFromInvoice,
  correctionSignedDelta,
  effectiveTotalAfterCorrections,
  humanCorrectionPrimaryLabelLt,
} from "@/lib/invoices/correctionInvoice";
import { amountDue } from "@/lib/invoices/invoiceStatus";
import type { AdminInvoicePaymentRow, AdminInvoiceRow } from "@/lib/invoices/types";
import { computeInvoiceSubtotal, rowToPayload } from "@/lib/invoices/types";
import { InvoiceEditorForm } from "@/components/admin/invoices/InvoiceEditorForm";
import { summarizeInvoicePayments } from "@/lib/invoices/invoicePaymentSummary";
import { canCreateFinalSalesInvoiceFromProforma } from "@/lib/invoices/proformaFinalInvoice";

function SaskaitaDetailPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { t, locale } = useLanguage();
  const a = t.admin;

  const [row, setRow] = useState<AdminInvoiceRow | null>(null);
  const [corrections, setCorrections] = useState<AdminInvoiceRow[]>([]);
  const [payments, setPayments] = useState<AdminInvoicePaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [payForm, setPayForm] = useState({ payment_date: "", amount: "", reference: "", note: "" });
  const [payAttachment, setPayAttachment] = useState<File | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionMode, setCorrectionMode] = useState<"decrease" | "increase" | null>(null);
  const [linkedFinalSales, setLinkedFinalSales] = useState<AdminInvoiceRow | null>(null);
  const [proformaSource, setProformaSource] = useState<AdminInvoiceRow | null>(null);
  const [finalFromProformaBusy, setFinalFromProformaBusy] = useState(false);

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

  const reload = useCallback(async () => {
    if (!id) return;
    setErr(null);
    const { data: inv, error: e1 } = await supabase.from("admin_invoices").select("*").eq("id", id).maybeSingle();
    if (e1 || !inv) {
      setErr(e1?.message ?? "not_found");
      setRow(null);
      setLinkedFinalSales(null);
      setProformaSource(null);
      return;
    }
    const invRow = inv as AdminInvoiceRow;
    setRow(invRow);

    if (invRow.document_type === "proforma_invoice") {
      const { data: fin } = await supabase
        .from("admin_invoices")
        .select("*")
        .eq("source_proforma_id", id)
        .eq("document_type", "sales_invoice")
        .neq("status", "cancelled")
        .maybeSingle();
      setLinkedFinalSales(fin ? (fin as AdminInvoiceRow) : null);
    } else {
      setLinkedFinalSales(null);
    }

    const srcId = invRow.source_proforma_id;
    if (srcId && /^[0-9a-f-]{36}$/i.test(srcId)) {
      const { data: pr } = await supabase.from("admin_invoices").select("*").eq("id", srcId).maybeSingle();
      setProformaSource(pr ? (pr as AdminInvoiceRow) : null);
    } else {
      setProformaSource(null);
    }
    const { data: corrRows, error: eCorr } = await supabase
      .from("admin_invoices")
      .select("*")
      .eq("related_invoice_id", id)
      .in("document_type", ["credit_note", "debit_note"])
      .order("created_at", { ascending: true });
    if (eCorr) {
      setCorrections([]);
    } else {
      setCorrections((corrRows ?? []) as AdminInvoiceRow[]);
    }
    const { data: pays, error: e2 } = await supabase
      .from("admin_invoice_payments")
      .select("*")
      .eq("invoice_id", id)
      .order("payment_date", { ascending: false });
    if (e2) {
      setErr(e2.message);
      setPayments([]);
      return;
    }
    setPayments((pays ?? []) as AdminInvoicePaymentRow[]);
  }, [id]);

  useEffect(() => {
    let c = false;
    (async () => {
      await reload();
      if (!c) setLoading(false);
    })();
    return () => {
      c = true;
    };
  }, [reload]);

  const paidTotal = useMemo(
    () => Math.round(payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) * 100) / 100,
    [payments]
  );

  const invoiceTotal = row ? Number(row.total) || computeInvoiceSubtotal(row.line_items) : 0;
  const due = row ? amountDue(invoiceTotal, paidTotal) : 0;

  const paymentSummary = useMemo(() => {
    if (!row) return null;
    return summarizeInvoicePayments(invoiceTotal, payments);
  }, [row, invoiceTotal, payments]);

  const openPayModal = useCallback(() => {
    setPayForm({
      payment_date: localTodayISO(),
      amount: due > 0 ? due.toFixed(2) : "",
      reference: "",
      note: "",
    });
    setPayAttachment(null);
    setPayOpen(true);
    setErr(null);
  }, [due]);

  useEffect(() => {
    if (searchParams.get("registerPayment") !== "1" || !row) return;
    const can =
      row.issued_at && row.status !== "cancelled" && row.status !== "draft" && due > 0;
    if (can) openPayModal();
    router.replace(`/admin/buhalterija/saskaitos/${id}`, { scroll: false });
  }, [searchParams, row, due, id, router, openPayModal]);

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
    const el = document.createElement("a");
    el.href = data.signedUrl;
    el.download = `${safe}.pdf`;
    el.target = "_blank";
    el.rel = "noopener noreferrer";
    el.click();
  };

  const openPaymentAttachment = async (path: string | null) => {
    if (!path) return;
    const { data, error } = await supabase.storage.from("admin-payment-attachments").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return;
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const submitPayment = async () => {
    if (!id || !payForm.payment_date || !payForm.amount) return;
    setPayBusy(true);
    setErr(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setErr("Unauthorized");
        return;
      }
      let res: Response;
      if (payAttachment) {
        const fd = new FormData();
        fd.append("payment_date", payForm.payment_date);
        fd.append("amount", payForm.amount);
        fd.append("currency", (row?.currency ?? "EUR").toUpperCase());
        fd.append("method", "bank_transfer");
        fd.append("reference", payForm.reference);
        fd.append("note", payForm.note);
        fd.append("attachment", payAttachment);
        res = await fetch(`/api/admin/invoices/${id}/payments`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: fd,
        });
      } else {
        res = await fetch(`/api/admin/invoices/${id}/payments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            payment_date: payForm.payment_date,
            amount: parseFloat(payForm.amount),
            currency: row?.currency ?? "EUR",
            method: "bank_transfer",
            reference: payForm.reference,
            note: payForm.note,
          }),
        });
      }
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        const code = j?.error ?? "";
        if (code === "payment_exceeds_balance") setErr(a?.buhalterijaPaymentExceedsBalance ?? code);
        else if (code === "currency_mismatch") setErr(a?.buhalterijaCurrencyMismatch ?? code);
        else setErr(code || `Error ${res.status}`);
        return;
      }
      setPayOpen(false);
      setPayForm({ payment_date: "", amount: "", reference: "", note: "" });
      setPayAttachment(null);
      await reload();
    } finally {
      setPayBusy(false);
    }
  };

  const cancelInvoice = async () => {
    if (!id || !window.confirm(a?.buhalterijaCancelInvoice ?? "Cancel?")) return;
    setCancelBusy(true);
    setErr(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setErr("Unauthorized");
        return;
      }
      const res = await fetch(`/api/admin/invoices/${id}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setErr(j?.error ?? `Error ${res.status}`);
        return;
      }
      await reload();
    } finally {
      setCancelBusy(false);
    }
  };

  const createFinalFromProforma = useCallback(async () => {
    if (!id) return;
    setFinalFromProformaBusy(true);
    setErr(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setErr("Unauthorized");
        return;
      }
      const res = await fetch("/api/admin/invoices/final-from-proforma", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ proforma_invoice_id: id }),
      });
      const j = (await res.json().catch(() => null)) as {
        error?: string;
        id?: string;
        existing_invoice_number?: string;
      } | null;
      if (!res.ok) {
        if (j?.error === "final_sales_invoice_exists") {
          setErr(
            (a?.buhalterijaFinalExists ?? "Jau yra galutinė sąskaita ({n}).").replace(
              "{n}",
              j.existing_invoice_number ?? "—"
            )
          );
        } else {
          setErr(j?.error ?? `Error ${res.status}`);
        }
        return;
      }
      if (j?.id) void router.push(`/admin/buhalterija/saskaitos/${j.id}/redaguoti`);
    } finally {
      setFinalFromProformaBusy(false);
    }
  }, [id, router, a?.buhalterijaFinalExists]);

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

  if (!row) {
    return (
      <div className="rounded-md border px-4 py-6 text-sm" style={{ borderColor: "var(--admin-border)" }}>
        {err ?? "Not found"}
      </div>
    );
  }

  const docLabel = DOCUMENT_TYPE_LABEL_LT[row.document_type] ?? row.document_type;
  const formatCurrencyAmount = (n: number) =>
    row.currency === "EUR"
      ? formatEur(n)
      : new Intl.NumberFormat(locale === "lt" ? "lt-LT" : "en-GB", {
          style: "currency",
          currency: row.currency,
        }).format(n);

  const money = formatCurrencyAmount(invoiceTotal);

  const canRegisterPayment =
    row.issued_at && row.status !== "cancelled" && row.status !== "draft" && due > 0;
  const canCancel =
    row.issued_at && !row.cancelled_at && paidTotal <= 0 && row.status !== "cancelled" && row.status !== "draft";

  const canOfferCorrections =
    canCreateCorrectionFromInvoice(row) && !isCorrectionDocumentType(row.document_type);

  const effectiveAfterCorrections =
    corrections.length > 0 ? effectiveTotalAfterCorrections(invoiceTotal, corrections) : null;

  const openCorrection = (mode: "decrease" | "increase") => {
    setCorrectionMode(mode);
    setCorrectionOpen(true);
    setErr(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/buhalterija/saskaitos"
            className="text-xs font-medium hover:underline"
            style={{ color: "var(--admin-accent)" }}
          >
            ← {a?.buhalterijaBackToList ?? "Back"}
          </Link>
          <h1 className="mt-2 text-lg font-semibold tracking-tight" style={{ color: "var(--admin-text)" }}>
            {a?.buhalterijaInvoiceDetail ?? "Invoice"} {row.invoice_number}
          </h1>
          <p className="mt-0.5 text-xs" style={{ color: "var(--admin-text-muted)" }}>
            {docLabel} · {row.buyer_name}
          </p>
          {row.document_type === "proforma_invoice" ? (
            <p
              className="mt-2 text-xs font-medium rounded-md px-2 py-1.5 border max-w-xl"
              style={{
                borderColor: "color-mix(in srgb, #f59e0b 45%, var(--admin-border))",
                color: "#b45309",
                background: "color-mix(in srgb, #fffbeb 88%, var(--admin-bg))",
              }}
            >
              {a?.buhalterijaProformaNotFinalDoc ?? "Tai nėra galutinis pardavimo dokumentas"}
            </p>
          ) : null}
          {linkedFinalSales ? (
            <p className="mt-2 text-xs" style={{ color: "var(--admin-text-muted)" }}>
              {(() => {
                const parts = (
                  a?.buhalterijaLinkedFinalInvoice ??
                  "Pagal šią išankstinę sukurta galutinė sąskaita {n}."
                ).split("{n}");
                return (
                  <>
                    {parts[0]}
                    <Link
                      href={`/admin/buhalterija/saskaitos/${linkedFinalSales.id}`}
                      className="font-semibold tabular-nums hover:underline"
                      style={{ color: "var(--admin-accent)" }}
                    >
                      {linkedFinalSales.invoice_number}
                    </Link>
                    {parts[1] ?? ""}
                  </>
                );
              })()}
            </p>
          ) : null}
          {proformaSource ? (
            <p className="mt-2 text-xs" style={{ color: "var(--admin-text-muted)" }}>
              {(() => {
                const parts = (
                  a?.buhalterijaCreatedFromProforma ?? "Sukurta pagal išankstinę sąskaitą {n}."
                ).split("{n}");
                return (
                  <>
                    {parts[0]}
                    <Link
                      href={`/admin/buhalterija/saskaitos/${proformaSource.id}`}
                      className="font-semibold tabular-nums hover:underline"
                      style={{ color: "var(--admin-accent)" }}
                    >
                      {proformaSource.invoice_number}
                    </Link>
                    {parts[1] ?? ""}
                  </>
                );
              })()}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {row.document_type === "proforma_invoice" &&
          canCreateFinalSalesInvoiceFromProforma(row) &&
          !linkedFinalSales ? (
            <button
              type="button"
              disabled={finalFromProformaBusy}
              onClick={() => void createFinalFromProforma()}
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "var(--admin-accent)" }}
            >
              {finalFromProformaBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {a?.buhalterijaCreateFinalInvoice ?? "Sukurti galutinę sąskaitą"}
            </button>
          ) : null}
          {row.status === "draft" ? (
            <Link
              href={`/admin/buhalterija/saskaitos/${id}/redaguoti`}
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"
              style={{ borderColor: "var(--admin-border)", color: "var(--admin-accent)" }}
            >
              <Pencil className="h-4 w-4" />
              {a?.buhalterijaEdit ?? "Edit"}
            </Link>
          ) : null}
          <button
            type="button"
            disabled={!row.pdf_storage_path}
            onClick={() => void openPdf(row.pdf_storage_path)}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-40"
            style={{ borderColor: "var(--admin-border)", color: "var(--admin-text)" }}
          >
            <ExternalLink className="h-4 w-4" />
            {a?.buhalterijaViewPdf ?? "View PDF"}
          </button>
          <button
            type="button"
            disabled={!row.pdf_storage_path}
            onClick={() => void downloadPdfSigned(row.pdf_storage_path, row.invoice_number)}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            style={{ background: "var(--admin-accent)" }}
          >
            <FileDown className="h-4 w-4" />
            {a?.buhalterijaDownloadPdf ?? "Download"}
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

      <section
        className="rounded-lg border p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm"
        style={{ borderColor: "var(--admin-border)" }}
      >
        <div>
          <p className="text-[10px] font-medium uppercase" style={{ color: "var(--admin-text-muted)" }}>
            {a?.buhalterijaStatus ?? "Status"}
          </p>
          <p className="font-semibold" style={{ color: "var(--admin-text)" }}>
            {statusLabel(row.status)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase" style={{ color: "var(--admin-text-muted)" }}>
            {a?.buhalterijaIssueDate ?? "Issue"}
          </p>
          <p className="tabular-nums" style={{ color: "var(--admin-text)" }}>
            {row.issue_date}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase" style={{ color: "var(--admin-text-muted)" }}>
            {a?.buhalterijaDueDate ?? "Due"}
          </p>
          <p className="tabular-nums" style={{ color: "var(--admin-text)" }}>
            {row.due_date}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase" style={{ color: "var(--admin-text-muted)" }}>
            {a?.buhalterijaTotal ?? "Total"}
          </p>
          <p className="font-semibold tabular-nums" style={{ color: "var(--admin-text)" }}>
            {money}
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-[10px] font-medium uppercase" style={{ color: "var(--admin-text-muted)" }}>
            {a?.buhalterijaPaidSummary ?? "Paid / due"}
          </p>
          <p className="tabular-nums" style={{ color: "var(--admin-text)" }}>
            {formatEur(paidTotal)} / {formatEur(Math.max(0, due))} ({row.currency})
          </p>
          {paymentSummary ? (
            <p className="text-[10px] mt-1" style={{ color: "var(--admin-text-muted)" }}>
              {(a?.buhalterijaPaymentTimeline ?? "Payments").toLowerCase()}: {paymentSummary.payment_count}{" "}
              {paymentSummary.last_payment_date
                ? `· ${a?.buhalterijaPaymentDate ?? "Last"}: ${paymentSummary.last_payment_date}`
                : null}
            </p>
          ) : null}
        </div>
        {row.status !== "draft" && row.status !== "cancelled" && due > 0 && row.due_date < localTodayISO() ? (
          <div className="sm:col-span-2 lg:col-span-4">
            <p
              className="text-xs font-medium rounded-md px-2 py-1 inline-block"
              style={{ background: "color-mix(in srgb, var(--admin-accent) 15%, transparent)", color: "var(--admin-text)" }}
            >
              {a?.buhalterijaStatusOverdueLt ?? "Overdue"} — {a?.buhalterijaDueDate ?? "Due"} {row.due_date}
            </p>
          </div>
        ) : null}
        {effectiveAfterCorrections != null ? (
          <div className="sm:col-span-2 lg:col-span-4 pt-2 border-t" style={{ borderColor: "var(--admin-border)" }}>
            <p className="text-[10px] font-medium uppercase" style={{ color: "var(--admin-text-muted)" }}>
              {a?.buhalterijaEffectiveTotalAfterCorrections ?? "Suma po susietų korekcijų"}
            </p>
            <p className="font-semibold tabular-nums" style={{ color: "var(--admin-text)" }}>
              {formatCurrencyAmount(effectiveAfterCorrections)}
            </p>
          </div>
        ) : null}
      </section>

      {row.status !== "draft" && row.status !== "cancelled" ? (
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-wrap gap-2">
            {canRegisterPayment ? (
              <button
                type="button"
                onClick={openPayModal}
                className="rounded-md px-4 py-2 text-sm font-medium text-white"
                style={{ background: "var(--admin-accent)" }}
              >
                {a?.buhalterijaRegisterPaymentLong ?? a?.buhalterijaRegisterPayment ?? "Register payment"}
              </button>
            ) : null}
            {canCancel ? (
              <button
                type="button"
                disabled={cancelBusy}
                onClick={() => void cancelInvoice()}
                className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ borderColor: "var(--admin-border)", color: "var(--admin-text-muted)" }}
              >
                {cancelBusy ? <Loader2 className="h-4 w-4 animate-spin inline" /> : null}{" "}
                {a?.buhalterijaCancelInvoice ?? "Cancel"}
              </button>
            ) : null}
          </div>
          {canOfferCorrections ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => openCorrection("decrease")}
                  className="rounded-md border px-4 py-2 text-sm font-medium text-left"
                  style={{ borderColor: "var(--admin-border)", color: "var(--admin-text)" }}
                  title={
                    a?.buhalterijaCorrectionDecreaseTooltip ??
                    "Naudokite, kai po išrašymo reikia sumažinti kliento mokėtiną sumą: nuolaida, atsisakyta dalies darbų, korekcija žemyn."
                  }
                >
                  {a?.buhalterijaCorrectionDecreaseAction ?? "Sumažinti sąskaitos sumą"}
                </button>
                <span className="text-[10px] px-0.5" style={{ color: "var(--admin-text-muted)" }}>
                  {a?.buhalterijaCorrectionCreatesCredit ?? "Sukuria kreditinę sąskaitą"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => openCorrection("increase")}
                  className="rounded-md border px-4 py-2 text-sm font-medium text-left"
                  style={{ borderColor: "var(--admin-border)", color: "var(--admin-text)" }}
                  title={
                    a?.buhalterijaCorrectionIncreaseTooltip ??
                    "Naudokite, kai po išrašymo reikia padidinti kliento mokėtiną sumą: papildomi darbai, korekcija aukštyn."
                  }
                >
                  {a?.buhalterijaCorrectionIncreaseAction ?? "Padidinti sąskaitos sumą"}
                </button>
                <span className="text-[10px] px-0.5" style={{ color: "var(--admin-text-muted)" }}>
                  {a?.buhalterijaCorrectionCreatesDebit ?? "Sukuria debetinę sąskaitą"}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <InvoiceCorrectionDialog
        open={correctionOpen}
        mode={correctionMode}
        onClose={() => {
          setCorrectionOpen(false);
          setCorrectionMode(null);
        }}
        original={
          row
            ? {
                id: row.id,
                invoice_number: row.invoice_number,
                buyer_name: row.buyer_name,
                total: invoiceTotal,
                currency: row.currency,
                paidTotal,
                due,
              }
            : null
        }
        onCreated={(draftId) => {
          void router.push(`/admin/buhalterija/saskaitos/${draftId}/redaguoti`);
        }}
      />

      {!isCorrectionDocumentType(row.document_type) && row.status !== "draft" && row.status !== "cancelled" ? (
        <section className="rounded-lg border p-4 space-y-3" style={{ borderColor: "var(--admin-border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
            {a?.buhalterijaCorrectionsHistory ?? "Korekcijų istorija"}
          </h2>
          {corrections.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
              —
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {corrections.map((c) => {
                const amt =
                  c.correction_amount != null && Number.isFinite(Number(c.correction_amount))
                    ? Number(c.correction_amount)
                    : Number(c.total) || 0;
                const signed = correctionSignedDelta(c.document_type, amt);
                const reason = (c.correction_reason ?? c.line_items[0]?.description ?? "").trim() || "—";
                const when = c.issue_date || (c.created_at ? String(c.created_at).slice(0, 10) : "—");
                return (
                  <li
                    key={c.id}
                    className="border-b pb-3 last:border-0 space-y-1"
                    style={{ borderColor: "var(--admin-border)" }}
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="tabular-nums text-xs">{when}</span>
                      <span
                        className="font-medium tabular-nums"
                        style={{ color: signed < 0 ? "#b45309" : "#047857" }}
                      >
                        {signed > 0 ? "+" : ""}
                        {formatCurrencyAmount(signed)}
                      </span>
                    </div>
                    <p className="font-medium" style={{ color: "var(--admin-text)" }}>
                      {humanCorrectionPrimaryLabelLt(c.document_type)}
                      <span className="block text-[10px] font-normal" style={{ color: "var(--admin-text-muted)" }}>
                        {DOCUMENT_TYPE_LABEL_LT[c.document_type]}
                      </span>
                    </p>
                    <p className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                      {reason}
                    </p>
                    <Link
                      href={`/admin/buhalterija/saskaitos/${c.id}`}
                      className="text-xs font-medium hover:underline inline-block"
                      style={{ color: "var(--admin-accent)" }}
                    >
                      {c.invoice_number}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {payOpen ? (
        <div
          className="rounded-lg border p-4 space-y-3 max-w-lg"
          style={{ borderColor: "var(--admin-border)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
            {a?.buhalterijaRegisterPaymentLong ?? a?.buhalterijaRegisterPayment ?? "Register payment"}
          </h2>
          <p className="text-[10px]" style={{ color: "var(--admin-text-muted)" }}>
            {a?.buhalterijaDefaultPayAmountHint ?? ""} · {a?.buhalterijaAmountDue ?? "Due"}: {formatEur(Math.max(0, due))}
          </p>
          <div>
            <label className="block text-[10px] mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {a?.buhalterijaPaymentDate ?? "Date"}
            </label>
            <input
              type="date"
              className="w-full rounded border px-3 py-2 text-sm"
              style={{ borderColor: "var(--admin-border)", background: "var(--admin-bg-elevated)" }}
              value={payForm.payment_date}
              onChange={(e) => setPayForm((p) => ({ ...p, payment_date: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[10px] mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {a?.buhalterijaAmount ?? "Amount"}
            </label>
            <input
              type="number"
              min={0.01}
              step="0.01"
              className="w-full rounded border px-3 py-2 text-sm tabular-nums text-right"
              style={{ borderColor: "var(--admin-border)", background: "var(--admin-bg-elevated)" }}
              value={payForm.amount}
              onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[10px] mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {a?.buhalterijaReference ?? "Reference"}
            </label>
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              style={{ borderColor: "var(--admin-border)", background: "var(--admin-bg-elevated)" }}
              value={payForm.reference}
              onChange={(e) => setPayForm((p) => ({ ...p, reference: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[10px] mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {a?.buhalterijaPaymentNote ?? "Note"}
            </label>
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              style={{ borderColor: "var(--admin-border)", background: "var(--admin-bg-elevated)" }}
              value={payForm.note}
              onChange={(e) => setPayForm((p) => ({ ...p, note: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[10px] mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {a?.buhalterijaPaymentAttachment ?? "Attachment"}
            </label>
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg"
              className="w-full text-xs file:mr-2 file:rounded file:border file:px-2 file:py-1"
              style={{ color: "var(--admin-text)" }}
              onChange={(e) => setPayAttachment(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={payBusy}
              onClick={() => void submitPayment()}
              className="rounded-md px-4 py-2 text-sm text-white disabled:opacity-50"
              style={{ background: "var(--admin-accent)" }}
            >
              {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "OK"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPayOpen(false);
                setPayAttachment(null);
              }}
              className="rounded-md border px-4 py-2 text-sm"
              style={{ borderColor: "var(--admin-border)" }}
            >
              Atšaukti
            </button>
          </div>
        </div>
      ) : null}

      <section className="rounded-lg border p-4 space-y-3" style={{ borderColor: "var(--admin-border)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
          {a?.buhalterijaPaymentsSection ?? a?.buhalterijaPayments ?? "Payments"}
        </h2>
        {paymentSummary ? (
          <div className="grid gap-2 sm:grid-cols-3 text-xs" style={{ color: "var(--admin-text-muted)" }}>
            <div>
              <span className="block uppercase text-[10px]">{a?.buhalterijaTotal ?? "Total"}</span>
              <span className="font-medium tabular-nums text-sm" style={{ color: "var(--admin-text)" }}>
                {money}
              </span>
            </div>
            <div>
              <span className="block uppercase text-[10px]">{a?.buhalterijaAmountPaid ?? "Paid"}</span>
              <span className="font-medium tabular-nums text-sm" style={{ color: "var(--admin-text)" }}>
                {formatEur(paymentSummary.amount_paid)}
              </span>
            </div>
            <div>
              <span className="block uppercase text-[10px]">{a?.buhalterijaAmountDue ?? "Due"}</span>
              <span className="font-medium tabular-nums text-sm" style={{ color: "var(--admin-text)" }}>
                {formatEur(Math.max(0, paymentSummary.amount_due))}
              </span>
            </div>
          </div>
        ) : null}
        <h3 className="text-xs font-medium" style={{ color: "var(--admin-text-muted)" }}>
          {a?.buhalterijaPaymentTimeline ?? "History"}
        </h3>
        {payments.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
            —
          </p>
        ) : (
          <ul className="space-y-3 text-sm">
            {payments.map((p) => (
              <li
                key={p.id}
                className="border-b pb-3 last:border-0 space-y-1"
                style={{ borderColor: "var(--admin-border)" }}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="tabular-nums">{p.payment_date}</span>
                  <span className="font-medium tabular-nums">{formatEur(Number(p.amount))}</span>
                </div>
                <div className="text-[10px]" style={{ color: "var(--admin-text-muted)" }}>
                  {(a?.buhalterijaPaymentMethod ?? "Method")}: {p.method}
                  {p.currency ? ` · ${p.currency}` : ""}
                </div>
                {p.reference ? (
                  <p className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                    {p.reference}
                  </p>
                ) : null}
                {p.note ? (
                  <p className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                    {p.note}
                  </p>
                ) : null}
                {p.attachment_storage_path ? (
                  <button
                    type="button"
                    onClick={() => void openPaymentAttachment(p.attachment_storage_path ?? null)}
                    className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                    style={{ color: "var(--admin-accent)" }}
                  >
                    <Paperclip className="h-3 w-3" />
                    {a?.buhalterijaOpenAttachment ?? "Attachment"}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {row.status === "draft" ? (
        <div className="space-y-2">
          {buyerIdentificationIncompleteForDisplay(rowToPayload(row)) ? (
            <p
              className="text-xs font-medium rounded-md px-3 py-2 border inline-flex items-center gap-2"
              style={{
                borderColor: "color-mix(in srgb, #f59e0b 45%, var(--admin-border))",
                color: "#b45309",
                background: "color-mix(in srgb, #fffbeb 85%, var(--admin-bg))",
              }}
            >
              {a?.buhalterijaBuyerIdentificationWarning ?? "Trūksta privalomų pirkėjo identifikacijos duomenų (B2B)."}
            </p>
          ) : null}
          <p className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
            {a?.buhalterijaNotDraftHint ?? ""}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border p-4 opacity-95" style={{ borderColor: "var(--admin-border)" }}>
          <p className="text-xs font-medium mb-2" style={{ color: "var(--admin-text-muted)" }}>
            Išrašyto dokumento duomenys (tik skaitymui)
          </p>
          {buyerIdentificationIncompleteForDisplay(rowToPayload(row)) ? (
            <p
              className="text-xs font-medium rounded-md px-3 py-2 border mb-3"
              style={{
                borderColor: "color-mix(in srgb, #f59e0b 45%, var(--admin-border))",
                color: "#b45309",
                background: "color-mix(in srgb, #fffbeb 85%, var(--admin-bg))",
              }}
            >
              {a?.buhalterijaBuyerIdentificationWarning ?? "Trūksta privalomų pirkėjo identifikacijos duomenų (B2B)."}
            </p>
          ) : null}
          <InvoiceEditorForm value={rowToPayload(row)} onChange={() => {}} readOnly taxSettings={null} />
        </div>
      )}
    </div>
  );
}

export default function SaskaitaDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--admin-accent)" }} />
        </div>
      }
    >
      <SaskaitaDetailPageInner />
    </Suspense>
  );
}
