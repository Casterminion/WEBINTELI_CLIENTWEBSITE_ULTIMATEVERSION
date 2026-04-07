"use client";

import { Font } from "@react-pdf/renderer";

let registered = false;

const CDN_BASE =
  "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5.2.10/files/noto-sans-latin-ext";

/** Call once before PDFViewer in the browser. */
export function ensureInvoiceFontsClient(): void {
  if (registered) return;
  registered = true;
  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${CDN_BASE}-400-normal.woff2`, fontWeight: 400 },
      { src: `${CDN_BASE}-700-normal.woff2`, fontWeight: 700 },
    ],
  });
}
