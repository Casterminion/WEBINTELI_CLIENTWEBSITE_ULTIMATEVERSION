"use client";

import type { InvoiceLineItem, InvoicePayload } from "@/lib/invoices/types";
import { computeLineTotal } from "@/lib/invoices/types";
import { useLanguage } from "@/contexts/LanguageContext";

type Labels = Record<string, string | undefined>;

type Props = {
  value: InvoicePayload;
  onChange: (next: InvoicePayload) => void;
};

function inputCls() {
  return "w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--admin-accent)]";
}

export function InvoiceEditorForm({ value, onChange }: Props) {
  const { t } = useLanguage();
  const a = t.admin as Labels;

  const patch = (partial: Partial<InvoicePayload>) => onChange({ ...value, ...partial });

  const patchLine = (index: number, partial: Partial<InvoiceLineItem>) => {
    const line_items = value.line_items.map((row, i) => {
      if (i !== index) return row;
      const next = { ...row, ...partial };
      next.line_total = computeLineTotal(next);
      return next;
    });
    onChange({ ...value, line_items });
  };

  const addLine = () => {
    onChange({
      ...value,
      line_items: [
        ...value.line_items,
        { description: "", quantity: 1, unit: "vnt.", unit_price: 0, line_total: 0 },
      ],
    });
  };

  const removeLine = (index: number) => {
    if (value.line_items.length <= 1) return;
    onChange({
      ...value,
      line_items: value.line_items.filter((_, i) => i !== index),
    });
  };

  const lab = (key: keyof typeof a, fallback: string) => (a[key] as string) ?? fallback;

  const fieldStyle = {
    borderColor: "var(--admin-border)",
    color: "var(--admin-text)",
    background: "var(--admin-bg-elevated)",
  } as const;

  return (
    <div className="space-y-6">
      <div
        className="grid gap-4 sm:grid-cols-2 rounded-lg border p-4"
        style={{ borderColor: "var(--admin-border)" }}
      >
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
            {lab("buhalterijaInvoiceNumber", "Invoice no.")}
          </label>
          <input
            className={inputCls()}
            style={fieldStyle}
            value={value.invoice_number}
            onChange={(e) => patch({ invoice_number: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
            {lab("buhalterijaIssueDate", "Issue date")}
          </label>
          <input
            type="date"
            className={inputCls()}
            style={fieldStyle}
            value={value.issue_date}
            onChange={(e) => patch({ issue_date: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
            {lab("buhalterijaDueDate", "Due date")}
          </label>
          <input
            type="date"
            className={inputCls()}
            style={fieldStyle}
            value={value.due_date}
            onChange={(e) => patch({ due_date: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
            {lab("buhalterijaDocumentTitle", "Document title")}
          </label>
          <input
            className={inputCls()}
            style={fieldStyle}
            value={value.document_title}
            onChange={(e) => patch({ document_title: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
            {lab("buhalterijaInvoiceType", "Type")}
          </label>
          <input
            className={inputCls()}
            style={fieldStyle}
            value={value.invoice_type}
            onChange={(e) => patch({ invoice_type: e.target.value })}
          />
        </div>
      </div>

      <section
        className="rounded-lg border p-4 space-y-3"
        style={{ borderColor: "var(--admin-border)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
          {lab("buhalterijaSeller", "Seller")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
              Webinteli MB / {lab("buhalterijaSeller", "Seller")}
            </label>
            <input
              className={inputCls()}
              style={fieldStyle}
              value={value.seller_name}
              onChange={(e) => patch({ seller_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {lab("buhalterijaCompanyCode", "Company code")}
            </label>
            <input
              className={inputCls()}
              style={fieldStyle}
              value={value.seller_code}
              onChange={(e) => patch({ seller_code: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {lab("buhalterijaCurrency", "Currency")}
            </label>
            <input
              className={inputCls()}
              style={fieldStyle}
              value={value.currency}
              onChange={(e) => patch({ currency: e.target.value.toUpperCase().slice(0, 3) })}
              maxLength={3}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {lab("buhalterijaAddress", "Address")}
            </label>
            <input
              className={inputCls()}
              style={fieldStyle}
              value={value.seller_address}
              onChange={(e) => patch({ seller_address: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {lab("buhalterijaContactLine", "Contact")}
            </label>
            <input
              className={inputCls()}
              style={fieldStyle}
              value={value.seller_contact_line}
              onChange={(e) => patch({ seller_contact_line: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {lab("buhalterijaBankAccount", "Bank account")}
            </label>
            <input
              className={inputCls()}
              style={fieldStyle}
              value={value.seller_bank_account}
              onChange={(e) => patch({ seller_bank_account: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section
        className="rounded-lg border p-4 space-y-3"
        style={{ borderColor: "var(--admin-border)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
          {lab("buhalterijaBuyer", "Buyer")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {lab("buhalterijaClient", "Client")}
            </label>
            <input
              className={inputCls()}
              style={fieldStyle}
              value={value.buyer_name}
              onChange={(e) => patch({ buyer_name: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {lab("buhalterijaBuyerCode", "Buyer code")}
            </label>
            <input
              className={inputCls()}
              style={fieldStyle}
              value={value.buyer_code}
              onChange={(e) => patch({ buyer_code: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {lab("buhalterijaAddress", "Address")}
            </label>
            <input
              className={inputCls()}
              style={fieldStyle}
              value={value.buyer_address}
              onChange={(e) => patch({ buyer_address: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
              {lab("buhalterijaContactLine", "Contact")}
            </label>
            <input
              className={inputCls()}
              style={fieldStyle}
              value={value.buyer_contact}
              onChange={(e) => patch({ buyer_contact: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section
        className="rounded-lg border p-4 space-y-3"
        style={{ borderColor: "var(--admin-border)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
            {lab("buhalterijaLines", "Lines")}
          </h2>
          <button
            type="button"
            onClick={addLine}
            className="text-xs font-medium px-3 py-1.5 rounded-md border transition-colors hover:bg-[var(--admin-bg-elevated)]"
            style={{ borderColor: "var(--admin-border)", color: "var(--admin-accent)" }}
          >
            {lab("buhalterijaAddLine", "Add line")}
          </button>
        </div>
        <div className="space-y-4">
          {value.line_items.map((line, index) => (
            <div
              key={index}
              className="grid gap-2 sm:grid-cols-12 border-b pb-4 last:border-0"
              style={{ borderColor: "var(--admin-border)" }}
            >
              <div className="sm:col-span-5">
                <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                  {lab("buhalterijaDescription", "Description")}
                </label>
                <textarea
                  className={`${inputCls()} min-h-[72px] resize-y`}
                  style={fieldStyle}
                  value={line.description}
                  onChange={(e) => patchLine(index, { description: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                  {lab("buhalterijaQuantity", "Qty")}
                </label>
                <input
                  type="number"
                  min={0.001}
                  step="any"
                  className={inputCls()}
                  style={fieldStyle}
                  value={line.quantity}
                  onChange={(e) => patchLine(index, { quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                  {lab("buhalterijaUnit", "Unit")}
                </label>
                <input
                  className={inputCls()}
                  style={fieldStyle}
                  value={line.unit}
                  onChange={(e) => patchLine(index, { unit: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                  {lab("buhalterijaUnitPrice", "Price")}
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputCls()}
                  style={fieldStyle}
                  value={line.unit_price}
                  onChange={(e) => patchLine(index, { unit_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="sm:col-span-1 flex flex-col justify-end">
                <span className="text-[10px] mb-1" style={{ color: "var(--admin-text-muted)" }}>
                  {lab("buhalterijaLineTotal", "Total")}
                </span>
                <span className="text-sm font-medium tabular-nums" style={{ color: "var(--admin-text)" }}>
                  {line.line_total.toFixed(2)}
                </span>
              </div>
              <div className="sm:col-span-12 flex justify-end">
                <button
                  type="button"
                  disabled={value.line_items.length <= 1}
                  onClick={() => removeLine(index)}
                  className="text-xs disabled:opacity-40"
                  style={{ color: "var(--admin-text-muted)" }}
                >
                  {lab("buhalterijaRemoveLine", "Remove")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
            {lab("buhalterijaVatLine", "VAT line")}
          </label>
          <input
            className={inputCls()}
            style={fieldStyle}
            value={value.vat_summary_line}
            onChange={(e) => patch({ vat_summary_line: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
            {lab("buhalterijaNotes", "Notes")}
          </label>
          <textarea
            className={`${inputCls()} min-h-[100px]`}
            style={fieldStyle}
            value={value.notes}
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
