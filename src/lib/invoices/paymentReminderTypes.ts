import type { InvoiceStatus } from "./invoiceStatus";

export type PendingPaymentReminderDto = {
  invoice_id: string;
  invoice_number: string;
  buyer_name: string;
  currency: string;
  total: number;
  amount_paid: number;
  amount_due: number;
  due_date: string;
  status: InvoiceStatus;
};
