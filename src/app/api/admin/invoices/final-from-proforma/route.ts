import { NextRequest, NextResponse } from "next/server";
import { localTodayISO } from "@/lib/adminFormat";
import { addDaysToISODate } from "@/lib/invoices/dateIso";
import { buildDraftUpsertRow, invoiceTotals } from "@/lib/invoices/draftRow";
import { makeDraftInvoiceNumber } from "@/lib/invoices/invoiceNumbering";
import {
  applyIssuedPartySnapshotsFromRow,
  canCreateFinalSalesInvoiceFromProforma,
  parseFinalFromProformaBody,
} from "@/lib/invoices/proformaFinalInvoice";
import { getSupabaseUserFromRequest } from "@/lib/invoices/supabaseUserFromRequest";
import { assertVatInvoiceAllowed, ensureCompanyTaxSettings } from "@/lib/invoices/taxSettingsServer";
import type { AdminInvoiceRow, InvoiceLineItem, InvoicePayload } from "@/lib/invoices/types";
import { rowToPayload, syncDisplayFieldsFromDocumentType } from "@/lib/invoices/types";

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

  const parsed = parseFinalFromProformaBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { user, supabase } = auth;
  const proformaId = parsed.proforma_invoice_id;

  const { data: proformaRow, error: qErr } = await supabase
    .from("admin_invoices")
    .select("*")
    .eq("id", proformaId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (qErr || !proformaRow) {
    return NextResponse.json({ error: "proforma_not_found" }, { status: 404 });
  }

  const proforma = proformaRow as AdminInvoiceRow;
  if (!canCreateFinalSalesInvoiceFromProforma(proforma)) {
    return NextResponse.json({ error: "proforma_not_eligible_for_final" }, { status: 400 });
  }

  const { data: existingFinal, error: exErr } = await supabase
    .from("admin_invoices")
    .select("id,invoice_number")
    .eq("source_proforma_id", proformaId)
    .eq("document_type", "sales_invoice")
    .neq("status", "cancelled")
    .maybeSingle();

  if (exErr) {
    if (process.env.NODE_ENV === "development") console.error(exErr);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  if (existingFinal) {
    return NextResponse.json(
      {
        error: "final_sales_invoice_exists",
        existing_id: (existingFinal as { id: string }).id,
        existing_invoice_number: (existingFinal as { invoice_number: string }).invoice_number,
      },
      { status: 409 }
    );
  }

  try {
    const settings = await ensureCompanyTaxSettings(supabase, user.id);
    assertVatInvoiceAllowed(settings, "sales_invoice");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "vat_invoice_disabled") {
      return NextResponse.json({ error: "vat_invoice_disabled" }, { status: 400 });
    }
    if (process.env.NODE_ENV === "development") console.error(e);
    return NextResponse.json({ error: "settings_error" }, { status: 500 });
  }

  const base = applyIssuedPartySnapshotsFromRow(proforma, rowToPayload(proforma));
  const issue = localTodayISO();
  const lineCopy = JSON.parse(JSON.stringify(proforma.line_items)) as InvoiceLineItem[];

  const notesParts = [base.notes?.trim(), `Galutinė sąskaita pagal išankstinę ${proforma.invoice_number}.`].filter(
    Boolean
  );

  let data: InvoicePayload = {
    ...base,
    id: undefined,
    document_type: "sales_invoice",
    invoice_number: makeDraftInvoiceNumber(),
    issue_date: issue,
    due_date: addDaysToISODate(issue, 7),
    source_proforma_id: proforma.id,
    related_invoice_id: undefined,
    correction_original_total_snapshot: undefined,
    line_items: lineCopy,
    notes: notesParts.join("\n\n"),
  };
  data = syncDisplayFieldsFromDocumentType(data);

  const nowIso = new Date().toISOString();

  const insertRow = {
    ...buildDraftUpsertRow(user.id, data, {}),
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
    if (insErr?.code === "23505") {
      return NextResponse.json({ error: "final_sales_invoice_exists" }, { status: 409 });
    }
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
