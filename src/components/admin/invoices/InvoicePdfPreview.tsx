"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect } from "react";
import { ensureInvoiceFontsClient } from "@/lib/invoices/invoiceFontsClient";
import { InvoicePdfDocument } from "@/lib/invoices/InvoicePdfDocument";
import type { InvoicePayload } from "@/lib/invoices/types";

const PDFViewer = dynamic(() => import("@react-pdf/renderer").then((m) => m.PDFViewer), {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] items-center justify-center text-xs" style={{ color: "var(--admin-text-muted)" }}>
      …
    </div>
  ),
});

type Props = {
  data: InvoicePayload;
  loadingLabel: string;
};

export function InvoicePdfPreview({ data, loadingLabel }: Props) {
  useLayoutEffect(() => {
    ensureInvoiceFontsClient();
  }, []);

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: "var(--admin-border)", background: "#525659" }}
    >
      <PDFViewer
        key={`${data.invoice_number}-${data.issue_date}-${data.line_items.length}`}
        width="100%"
        height={520}
        showToolbar={false}
        className="border-0"
        aria-label={loadingLabel}
      >
        <InvoicePdfDocument data={data} />
      </PDFViewer>
    </div>
  );
}
