import type { InvoicePayload } from "./types";

export type BuyerType = "company" | "natural_person";

export function normalizeBuyerType(raw: unknown): BuyerType {
  return raw === "natural_person" ? "natural_person" : "company";
}

export function legacyBuyerCodeColumn(p: {
  buyer_type: BuyerType;
  buyer_country: string;
  buyer_company_code: string;
  buyer_registration_number: string;
}): string | null {
  if (p.buyer_type === "natural_person") return null;
  const cc = normalizeBuyerCountry(p.buyer_country);
  if (cc === "LT") {
    const v = p.buyer_company_code.trim();
    return v || null;
  }
  const r = p.buyer_registration_number.trim();
  return r || null;
}

export function normalizeBuyerCountry(raw: string | undefined | null): string {
  const t = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (t.length === 2) return t;
  return "LT";
}

export function buyerIdentificationPdfLines(data: InvoicePayload): string[] {
  const lines: string[] = [];
  const buyerType = data.buyer_type === "natural_person" ? "natural_person" : "company";
  if (buyerType === "company") {
    const c = normalizeBuyerCountry(data.buyer_country);
    const comp = data.buyer_company_code?.trim();
    const reg = data.buyer_registration_number?.trim();
    const vat = data.buyer_vat_number?.trim();
    if (c === "LT" && comp) lines.push(`Įmonės kodas: ${comp}`);
    if (c !== "LT" && reg) lines.push(`Registracijos Nr.: ${reg}`);
    if (vat) lines.push(`PVM mokėtojo kodas: ${vat}`);
  }
  const leg = data.buyer_code?.trim();
  if (lines.length === 0 && leg) lines.push(`Įmonės kodas: ${leg}`);
  return lines;
}
