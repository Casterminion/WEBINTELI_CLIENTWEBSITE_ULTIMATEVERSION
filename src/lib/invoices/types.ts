export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
};

/** Payload for PDF + form + API (camelCase in API JSON) */
export type InvoicePayload = {
  id?: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  document_title: string;
  invoice_type: string;
  seller_name: string;
  seller_code: string;
  seller_address: string;
  seller_contact_line: string;
  seller_bank_account: string;
  buyer_name: string;
  buyer_code: string;
  buyer_address: string;
  buyer_contact: string;
  currency: string;
  line_items: InvoiceLineItem[];
  notes: string;
  vat_summary_line: string;
};

export type AdminInvoiceRow = {
  id: string;
  user_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  document_title: string;
  invoice_type: string;
  seller_name: string;
  seller_code: string;
  seller_address: string;
  seller_contact_line: string;
  seller_bank_account: string;
  buyer_name: string;
  buyer_code: string | null;
  buyer_address: string | null;
  buyer_contact: string | null;
  currency: string;
  line_items: InvoiceLineItem[];
  notes: string | null;
  vat_summary_line: string;
  pdf_storage_path: string | null;
  created_at: string;
  updated_at: string;
};

export const WEBINTELI_INVOICE_DEFAULTS: Omit<
  InvoicePayload,
  "invoice_number" | "issue_date" | "due_date" | "buyer_name" | "line_items" | "notes"
> = {
  document_title: "AVANSINĖ SĄSKAITA FAKTŪRA",
  invoice_type: "Avansas",
  seller_name: "Webinteli MB",
  seller_code: "307617594",
  seller_address: "Europos pr. 34, LT-46370 Kaunas",
  seller_contact_line: "arijus@webinteli.lt · +370 648 83116",
  seller_bank_account: "LT08 7044 0901 1631 9200",
  buyer_code: "",
  buyer_address: "",
  buyer_contact: "",
  currency: "EUR",
  vat_summary_line: "Neskaičiuojamas",
};

export function emptyLineItem(): InvoiceLineItem {
  return {
    description: "",
    quantity: 1,
    unit: "vnt.",
    unit_price: 0,
    line_total: 0,
  };
}

export function computeLineTotal(item: Pick<InvoiceLineItem, "quantity" | "unit_price">): number {
  const q = Number(item.quantity) || 0;
  const p = Number(item.unit_price) || 0;
  return Math.round(q * p * 100) / 100;
}

export function computeInvoiceSubtotal(items: InvoiceLineItem[]): number {
  return Math.round(items.reduce((s, row) => s + (Number(row.line_total) || 0), 0) * 100) / 100;
}

export function rowToPayload(row: AdminInvoiceRow): InvoicePayload {
  return {
    id: row.id,
    invoice_number: row.invoice_number,
    issue_date: row.issue_date,
    due_date: row.due_date,
    document_title: row.document_title,
    invoice_type: row.invoice_type,
    seller_name: row.seller_name,
    seller_code: row.seller_code,
    seller_address: row.seller_address,
    seller_contact_line: row.seller_contact_line,
    seller_bank_account: row.seller_bank_account,
    buyer_name: row.buyer_name,
    buyer_code: row.buyer_code ?? "",
    buyer_address: row.buyer_address ?? "",
    buyer_contact: row.buyer_contact ?? "",
    currency: row.currency,
    line_items: row.line_items,
    notes: row.notes ?? "",
    vat_summary_line: row.vat_summary_line,
  };
}
