export type DocumentType =
  | "proforma_invoice"
  | "sales_invoice"
  | "credit_note"
  | "debit_note"
  | "vat_invoice";

export type TaxProfileType = "non_vat" | "vat" | "vat_svs";

export type TaxProfileSnapshot = { type: TaxProfileType };

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
};

export type InvoicePayload = {
  id?: string;
  document_type: DocumentType;
  invoice_number: string;
  issue_date: string;
  service_date: string;
  service_period_from: string;
  service_period_to: string;
  due_date: string;
  document_title: string;
  invoice_type: string;
  seller_name: string;
  seller_code: string;
  seller_address: string;
  seller_email: string;
  seller_phone: string;
  seller_contact_line: string;
  seller_bank_account: string;
  buyer_name: string;
  buyer_country?: string;
  buyer_type?: "company" | "natural_person";
  buyer_company_code?: string;
  buyer_registration_number?: string;
  buyer_vat_number?: string;
  buyer_code: string;
  buyer_address: string;
  buyer_email: string;
  buyer_phone: string;
  buyer_contact: string;
  currency: string;
  line_items: InvoiceLineItem[];
  notes: string;
  vat_summary_line: string;
  tax_profile_snapshot: TaxProfileSnapshot;
  related_invoice_id?: string;
};

export function computeLineTotal(item: Pick<InvoiceLineItem, "quantity" | "unit_price">): number {
  const q = Number(item.quantity) || 0;
  const p = Number(item.unit_price) || 0;
  return Math.round(q * p * 100) / 100;
}

export function computeInvoiceSubtotal(items: InvoiceLineItem[]): number {
  return Math.round(items.reduce((s, row) => s + (Number(row.line_total) || 0), 0) * 100) / 100;
}
