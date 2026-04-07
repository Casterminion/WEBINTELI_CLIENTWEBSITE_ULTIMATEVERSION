import type { InvoiceLineItem, InvoicePayload } from "./types";
import { computeLineTotal } from "./types";

const MAX_LEN = 8000;

function str(v: unknown, field: string): { ok: true; v: string } | { ok: false; error: string } {
  if (v === undefined || v === null) return { ok: true, v: "" };
  if (typeof v !== "string") return { ok: false, error: `${field}_invalid` };
  const t = v.trim();
  if (t.length > MAX_LEN) return { ok: false, error: `${field}_too_long` };
  return { ok: true, v: t };
}

function reqStr(v: unknown, field: string): { ok: true; v: string } | { ok: false; error: string } {
  const r = str(v, field);
  if (!r.ok) return r;
  if (!r.v) return { ok: false, error: `${field}_required` };
  return r;
}

function parseLineItems(raw: unknown): { ok: true; items: InvoiceLineItem[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: "line_items_required" };
  }
  const items: InvoiceLineItem[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object") return { ok: false, error: "line_items_invalid" };
    const o = row as Record<string, unknown>;
    const desc = typeof o.description === "string" ? o.description.trim() : "";
    if (!desc) return { ok: false, error: "line_description_required" };
    const quantity = Number(o.quantity);
    const unit_price = Number(o.unit_price);
    if (!Number.isFinite(quantity) || quantity <= 0) return { ok: false, error: "line_quantity_invalid" };
    if (!Number.isFinite(unit_price) || unit_price < 0) return { ok: false, error: "line_price_invalid" };
    const unit = typeof o.unit === "string" && o.unit.trim() ? o.unit.trim() : "vnt.";
    const line_total = computeLineTotal({ quantity, unit_price });
    items.push({ description: desc, quantity, unit, unit_price, line_total });
  }
  return { ok: true, items };
}

export function parseInvoicePayload(
  body: unknown
): { ok: true; data: InvoicePayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "invalid_body" };
  const b = body as Record<string, unknown>;

  const invoice_number = reqStr(b.invoice_number, "invoice_number");
  if (!invoice_number.ok) return invoice_number;
  const issue_date = reqStr(b.issue_date, "issue_date");
  if (!issue_date.ok) return issue_date;
  const due_date = reqStr(b.due_date, "due_date");
  if (!due_date.ok) return due_date;
  const document_title = reqStr(b.document_title, "document_title");
  if (!document_title.ok) return document_title;
  const invoice_type = reqStr(b.invoice_type, "invoice_type");
  if (!invoice_type.ok) return invoice_type;
  const seller_name = reqStr(b.seller_name, "seller_name");
  if (!seller_name.ok) return seller_name;
  const seller_code = reqStr(b.seller_code, "seller_code");
  if (!seller_code.ok) return seller_code;
  const seller_address = reqStr(b.seller_address, "seller_address");
  if (!seller_address.ok) return seller_address;
  const seller_contact_line = reqStr(b.seller_contact_line, "seller_contact_line");
  if (!seller_contact_line.ok) return seller_contact_line;
  const seller_bank_account = reqStr(b.seller_bank_account, "seller_bank_account");
  if (!seller_bank_account.ok) return seller_bank_account;
  const buyer_name = reqStr(b.buyer_name, "buyer_name");
  if (!buyer_name.ok) return buyer_name;

  const buyer_code = str(b.buyer_code, "buyer_code");
  if (!buyer_code.ok) return buyer_code;
  const buyer_address = str(b.buyer_address, "buyer_address");
  if (!buyer_address.ok) return buyer_address;
  const buyer_contact = str(b.buyer_contact, "buyer_contact");
  if (!buyer_contact.ok) return buyer_contact;

  const currencyRaw = str(b.currency, "currency");
  if (!currencyRaw.ok) return currencyRaw;
  const currency = currencyRaw.v || "EUR";
  if (currency.length !== 3) return { ok: false, error: "currency_invalid" };

  const notes = str(b.notes, "notes");
  if (!notes.ok) return notes;
  const vat_summary_line = str(b.vat_summary_line, "vat_summary_line");
  if (!vat_summary_line.ok) return vat_summary_line;
  const vat = vat_summary_line.v || "Neskaičiuojamas";

  const lines = parseLineItems(b.line_items);
  if (!lines.ok) return lines;

  const id = typeof b.id === "string" && /^[0-9a-f-]{36}$/i.test(b.id) ? b.id : undefined;

  return {
    ok: true,
    data: {
      id,
      invoice_number: invoice_number.v,
      issue_date: issue_date.v,
      due_date: due_date.v,
      document_title: document_title.v,
      invoice_type: invoice_type.v,
      seller_name: seller_name.v,
      seller_code: seller_code.v,
      seller_address: seller_address.v,
      seller_contact_line: seller_contact_line.v,
      seller_bank_account: seller_bank_account.v,
      buyer_name: buyer_name.v,
      buyer_code: buyer_code.v,
      buyer_address: buyer_address.v,
      buyer_contact: buyer_contact.v,
      currency,
      line_items: lines.items,
      notes: notes.v,
      vat_summary_line: vat,
    },
  };
}
