import { NextRequest, NextResponse } from "next/server";
import { isCorrectionDocumentType, type DocumentType } from "@/lib/invoices/documentTypes";
import { parseInvoicePayload } from "@/lib/invoices/parsePayload";
import { getSupabaseUserFromRequest } from "@/lib/invoices/supabaseUserFromRequest";
import { assertVatInvoiceAllowed, ensureCompanyTaxSettings } from "@/lib/invoices/taxSettingsServer";
import { buildDraftUpsertRow } from "@/lib/invoices/draftRow";
import type { AdminInvoiceRow } from "@/lib/invoices/types";
import { syncDisplayFieldsFromDocumentType } from "@/lib/invoices/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Ctx) {
  const auth = await getSupabaseUserFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: invoiceId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
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

  if (inv.status === "cancelled") {
    return NextResponse.json({ error: "invoice_cancelled" }, { status: 400 });
  }

  if (inv.status !== "draft") {
    const b = body as Record<string, unknown>;
    const notes = typeof b.notes === "string" ? b.notes.trim() : undefined;
    const buyer_contact = typeof b.buyer_contact === "string" ? b.buyer_contact.trim() : undefined;
    const buyer_address = typeof b.buyer_address === "string" ? b.buyer_address.trim() : undefined;
    if (notes === undefined && buyer_contact === undefined && buyer_address === undefined) {
      return NextResponse.json({ error: "issued_patch_whitelist" }, { status: 400 });
    }
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (notes !== undefined) patch.notes = notes || null;
    if (buyer_contact !== undefined) patch.buyer_contact = buyer_contact || null;
    if (buyer_address !== undefined) patch.buyer_address = buyer_address || null;

    const { error: upErr } = await supabase.from("admin_invoices").update(patch).eq("id", invoiceId).eq("user_id", user.id);
    if (upErr) {
      if (process.env.NODE_ENV === "development") console.error(upErr);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const parsed = parseInvoicePayload(
    typeof body === "object" && body !== null ? { ...(body as object), id: invoiceId } : body
  );
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (parsed.data.id !== invoiceId) {
    return NextResponse.json({ error: "id_mismatch" }, { status: 400 });
  }

  let data = { ...parsed.data, invoice_number: inv.invoice_number };
  if (inv.document_type === "proforma_invoice") {
    data = {
      ...data,
      document_type: "proforma_invoice",
    };
  }
  if (inv.related_invoice_id && isCorrectionDocumentType(inv.document_type)) {
    const snap = (() => {
      const v = inv.correction_original_total_snapshot;
      if (v === null || v === undefined) return undefined;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : undefined;
    })();
    data = {
      ...data,
      document_type: inv.document_type,
      related_invoice_id: inv.related_invoice_id,
      ...(snap !== undefined ? { correction_original_total_snapshot: snap } : {}),
    };
  }

  const proformaSourceId =
    typeof inv.source_proforma_id === "string" && /^[0-9a-f-]{36}$/i.test(inv.source_proforma_id)
      ? inv.source_proforma_id
      : undefined;
  if (proformaSourceId && inv.document_type === ("sales_invoice" as DocumentType)) {
    data = {
      ...data,
      document_type: "sales_invoice",
      source_proforma_id: proformaSourceId,
    };
  }

  try {
    const settings = await ensureCompanyTaxSettings(supabase, user.id);
    assertVatInvoiceAllowed(settings, data.document_type);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "vat_invoice_disabled") {
      return NextResponse.json({ error: "vat_invoice_disabled" }, { status: 400 });
    }
    if (process.env.NODE_ENV === "development") console.error(e);
    return NextResponse.json({ error: "settings_error" }, { status: 500 });
  }

  data = syncDisplayFieldsFromDocumentType(data);
  const baseRow = buildDraftUpsertRow(user.id, data, {});

  const { error: upErr } = await supabase
    .from("admin_invoices")
    .update(baseRow)
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .eq("status", "draft");

  if (upErr) {
    if (process.env.NODE_ENV === "development") console.error(upErr);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
