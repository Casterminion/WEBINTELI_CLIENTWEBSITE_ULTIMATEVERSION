import { splitCombinedSellerContactLine } from "./sellerContact";
import type { InvoicePayload } from "./types";

export type BuyerPdfLabeledLine = { label: string; value: string };

export function buyerPdfLabeledContacts(
  data: Pick<InvoicePayload, "buyer_email" | "buyer_phone" | "buyer_contact">
): BuyerPdfLabeledLine[] {
  const email = data.buyer_email?.trim() || "";
  const phone = data.buyer_phone?.trim() || "";
  if (email || phone) {
    const out: BuyerPdfLabeledLine[] = [];
    if (email) out.push({ label: "El. paštas:", value: email });
    if (phone) out.push({ label: "Tel.:", value: phone });
    return out;
  }
  const legacy = data.buyer_contact?.trim() || "";
  if (!legacy) return [];
  const split = splitCombinedSellerContactLine(legacy);
  if (split.email || split.phone) {
    const out: BuyerPdfLabeledLine[] = [];
    if (split.email) out.push({ label: "El. paštas:", value: split.email });
    if (split.phone) out.push({ label: "Tel.:", value: split.phone });
    return out;
  }
  return [{ label: "Kontaktai:", value: legacy }];
}
