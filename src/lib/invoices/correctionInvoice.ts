import type { DocumentType } from "./documentTypes";
import { isCorrectionDocumentType } from "./documentTypes";
import type { AdminInvoiceRow } from "./types";

export type CorrectionDocumentType = "credit_note" | "debit_note";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Signed delta to apply to the original total (credits negative, debits positive). */
export function correctionSignedDelta(documentType: DocumentType, amount: number): number {
  const a = Math.abs(Number(amount) || 0);
  if (documentType === "credit_note") return -a;
  if (documentType === "debit_note") return a;
  return 0;
}

export function humanCorrectionPrimaryLabelLt(documentType: DocumentType): string {
  if (documentType === "credit_note") return "Sumažinanti korekcija";
  if (documentType === "debit_note") return "Didinanti korekcija";
  return "";
}

export function humanCorrectionWithAccountingLt(documentType: DocumentType): string {
  if (documentType === "credit_note") return "Sumažinanti korekcija (kreditinė sąskaita)";
  if (documentType === "debit_note") return "Didinanti korekcija (debetinė sąskaita)";
  return "";
}

export type CorrectionDraftRequest = {
  original_invoice_id: string;
  correction_type: CorrectionDocumentType;
  correction_reason: string;
  correction_amount: number;
  correction_date: string;
  note?: string;
};

export function parseCorrectionDraftBody(
  body: unknown
): { ok: true; data: CorrectionDraftRequest } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "invalid_body" };
  const b = body as Record<string, unknown>;

  const oid = typeof b.original_invoice_id === "string" ? b.original_invoice_id.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(oid)) return { ok: false, error: "original_invoice_id_invalid" };

  const ct = b.correction_type;
  if (ct !== "credit_note" && ct !== "debit_note") {
    return { ok: false, error: "correction_type_invalid" };
  }

  const reason = typeof b.correction_reason === "string" ? b.correction_reason.trim() : "";
  if (!reason) return { ok: false, error: "correction_reason_required" };

  const amt = Number(b.correction_amount);
  if (!Number.isFinite(amt) || amt <= 0) return { ok: false, error: "correction_amount_invalid" };

  const cdate = typeof b.correction_date === "string" ? b.correction_date.trim() : "";
  if (!ISO_DATE.test(cdate)) return { ok: false, error: "correction_date_invalid" };

  const note = typeof b.note === "string" ? b.note.trim() : "";
  return {
    ok: true,
    data: {
      original_invoice_id: oid,
      correction_type: ct,
      correction_reason: reason,
      correction_amount: Math.round(amt * 100) / 100,
      correction_date: cdate,
      ...(note ? { note } : {}),
    },
  };
}

/** Issued, non-cancelled invoices may receive correction documents. Drafts should be edited directly. */
export function canCreateCorrectionFromInvoice(row: Pick<AdminInvoiceRow, "issued_at" | "status" | "cancelled_at">): boolean {
  if (!row.issued_at) return false;
  if (row.status === "draft" || row.status === "cancelled") return false;
  if (row.cancelled_at) return false;
  return true;
}

export function assertCorrectionPayloadLinked(data: {
  document_type: DocumentType;
  related_invoice_id?: string;
}): { ok: true } | { ok: false; error: string } {
  if (isCorrectionDocumentType(data.document_type) && !data.related_invoice_id?.trim()) {
    return { ok: false, error: "correction_requires_original_invoice" };
  }
  return { ok: true };
}

export function effectiveTotalAfterCorrections(
  originalTotal: number,
  corrections: Pick<AdminInvoiceRow, "document_type" | "correction_amount" | "total">[]
): number {
  let t = Math.round(Number(originalTotal) * 100) / 100;
  for (const c of corrections) {
    const amt =
      c.correction_amount != null && Number.isFinite(Number(c.correction_amount))
        ? Number(c.correction_amount)
        : Number(c.total) || 0;
    t += correctionSignedDelta(c.document_type, amt);
    t = Math.round(t * 100) / 100;
  }
  return t;
}
