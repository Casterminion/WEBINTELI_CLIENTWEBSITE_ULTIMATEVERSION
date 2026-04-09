import { NextRequest, NextResponse } from "next/server";
import { makeDraftInvoiceNumber } from "@/lib/invoices/invoiceNumbering";
import { parseInvoicePayload } from "@/lib/invoices/parsePayload";
import { getSupabaseUserFromRequest } from "@/lib/invoices/supabaseUserFromRequest";
import { assertVatInvoiceAllowed, ensureCompanyTaxSettings } from "@/lib/invoices/taxSettingsServer";
import { buildDraftUpsertRow, invoiceTotals } from "@/lib/invoices/draftRow";
import type { InvoicePayload } from "@/lib/invoices/types";
import { syncDisplayFieldsFromDocumentType } from "@/lib/invoices/types";

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

  const parsed = parseInvoicePayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { user, supabase } = auth;

  try {
    const settings = await ensureCompanyTaxSettings(supabase, user.id);
    assertVatInvoiceAllowed(settings, parsed.data.document_type);

  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "vat_invoice_disabled") {
      return NextResponse.json({ error: "vat_invoice_disabled" }, { status: 400 });
    }
    if (process.env.NODE_ENV === "development") console.error(e);
    return NextResponse.json({ error: "settings_error" }, { status: 500 });
  }

  let data: InvoicePayload = { ...parsed.data };
  const nowIso = new Date().toISOString();

  if (!data.id) {
    data = {
      ...syncDisplayFieldsFromDocumentType({ ...data, invoice_number: makeDraftInvoiceNumber() }),
    };
  } else {
    const { data: existing, error: exErr } = await supabase
      .from("admin_invoices")
      .select("id,status,invoice_number,pdf_storage_path,document_type")
      .eq("id", data.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (exErr || !existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const row = existing as {
      status: string;
      invoice_number: string;
      pdf_storage_path: string | null;
      document_type: string;
    };
    if (row.status !== "draft") {
      return NextResponse.json({ error: "not_draft" }, { status: 400 });
    }
    data = {
      ...data,
      invoice_number: row.invoice_number,
    };
    if (row.document_type === "proforma_invoice") {
      data = { ...data, document_type: "proforma_invoice" };
    }
    data = syncDisplayFieldsFromDocumentType(data);
  }

  const baseRow = buildDraftUpsertRow(user.id, data, {});

  if (!data.id) {
    const insertRow = {
      ...baseRow,
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
    return NextResponse.json({
      id: (ins as { id: string }).id,
      invoice_number: (ins as { invoice_number: string }).invoice_number,
      status: (ins as { status: string }).status,
    });
  }

  const { error: upErr } = await supabase
    .from("admin_invoices")
    .update(baseRow)
    .eq("id", data.id)
    .eq("user_id", user.id)
    .eq("status", "draft");

  if (upErr) {
    if (process.env.NODE_ENV === "development") console.error(upErr);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const totals = invoiceTotals(data);
  return NextResponse.json({
    id: data.id,
    invoice_number: data.invoice_number,
    status: "draft",
    subtotal: totals.subtotal,
    total: totals.total,
  });
}
