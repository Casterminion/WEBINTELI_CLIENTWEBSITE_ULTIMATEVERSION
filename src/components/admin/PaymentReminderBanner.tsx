"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatEur } from "@/lib/adminFormat";
import type { PendingPaymentReminderDto } from "@/lib/invoices/paymentReminderTypes";
import type { InvoiceStatus } from "@/lib/invoices/invoiceStatus";

function statusLt(status: InvoiceStatus, labels: Record<string, string | undefined>): string {
  const m: Record<InvoiceStatus, string> = {
    draft: labels.buhalterijaStatusDraft ?? "Juodraštis",
    issued: labels.buhalterijaStatusWaitingPayment ?? "Laukia apmokėjimo",
    partially_paid: labels.buhalterijaStatusPartiallyPaid ?? "Iš dalies apmokėta",
    paid: labels.buhalterijaStatusPaidFull ?? "Apmokėta",
    overdue: labels.buhalterijaStatusOverdueLt ?? "Pradelsta",
    cancelled: labels.buhalterijaStatusCancelled ?? "Anuliuota",
  };
  return m[status] ?? status;
}

export default function PaymentReminderBanner() {
  const { t } = useLanguage();
  const a = t.admin ?? {};
  const [items, setItems] = useState<PendingPaymentReminderDto[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setItems([]);
      setLoaded(true);
      return;
    }
    const res = await fetch("/api/admin/invoices/payment-reminders/pending", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const j = (await res.json().catch(() => null)) as { reminders?: PendingPaymentReminderDto[] } | null;
    if (!res.ok || !j?.reminders) {
      setItems([]);
      setLoaded(true);
      return;
    }
    setItems(j.reminders);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const recordPrompt = useCallback(async (invoiceId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    await fetch("/api/admin/invoices/payment-reminders/record-prompt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ invoice_id: invoiceId }),
    });
  }, []);

  const first = items[0];

  useEffect(() => {
    if (!first?.invoice_id) return;
    void recordPrompt(first.invoice_id);
  }, [first?.invoice_id, recordPrompt]);

  const followUp = async (invoiceId: string, action: "not_received" | "tomorrow") => {
    setBusy(`${invoiceId}:${action}`);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`/api/admin/invoices/${invoiceId}/payment-follow-up`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action }),
      });
      if (res.ok) await load();
    } finally {
      setBusy(null);
    }
  };

  if (!loaded || items.length === 0 || !first) return null;

  const title = (a.buhalterijaPaymentReminderTitle ?? "Ar gautas pavedimas už sąskaitą {n}?").replace(
    "{n}",
    first.invoice_number
  );

  return (
    <div
      className="mb-4 rounded-lg border p-4 space-y-3"
      style={{
        borderColor: "var(--admin-accent)",
        background: "color-mix(in srgb, var(--admin-accent) 12%, var(--admin-bg-elevated))",
      }}
      role="status"
    >
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
          {title}
        </p>
        <p className="mt-2 text-xs space-y-1" style={{ color: "var(--admin-text-muted)" }}>
          <span className="block">
            <strong style={{ color: "var(--admin-text)" }}>{first.buyer_name}</strong>
          </span>
          <span className="block tabular-nums">
            {(a.buhalterijaTotal ?? "Viso")}: {formatEur(first.total)} {first.currency} ·{" "}
            {(a.buhalterijaAmountDue ?? "Likusi suma")}: {formatEur(first.amount_due)} {first.currency}
          </span>
          <span className="block tabular-nums">
            {(a.buhalterijaAmountPaid ?? "Sumokėta")}: {formatEur(first.amount_paid)} {first.currency} ·{" "}
            {(a.buhalterijaDueDate ?? "Terminas")}: {first.due_date}
          </span>
          <span className="block">
            {(a.buhalterijaStatus ?? "Būsena")}: {statusLt(first.status, a as Record<string, string | undefined>)}
          </span>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void followUp(first.invoice_id, "not_received")}
          className="rounded-md border px-3 py-2 text-xs font-medium disabled:opacity-50"
          style={{ borderColor: "var(--admin-border)", color: "var(--admin-text)" }}
        >
          {a.buhalterijaReminderNotReceived ?? "Dar negautas"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void followUp(first.invoice_id, "tomorrow")}
          className="rounded-md border px-3 py-2 text-xs font-medium disabled:opacity-50"
          style={{ borderColor: "var(--admin-border)", color: "var(--admin-text)" }}
        >
          {a.buhalterijaReminderTomorrow ?? "Priminti rytoj"}
        </button>
        <Link
          href={`/admin/buhalterija/saskaitos/${first.invoice_id}?registerPayment=1`}
          className="inline-flex items-center rounded-md px-3 py-2 text-xs font-medium text-white"
          style={{ background: "var(--admin-accent)" }}
        >
          {a.buhalterijaMarkPaidOpen ?? "Pažymėti apmokėta"}
        </Link>
      </div>
      {items.length > 1 ? (
        <p className="text-[10px]" style={{ color: "var(--admin-text-muted)" }}>
          +{items.length - 1}{" "}
          {(a.buhalterijaMoreRemindersQueued ?? "kitos sąskaitos laukia patvirtinimo")}
        </p>
      ) : null}
    </div>
  );
}
