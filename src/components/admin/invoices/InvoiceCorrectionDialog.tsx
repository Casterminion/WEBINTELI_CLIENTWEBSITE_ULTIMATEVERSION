"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { formatEur } from "@/lib/adminFormat";
import type { CorrectionDocumentType } from "@/lib/invoices/correctionInvoice";

type Mode = "decrease" | "increase";

export type InvoiceCorrectionDialogOriginal = {
  id: string;
  invoice_number: string;
  buyer_name: string;
  total: number;
  currency: string;
  paidTotal: number;
  due: number;
};

type Props = {
  open: boolean;
  mode: Mode | null;
  onClose: () => void;
  original: InvoiceCorrectionDialogOriginal | null;
  onCreated: (draftId: string) => void;
};

export function InvoiceCorrectionDialog({ open, mode, onClose, original, onCreated }: Props) {
  const { t, locale } = useLanguage();
  const a = t.admin as Record<string, string | undefined>;

  const lab = useCallback((key: string, fallback: string) => a[key] ?? fallback, [a]);

  const [step, setStep] = useState<"form" | "confirm">("form");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [cdate, setCdate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("form");
    setReason("");
    setAmount("");
    setNote("");
    setErr(null);
    const today = new Date().toISOString().slice(0, 10);
    setCdate(today);
  }, [open, mode]);

  const correctionType: CorrectionDocumentType | null =
    mode === "decrease" ? "credit_note" : mode === "increase" ? "debit_note" : null;

  const amountNum = useMemo(() => {
    const n = parseFloat(amount.replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  }, [amount]);

  const initialTotal = original?.total ?? 0;
  const deltaPreview = useMemo(() => {
    if (!correctionType || !Number.isFinite(amountNum) || amountNum <= 0) return 0;
    return correctionType === "credit_note" ? -amountNum : amountNum;
  }, [correctionType, amountNum]);

  const newTotalPreview = useMemo(() => {
    return Math.round((initialTotal + deltaPreview) * 100) / 100;
  }, [initialTotal, deltaPreview]);

  const money = useCallback(
    (n: number) =>
      original?.currency === "EUR"
        ? formatEur(n)
        : new Intl.NumberFormat(locale === "lt" ? "lt-LT" : "en-GB", {
            style: "currency",
            currency: original?.currency ?? "EUR",
          }).format(n),
    [original?.currency, locale]
  );

  const goConfirm = () => {
    setErr(null);
    if (!reason.trim()) {
      setErr(lab("buhalterijaCorrectionReasonRequired", "Įveskite korekcijos priežastį"));
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setErr(lab("buhalterijaCorrectionAmountInvalid", "Korekcijos suma turi būti didesnė už 0"));
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cdate)) {
      setErr(lab("buhalterijaCorrectionDateInvalid", "Neteisinga data"));
      return;
    }
    setStep("confirm");
  };

  const submit = async () => {
    if (!original || !correctionType) return;
    setBusy(true);
    setErr(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setErr("Unauthorized");
        return;
      }
      const res = await fetch("/api/admin/invoices/correction-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          original_invoice_id: original.id,
          correction_type: correctionType,
          correction_reason: reason.trim(),
          correction_amount: amountNum,
          correction_date: cdate,
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      });
      const j = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!res.ok || !j?.id) {
        setErr(j?.error ?? `Error ${res.status}`);
        return;
      }
      onCreated(j.id);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  if (!open || !mode || !original || !correctionType) return null;

  const confirmTitle =
    mode === "decrease"
      ? lab("buhalterijaCorrectionConfirmDecreaseTitle", "Patvirtinti sumos sumažinimą?")
      : lab("buhalterijaCorrectionConfirmIncreaseTitle", "Patvirtinti sumos padidinimą?");

  const confirmBody = (
    mode === "decrease"
      ? lab(
          "buhalterijaCorrectionConfirmDecreaseBody",
          "Bus sukurta mažinanti korekcija (kreditinė sąskaita) susieta su sąskaita {n}."
        )
      : lab(
          "buhalterijaCorrectionConfirmIncreaseBody",
          "Bus sukurta didinanti korekcija (debetinė sąskaita) susieta su sąskaita {n}."
        )
  ).replace("{n}", original.invoice_number);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "color-mix(in srgb, #000 45%, transparent)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="correction-dialog-title"
    >
      <div
        className="w-full max-w-lg rounded-xl border shadow-lg max-h-[90vh] overflow-y-auto"
        style={{ borderColor: "var(--admin-border)", background: "var(--admin-bg-elevated)" }}
      >
        <div className="p-5 space-y-4">
          <h2 id="correction-dialog-title" className="text-base font-semibold" style={{ color: "var(--admin-text)" }}>
            {step === "form"
              ? mode === "decrease"
                ? lab("buhalterijaCorrectionDecreaseTitle", "Sumažinti sąskaitos sumą")
                : lab("buhalterijaCorrectionIncreaseTitle", "Padidinti sąskaitos sumą")
              : confirmTitle}
          </h2>

          {step === "form" ? (
            <>
              <p className="text-[10px] leading-relaxed" style={{ color: "var(--admin-text-muted)" }}>
                {mode === "decrease"
                  ? lab(
                      "buhalterijaCorrectionDecreaseHelper",
                      "Sumažinanti korekcija (kreditinė sąskaita). Sukuria kreditinę sąskaitą."
                    )
                  : lab(
                      "buhalterijaCorrectionIncreaseHelper",
                      "Didinanti korekcija (debetinė sąskaita). Sukuria debetinę sąskaitą."
                    )}
              </p>
              <p className="text-[10px]" style={{ color: "var(--admin-text-muted)" }}>
                {mode === "decrease"
                  ? lab(
                      "buhalterijaCorrectionDecreaseTooltip",
                      "Naudokite, kai po išrašymo reikia sumažinti kliento mokėtiną sumą: nuolaida, atsisakyta dalies darbų, korekcija žemyn."
                    )
                  : lab(
                      "buhalterijaCorrectionIncreaseTooltip",
                      "Naudokite, kai po išrašymo reikia padidinti kliento mokėtiną sumą: papildomi darbai, korekcija aukštyn."
                    )}
              </p>

              <div className="rounded-md border p-3 text-xs space-y-1" style={{ borderColor: "var(--admin-border)" }}>
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--admin-text-muted)" }}>{lab("buhalterijaInvoiceNumber", "Nr.")}</span>
                  <span className="font-medium" style={{ color: "var(--admin-text)" }}>
                    {original.invoice_number}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--admin-text-muted)" }}>{lab("buhalterijaBuyer", "Pirkėjas")}</span>
                  <span style={{ color: "var(--admin-text)" }}>{original.buyer_name}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--admin-text-muted)" }}>{lab("buhalterijaTotal", "Suma")}</span>
                  <span className="font-medium tabular-nums">{money(original.total)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--admin-text-muted)" }}>{lab("buhalterijaAmountPaid", "Sumokėta")}</span>
                  <span className="tabular-nums">{money(original.paidTotal)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--admin-text-muted)" }}>{lab("buhalterijaAmountDue", "Liko")}</span>
                  <span className="tabular-nums">{money(Math.max(0, original.due))}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                  {lab("buhalterijaCorrectionReason", "Korekcijos priežastis")}
                </label>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm min-h-[72px]"
                  style={{ borderColor: "var(--admin-border)", background: "var(--admin-bg)" }}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                  {lab("buhalterijaCorrectionAmount", "Korekcijos suma")}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full rounded-md border px-3 py-2 text-sm tabular-nums text-right"
                  style={{ borderColor: "var(--admin-border)", background: "var(--admin-bg)" }}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                  {lab("buhalterijaCorrectionDate", "Korekcijos data")}
                </label>
                <input
                  type="date"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--admin-border)", background: "var(--admin-bg)" }}
                  value={cdate}
                  onChange={(e) => setCdate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                  {lab("buhalterijaCorrectionNoteOptional", "Pastaba")}
                </label>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--admin-border)", background: "var(--admin-bg)" }}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="rounded-md border p-3 text-xs space-y-1" style={{ borderColor: "var(--admin-border)" }}>
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--admin-text-muted)" }}>
                    {lab("buhalterijaCorrectionPreviewInitial", "Pradinė suma")}
                  </span>
                  <span className="tabular-nums">{money(initialTotal)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--admin-text-muted)" }}>{lab("buhalterijaCorrectionPreviewDelta", "Korekcija")}</span>
                  <span className="tabular-nums" style={{ color: deltaPreview < 0 ? "#b45309" : "#047857" }}>
                    {deltaPreview > 0 ? "+" : ""}
                    {money(deltaPreview)}
                  </span>
                </div>
                <div className="flex justify-between gap-2 font-medium">
                  <span style={{ color: "var(--admin-text-muted)" }}>
                    {lab("buhalterijaCorrectionPreviewNewTotal", "Nauja suma po korekcijos")}
                  </span>
                  <span className="tabular-nums">{money(newTotalPreview)}</span>
                </div>
              </div>

              {err ? (
                <p className="text-xs" style={{ color: "var(--admin-accent)" }}>
                  {err}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border px-4 py-2 text-sm"
                  style={{ borderColor: "var(--admin-border)" }}
                >
                  {lab("buhalterijaCorrectionCancel", "Atšaukti")}
                </button>
                <button
                  type="button"
                  onClick={goConfirm}
                  className="rounded-md px-4 py-2 text-sm text-white"
                  style={{ background: "var(--admin-accent)" }}
                >
                  {lab("buhalterijaCorrectionNext", "Toliau")}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm" style={{ color: "var(--admin-text)" }}>
                {confirmBody}
              </p>
              <p
                className="text-xs font-medium rounded-md px-3 py-2 border"
                style={{
                  borderColor: "color-mix(in srgb, var(--admin-accent) 35%, var(--admin-border))",
                  color: "#b91c1c",
                  background: "color-mix(in srgb, #fef2f2 80%, var(--admin-bg))",
                }}
              >
                {lab(
                  "buhalterijaCorrectionStandaloneWarning",
                  "Tai nėra nauja savarankiška sąskaita. Tai esamos sąskaitos korekcijos dokumentas."
                )}
              </p>
              {err ? (
                <p className="text-xs" style={{ color: "var(--admin-accent)" }}>
                  {err}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="rounded-md border px-4 py-2 text-sm"
                  style={{ borderColor: "var(--admin-border)" }}
                >
                  {lab("buhalterijaCorrectionBack", "Atgal")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void submit()}
                  className="rounded-md px-4 py-2 text-sm text-white disabled:opacity-50 inline-flex items-center gap-2"
                  style={{ background: "var(--admin-accent)" }}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {lab("buhalterijaCorrectionConfirmCreate", "Sukurti juodraštį")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
