import fs from "fs";
import path from "path";

/**
 * Absolute path for @react-pdf/renderer `<Image src={...} />` in Node.
 * Next.js API routes use repo cwd; the PDF worker uses `/app` with `assets/invoice-logo.png`.
 */
export function resolveInvoiceLogoPathForPdf(): string | null {
  const envPath = process.env.INVOICE_LOGO_PATH?.trim();
  const candidates = [
    envPath,
    path.join(process.cwd(), "public/LogoInWebesitePublic/logodarknobakcgound.png"),
    path.join(process.cwd(), "assets/invoice-logo.png"),
  ].filter((p): p is string => Boolean(p));

  for (const p of candidates) {
    try {
      const abs = path.isAbsolute(p) ? p : path.resolve(p);
      if (fs.existsSync(abs)) return abs;
    } catch {
      /* ignore */
    }
  }
  return null;
}
