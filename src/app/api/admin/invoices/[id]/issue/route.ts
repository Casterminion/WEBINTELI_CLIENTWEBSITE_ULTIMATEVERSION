import { NextRequest, NextResponse } from "next/server";
import type { DocumentType } from "@/lib/invoices/documentTypes";
import { buyerIssueValidationErrorCode } from "@/lib/invoices/buyerIdentification";
import { invoiceNumberPrefixForDocumentType } from "@/lib/invoices/companyInvoiceSettings";
import { formatNumberForDocumentType } from "@/lib/invoices/invoiceNumber";
import { ensureInvoiceSequenceAtLeastFloor } from "@/lib/invoices/invoiceSequenceSync";
import { persistInvoiceStatus } from "@/lib/invoices/invoicePersist";
import { renderInvoicePdf } from "@/lib/invoices/renderInvoicePdf";
import { safePdfFilename, getSupabaseUserFromRequest } from "@/lib/invoices/supabaseUserFromRequest";
import { assertVatInvoiceAllowed, ensureCompanyTaxSettings } from "@/lib/invoices/taxSettingsServer";
import type { AdminInvoiceRow } from "@/lib/invoices/types";
import { parseServiceTimingFromBody } from "@/lib/invoices/serviceTiming";
import { rowToPayload } from "@/lib/invoices/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  const auth = await getSupabaseUserFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: invoiceId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const { user, supabase } = auth;

  const { data: row, error: qErr } = await supabase
    .from("admin_invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (qErr || !row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const inv = row as AdminInvoiceRow;
  if (inv.status !== "draft") {
    return NextResponse.json({ error: "already_issued" }, { status: 400 });
  }

  let settings: Awaited<ReturnType<typeof ensureCompanyTaxSettings>>;
  try {
    settings = await ensureCompanyTaxSettings(supabase, user.id);
    assertVatInvoiceAllowed(settings, inv.document_type);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "vat_invoice_disabled") {
      return NextResponse.json({ error: "vat_invoice_disabled" }, { status: 400 });
    }
    if (process.env.NODE_ENV === "development") console.error(e);
    return NextResponse.json({ error: "settings_error" }, { status: 500 });
  }

  const payloadPreview = rowToPayload(inv);
  const timing = parseServiceTimingFromBody({
    service_date: payloadPreview.service_date,
    service_period_from: payloadPreview.service_period_from,
    service_period_to: payloadPreview.service_period_to,
  });
  if (!timing.ok) {
    return NextResponse.json({ error: timing.error }, { status: 400 });
  }

  const buyerIssueErr = buyerIssueValidationErrorCode(payloadPreview);
  if (buyerIssueErr) {
    return NextResponse.json({ error: buyerIssueErr }, { status: 400 });
  }

  try {
    await ensureInvoiceSequenceAtLeastFloor(supabase, user.id, inv.document_type as DocumentType, settings);
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.error(e);
    return NextResponse.json({ error: "sequence_floor_sync_error" }, { status: 500 });
  }

  const { data: seq, error: seqErr } = await supabase.rpc("admin_next_invoice_sequence", {
    p_document_type: inv.document_type,
  });
  if (seqErr || seq === null || seq === undefined) {
    if (process.env.NODE_ENV === "development") console.error(seqErr);
    return NextResponse.json({ error: "sequence_error" }, { status: 500 });
  }
  const seqNum = typeof seq === "number" ? seq : Number(seq);
  if (!Number.isFinite(seqNum)) {
    return NextResponse.json({ error: "sequence_error" }, { status: 500 });
  }

  const prefix = invoiceNumberPrefixForDocumentType(inv.document_type as DocumentType, settings);
  const issuedNumber = formatNumberForDocumentType(inv.document_type as DocumentType, seqNum, prefix);
  const payload = { ...payloadPreview, invoice_number: issuedNumber };

  const nowIso = new Date().toISOString();
  const storagePath = `${user.id}/${invoiceId}.pdf`;

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await renderInvoicePdf(payload);
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.error(e);
    return NextResponse.json({ error: "pdf_render_error" }, { status: 500 });
  }

  const { error: upStorageErr } = await supabase.storage
    .from("admin-invoices")
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (upStorageErr) {
    if (process.env.NODE_ENV === "development") console.error(upStorageErr);
    return NextResponse.json({ error: "storage_error" }, { status: 500 });
  }

  const invRow = inv as typeof inv & { seller_email?: string | null; seller_phone?: string | null };
  const seller_snapshot_json = {
    seller_name: inv.seller_name,
    seller_code: inv.seller_code,
    seller_address: inv.seller_address,
    seller_email: invRow.seller_email ?? null,
    seller_phone: invRow.seller_phone ?? null,
    seller_contact_line: inv.seller_contact_line,
    seller_bank_account: inv.seller_bank_account,
    vat_summary_line: inv.vat_summary_line,
    tax_profile_snapshot: inv.tax_profile_snapshot ?? null,
  };
  const invFull = inv as AdminInvoiceRow & {
    buyer_country?: string | null;
    buyer_type?: string | null;
    buyer_company_code?: string | null;
    buyer_registration_number?: string | null;
    buyer_vat_number?: string | null;
  };
  const buyer_snapshot_json = {
    buyer_name: inv.buyer_name,
    buyer_code: inv.buyer_code,
    buyer_country: invFull.buyer_country ?? null,
    buyer_type: invFull.buyer_type ?? null,
    buyer_company_code: invFull.buyer_company_code ?? null,
    buyer_registration_number: invFull.buyer_registration_number ?? null,
    buyer_vat_number: invFull.buyer_vat_number ?? null,
    buyer_address: inv.buyer_address,
    buyer_contact: inv.buyer_contact,
  };

  const { error: upErr } = await supabase
    .from("admin_invoices")
    .update({
      invoice_number: issuedNumber,
      issued_at: nowIso,
      seller_snapshot_json,
      buyer_snapshot_json,
      pdf_storage_path: storagePath,
      updated_at: nowIso,
    })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (upErr) {
    if (process.env.NODE_ENV === "development") console.error(upErr);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const persist = await persistInvoiceStatus(supabase, user.id, invoiceId, {
    cancelled_at: inv.cancelled_at,
    issued_at: nowIso,
    due_date: inv.due_date,
    total: Number(inv.total) || 0,
  });
  if (persist.error) {
    if (process.env.NODE_ENV === "development") console.error(persist.error);
  }

  const filename = safePdfFilename(issuedNumber);
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Invoice-Id": invoiceId,
      "X-Invoice-Number": issuedNumber,
    },
  });
}
