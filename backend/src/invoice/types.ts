export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
};

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

export function computeLineTotal(item: Pick<InvoiceLineItem, "quantity" | "unit_price">): number {
  const q = Number(item.quantity) || 0;
  const p = Number(item.unit_price) || 0;
  return Math.round(q * p * 100) / 100;
}

export function computeInvoiceSubtotal(items: InvoiceLineItem[]): number {
  return Math.round(items.reduce((s, row) => s + (Number(row.line_total) || 0), 0) * 100) / 100;
}
