import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "./InvoicePdfDocument";
import { ensureInvoiceFontsServer } from "./invoiceFontsServer";
import type { InvoicePayload } from "./types";

/** True when the worker HTTP client could not complete (unreachable host, DNS, refused, etc.). */
function isWorkerNetworkFailure(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const e = err as Error & { cause?: unknown; code?: string };
  if (e.message === "fetch failed") return true;
  if (
    e.code === "ECONNREFUSED" ||
    e.code === "ENOTFOUND" ||
    e.code === "ETIMEDOUT" ||
    e.code === "EAI_AGAIN" ||
    e.code === "ENETUNREACH"
  ) {
    return true;
  }
  const c = e.cause;
  if (c && typeof c === "object" && "code" in c && typeof (c as { code: unknown }).code === "string") {
    const code = (c as { code: string }).code;
    return ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "EAI_AGAIN", "ENETUNREACH"].includes(code);
  }
  return false;
}

export async function renderInvoicePdfLocal(data: InvoicePayload): Promise<Uint8Array> {
  ensureInvoiceFontsServer();
  const buffer = await renderToBuffer(
    React.createElement(InvoicePdfDocument, { data }) as Parameters<typeof renderToBuffer>[0]
  );
  return new Uint8Array(buffer);
}

export async function renderInvoicePdfWorker(
  data: InvoicePayload,
  workerBase: string,
  workerSecret: string
): Promise<Uint8Array> {
  const workerRes = await fetch(`${workerBase.replace(/\/$/, "")}/render-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${workerSecret}`,
    },
    body: JSON.stringify(data),
  });
  if (!workerRes.ok) {
    const errText = await workerRes.text().catch(() => "");
    throw new Error(`worker_error:${workerRes.status}:${errText}`);
  }
  const ct = workerRes.headers.get("content-type") ?? "";
  if (!ct.includes("application/pdf")) {
    throw new Error("worker_invalid_response");
  }
  return new Uint8Array(await workerRes.arrayBuffer());
}

export async function renderInvoicePdf(data: InvoicePayload): Promise<Uint8Array> {
  const workerBase = process.env.PDF_WORKER_URL?.trim().replace(/\/$/, "");
  const workerSecret = process.env.PDF_WORKER_SECRET?.trim();
  if (workerBase && workerSecret) {
    try {
      return await renderInvoicePdfWorker(data, workerBase, workerSecret);
    } catch (e) {
      if (isWorkerNetworkFailure(e)) {
        return renderInvoicePdfLocal(data);
      }
      throw e;
    }
  }
  return renderInvoicePdfLocal(data);
}
