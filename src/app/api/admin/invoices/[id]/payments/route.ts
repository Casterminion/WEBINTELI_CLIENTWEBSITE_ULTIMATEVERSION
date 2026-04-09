import { NextRequest, NextResponse } from "next/server";
import { persistInvoiceStatus, sumPaymentsForInvoice } from "@/lib/invoices/invoicePersist";
import { paymentWouldExceedBalance } from "@/lib/invoices/invoicePaymentSummary";
import { getSupabaseUserFromRequest } from "@/lib/invoices/supabaseUserFromRequest";
import type { AdminInvoiceRow } from "@/lib/invoices/types";

export const runtime = "nodejs";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["application/pdf", "image/png", "image/jpeg", "image/jpg"]);

type Ctx = { params: Promise<{ id: string }> };

type ParsedFields = {
  payment_date: string;
  amount: number;
  currency: string;
  method: string;
  reference: string;
  note: string;
  file: File | null;
};

function safeFileName(name: string): string {
  const base = name.replace(/[/\\]/g, "").replace(/\.\./g, "").slice(-120) || "attachment";
  return base.replace(/[^\w.\-]+/g, "_");
}

async function parsePaymentRequest(request: NextRequest): Promise<ParsedFields | { error: string }> {
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const form = await request.formData();
    const payment_date = typeof form.get("payment_date") === "string" ? form.get("payment_date")!.toString().trim() : "";
    const amountRaw = form.get("amount");
    const amount = typeof amountRaw === "string" ? parseFloat(amountRaw) : Number(amountRaw);
    const currencyRaw = form.get("currency");
    const currency =
      typeof currencyRaw === "string" && currencyRaw.trim().length === 3
        ? currencyRaw.trim().toUpperCase()
        : "EUR";
    const methodRaw = form.get("method");
    const method = typeof methodRaw === "string" && methodRaw.trim() ? methodRaw.trim() : "bank_transfer";
    const reference = typeof form.get("reference") === "string" ? form.get("reference")!.toString().trim() : "";
    const note = typeof form.get("note") === "string" ? form.get("note")!.toString().trim() : "";
    const file = form.get("attachment");
    const fileObj = file instanceof File && file.size > 0 ? file : null;
    if (!ISO_DATE.test(payment_date)) return { error: "payment_date_invalid" };
    if (!Number.isFinite(amount) || amount <= 0) return { error: "amount_invalid" };
    return { payment_date, amount, currency, method, reference, note, file: fileObj };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: "invalid_json" };
  }
  const b = body as Record<string, unknown>;
  const payment_date = typeof b.payment_date === "string" ? b.payment_date.trim() : "";
  if (!ISO_DATE.test(payment_date)) return { error: "payment_date_invalid" };
  const amount = Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "amount_invalid" };
  const currency =
    typeof b.currency === "string" && b.currency.trim().length === 3 ? b.currency.trim().toUpperCase() : "EUR";
  const method = typeof b.method === "string" && b.method.trim() ? b.method.trim() : "bank_transfer";
  const reference = typeof b.reference === "string" ? b.reference.trim() : "";
  const note = typeof b.note === "string" ? b.note.trim() : "";
  return { payment_date, amount, currency, method, reference, note, file: null };
}

export async function POST(request: NextRequest, context: Ctx) {
  const auth = await getSupabaseUserFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: invoiceId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const parsed = await parsePaymentRequest(request);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { payment_date, amount, currency, method, reference, note, file } = parsed;

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
  if (!inv.issued_at || inv.status === "draft") {
    return NextResponse.json({ error: "not_issued" }, { status: 400 });
  }
  if (inv.status === "cancelled") {
    return NextResponse.json({ error: "invoice_cancelled" }, { status: 400 });
  }

  const invCurrency = (inv.currency || "EUR").trim().toUpperCase();
  if (currency !== invCurrency) {
    return NextResponse.json({ error: "currency_mismatch" }, { status: 400 });
  }

  const total = Number(inv.total) || 0;
  const existingPaid = await sumPaymentsForInvoice(supabase, invoiceId);
  if (paymentWouldExceedBalance(existingPaid, total, amount)) {
    return NextResponse.json({ error: "payment_exceeds_balance" }, { status: 400 });
  }

  if (file) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json({ error: "attachment_too_large" }, { status: 400 });
    }
    const mime = (file.type || "").toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json({ error: "attachment_type_invalid" }, { status: 400 });
    }
  }

  const { data: ins, error: insErr } = await supabase
    .from("admin_invoice_payments")
    .insert({
      user_id: user.id,
      invoice_id: invoiceId,
      payment_date,
      amount,
      currency,
      method,
      reference: reference || null,
      note: note || null,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insErr || !ins) {
    if (process.env.NODE_ENV === "development") console.error(insErr);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const paymentId = (ins as { id: string }).id;

  if (file) {
    const buf = Buffer.from(await file.arrayBuffer());
    const objectPath = `${user.id}/${paymentId}/${safeFileName(file.name)}`;
    const mime = (file.type || "application/octet-stream").toLowerCase();
    const { error: upErr } = await supabase.storage.from("admin-payment-attachments").upload(objectPath, buf, {
      contentType: mime,
      upsert: false,
    });
    if (upErr) {
      await supabase.from("admin_invoice_payments").delete().eq("id", paymentId).eq("user_id", user.id);
      if (process.env.NODE_ENV === "development") console.error(upErr);
      return NextResponse.json({ error: "attachment_upload_failed" }, { status: 500 });
    }
    const { error: attErr } = await supabase
      .from("admin_invoice_payments")
      .update({
        attachment_storage_path: objectPath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId)
      .eq("user_id", user.id);
    if (attErr) {
      if (process.env.NODE_ENV === "development") console.error(attErr);
      return NextResponse.json({ error: "attachment_save_failed" }, { status: 500 });
    }
  }

  const persist = await persistInvoiceStatus(supabase, user.id, invoiceId, {
    cancelled_at: inv.cancelled_at,
    issued_at: inv.issued_at,
    due_date: inv.due_date,
    total,
  });
  if (persist.error) {
    if (process.env.NODE_ENV === "development") console.error(persist.error);
    return NextResponse.json({ error: "status_update_failed" }, { status: 500 });
  }

  return NextResponse.json({ id: paymentId, status: persist.status });
}
