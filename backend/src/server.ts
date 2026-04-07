import express from "express";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "./invoice/InvoicePdfDocument";
import { ensureInvoiceFontsServer } from "./invoice/invoiceFontsServer";
import { parseInvoicePayload } from "./invoice/parsePayload";

const PORT = Number(process.env.PORT) || 3001;
const WORKER_SECRET = process.env.WORKER_SECRET?.trim();

const app = express();
app.use(express.json({ limit: "2mb" }));

function authOk(req: express.Request): boolean {
  if (!WORKER_SECRET) {
    console.error("WORKER_SECRET is not set; refusing all /render-pdf requests");
    return false;
  }
  const h = req.headers.authorization;
  const token = h?.startsWith("Bearer ") ? h.slice(7).trim() : "";
  return token === WORKER_SECRET;
}

app.get("/health", (_req, res) => {
  res.status(200).type("text/plain").send("ok");
});

app.post("/render-pdf", async (req, res) => {
  if (!authOk(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = parseInvoicePayload(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const { data } = parsed;

  try {
    ensureInvoiceFontsServer();
    const buffer = await renderToBuffer(
      React.createElement(InvoicePdfDocument, { data }) as Parameters<typeof renderToBuffer>[0]
    );
    res
      .status(200)
      .setHeader("Content-Type", "application/pdf")
      .setHeader("Cache-Control", "no-store")
      .send(Buffer.from(buffer));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "pdf_render_error" });
  }
});

app.listen(PORT, () => {
  console.log(`invoice-pdf-worker listening on :${PORT}`);
});
