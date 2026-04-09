import { NextRequest, NextResponse } from "next/server";
import { invoiceNumberPrefixForDocumentType } from "@/lib/invoices/companyInvoiceSettings";
import { isDocumentType } from "@/lib/invoices/documentTypes";
import { effectiveLastSequenceForPreview, peekNextNumberFromLastSequence } from "@/lib/invoices/invoiceNumber";
import { getSupabaseUserFromRequest } from "@/lib/invoices/supabaseUserFromRequest";
import { ensureCompanyTaxSettings } from "@/lib/invoices/taxSettingsServer";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await getSupabaseUserFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dtRaw = request.nextUrl.searchParams.get("document_type")?.trim() || "sales_invoice";
  if (!isDocumentType(dtRaw)) {
    return NextResponse.json({ error: "document_type_invalid" }, { status: 400 });
  }

  const { user, supabase } = auth;

  let settings;
  try {
    settings = await ensureCompanyTaxSettings(supabase, user.id);
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.error(e);
    return NextResponse.json({ error: "settings_error" }, { status: 500 });
  }

  const prefix = invoiceNumberPrefixForDocumentType(dtRaw, settings);

  const { data: seqRow, error } = await supabase
    .from("admin_invoice_sequences")
    .select("last_sequence")
    .eq("user_id", user.id)
    .eq("document_type", dtRaw)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const last = seqRow ? Number((seqRow as { last_sequence: number }).last_sequence) || 0 : 0;
  const effectiveLast = effectiveLastSequenceForPreview(dtRaw, last, settings);
  const next_number = peekNextNumberFromLastSequence(dtRaw, effectiveLast, prefix);

  return NextResponse.json({
    document_type: dtRaw,
    next_number,
    last_sequence: effectiveLast,
    /** Next number if you issue now; drafts do not consume the sequence until issue. */
    preview_only: true,
  });
}
