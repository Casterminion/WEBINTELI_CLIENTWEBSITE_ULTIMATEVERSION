import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "@/lib/invoices/InvoicePdfDocument";
import { ensureInvoiceFontsServer } from "@/lib/invoices/invoiceFontsServer";
import { parseInvoicePayload } from "@/lib/invoices/parsePayload";
import { getSupabaseUserFromRequest, safePdfFilename } from "@/lib/invoices/supabaseUserFromRequest";
import type { InvoicePayload } from "@/lib/invoices/types";

export const runtime = "nodejs";

function rowFromPayload(data: InvoicePayload, userId: string) {
  return {
    user_id: userId,
    invoice_number: data.invoice_number,
    issue_date: data.issue_date,
    due_date: data.due_date,
    document_title: data.document_title,
    invoice_type: data.invoice_type,
    seller_name: data.seller_name,
    seller_code: data.seller_code,
    seller_address: data.seller_address,
    seller_contact_line: data.seller_contact_line,
    seller_bank_account: data.seller_bank_account,
    buyer_name: data.buyer_name,
    buyer_code: data.buyer_code.trim() ? data.buyer_code.trim() : null,
    buyer_address: data.buyer_address.trim() ? data.buyer_address.trim() : null,
    buyer_contact: data.buyer_contact.trim() ? data.buyer_contact.trim() : null,
    currency: data.currency,
    line_items: data.line_items,
    notes: data.notes.trim() ? data.notes.trim() : null,
    vat_summary_line: data.vat_summary_line,
    updated_at: new Date().toISOString(),
  };
}

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
  const data = parsed.data;
  const nowIso = new Date().toISOString();

  let invoiceId: string;

  if (data.id) {
    const { data: existing, error: exErr } = await supabase
      .from("admin_invoices")
      .select("id")
      .eq("id", data.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (exErr || !existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    invoiceId = data.id;
    const { error: upErr } = await supabase
      .from("admin_invoices")
      .update(rowFromPayload(data, user.id))
      .eq("id", invoiceId)
      .eq("user_id", user.id);

    if (upErr) {
      if (process.env.NODE_ENV === "development") console.error(upErr);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  } else {
    const insertRow = {
      ...rowFromPayload(data, user.id),
      pdf_storage_path: null as string | null,
      created_at: nowIso,
    };
    const { data: ins, error: insErr } = await supabase
      .from("admin_invoices")
      .insert(insertRow)
      .select("id")
      .single();

    if (insErr || !ins) {
      if (process.env.NODE_ENV === "development") console.error(insErr);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
    invoiceId = ins.id;
  }

  const storagePath = `${user.id}/${invoiceId}.pdf`;

  const workerBase = process.env.PDF_WORKER_URL?.trim().replace(/\/$/, "");
  const workerSecret = process.env.PDF_WORKER_SECRET?.trim();

  try {
    let pdfBytes: Uint8Array;

    if (workerBase && workerSecret) {
      const workerRes = await fetch(`${workerBase}/render-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${workerSecret}`,
        },
        body: JSON.stringify(data),
      });

      if (!workerRes.ok) {
        const errText = await workerRes.text().catch(() => "");
        if (process.env.NODE_ENV === "development") {
          console.error("PDF worker error:", workerRes.status, errText);
        }
        return NextResponse.json(
          { error: "worker_error", detail: workerRes.status },
          { status: 502 }
        );
      }

      const ct = workerRes.headers.get("content-type") ?? "";
      if (!ct.includes("application/pdf")) {
        return NextResponse.json({ error: "worker_invalid_response" }, { status: 502 });
      }

      pdfBytes = new Uint8Array(await workerRes.arrayBuffer());
    } else {
      ensureInvoiceFontsServer();
      const buffer = await renderToBuffer(
        React.createElement(InvoicePdfDocument, { data }) as Parameters<typeof renderToBuffer>[0]
      );
      pdfBytes = new Uint8Array(buffer);
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

    const { error: pathErr } = await supabase
      .from("admin_invoices")
      .update({ pdf_storage_path: storagePath, updated_at: nowIso })
      .eq("id", invoiceId)
      .eq("user_id", user.id);

    if (pathErr) {
      if (process.env.NODE_ENV === "development") console.error(pathErr);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    const filename = safePdfFilename(data.invoice_number);
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Invoice-Id": invoiceId,
      },
    });
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.error(e);
    return NextResponse.json({ error: "pdf_render_error" }, { status: 500 });
  }
}
