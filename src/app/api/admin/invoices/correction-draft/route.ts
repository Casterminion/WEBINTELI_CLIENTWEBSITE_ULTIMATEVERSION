import { NextRequest, NextResponse } from "next/server";
import { addDaysToISODate } from "@/lib/invoices/dateIso";
import {
  canCreateCorrectionFromInvoice,
  parseCorrectionDraftBody,
} from "@/lib/invoices/correctionInvoice";
import { buildDraftUpsertRow, invoiceTotals } from "@/lib/invoices/draftRow";
import { makeDraftInvoiceNumber } from "@/lib/invoices/invoiceNumbering";
import { getSupabaseUserFromRequest } from "@/lib/invoices/supabaseUserFromRequest";
import { assertVatInvoiceAllowed, ensureCompanyTaxSettings } from "@/lib/invoices/taxSettingsServer";
import type { AdminInvoiceRow, InvoicePayload } from "@/lib/invoices/types";
import { computeInvoiceSubtotal, rowToPayload, syncDisplayFieldsFromDocumentType } from "@/lib/invoices/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await getSupabaseUserFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = parseCorrectionDraftBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { user, supabase } = auth;
  const req = parsed.data;

  const { data: original, error: qErr } = await supabase
    .from("admin_invoices")
    .select("*")
    .eq("id", req.original_invoice_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (qErr || !original) {
    return NextResponse.json({ error: "original_not_found" }, { status: 404 });
  }

  const orig = original as AdminInvoiceRow;
  if (!canCreateCorrectionFromInvoice(orig)) {
    return NextResponse.json({ error: "correction_original_not_issued" }, { status: 400 });
  }

  let coSettings: Awaited<ReturnType<typeof ensureCompanyTaxSettings>>;
  try {
    coSettings = await ensureCompanyTaxSettings(supabase, user.id);
    assertVatInvoiceAllowed(coSettings, req.correction_type);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "vat_invoice_disabled") {
      return NextResponse.json({ error: "vat_invoice_disabled" }, { status: 400 });
    }
    if (process.env.NODE_ENV === "development") console.error(e);
    return NextResponse.json({ error: "settings_error" }, { status: 500 });
  }

  const base = rowToPayload(orig);
  const originalTotal =
    orig.total != null && Number.isFinite(Number(orig.total))
      ? Math.round(Number(orig.total) * 100) / 100
      : computeInvoiceSubtotal(orig.line_items);

  const noteExtra = req.note ? `\n\n${req.note}` : "";
  const notesCore = orig.notes?.trim() || coSettings.default_invoice_notes?.trim() || "";

  let data: InvoicePayload = {
    ...base,
    id: undefined,
    document_type: req.correction_type,
    issue_date: req.correction_date,
    service_date: req.correction_date,
    service_period_from: "",
    service_period_to: "",
    due_date: addDaysToISODate(req.correction_date, coSettings.default_payment_term_days ?? 7),
    related_invoice_id: orig.id,
    correction_original_total_snapshot: originalTotal,
    line_items: [
      {
        description: req.correction_reason,
        quantity: 1,
        unit: "vnt.",
        unit_price: req.correction_amount,
        line_total: req.correction_amount,
      },
    ],
    notes: `${notesCore}${noteExtra}`,
  };
  data = syncDisplayFieldsFromDocumentType({
    ...data,
    invoice_number: makeDraftInvoiceNumber(),
  });

  const nowIso = new Date().toISOString();

  const insertRow = {
    ...buildDraftUpsertRow(user.id, data, { correctionOriginalTotalSnapshot: originalTotal }),
    pdf_storage_path: null,
    created_at: nowIso,
  };

  const { data: ins, error: insErr } = await supabase
    .from("admin_invoices")
    .insert(insertRow)
    .select("id,invoice_number,status")
    .single();

  if (insErr || !ins) {
    if (process.env.NODE_ENV === "development") console.error(insErr);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const totals = invoiceTotals(data);
  return NextResponse.json({
    id: (ins as { id: string }).id,
    invoice_number: (ins as { invoice_number: string }).invoice_number,
    status: (ins as { status: string }).status,
    subtotal: totals.subtotal,
    total: totals.total,
  });
}
