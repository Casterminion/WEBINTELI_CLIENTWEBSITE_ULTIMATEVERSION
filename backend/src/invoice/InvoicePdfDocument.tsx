import { Document, Image, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatSellerContactLine } from "./sellerContact";
import { resolveInvoiceLogoPathForPdf } from "./invoiceLogoPath";
import { buyerIdentificationPdfLines } from "./buyerIdentification";
import { serviceTimingPdfMeta } from "./serviceTiming";
import type { DocumentType, InvoicePayload } from "./types";
import { computeInvoiceSubtotal } from "./types";

const PDF_TITLE: Record<DocumentType, string> = {
  proforma_invoice: "IŠANKSTINĖ SĄSKAITA",
  sales_invoice: "SĄSKAITA FAKTŪRA",
  credit_note: "KREDITINĖ SĄSKAITA",
  debit_note: "DEBETINĖ SĄSKAITA",
  vat_invoice: "PVM SĄSKAITA FAKTŪRA",
};

function getPdfTitle(documentType: DocumentType): string {
  return PDF_TITLE[documentType];
}

function showVatBreakdown(data: InvoicePayload): boolean {
  if (data.document_type === "vat_invoice") return true;
  const t = data.tax_profile_snapshot?.type;
  return t === "vat" || t === "vat_svs";
}

const ACCENT = "#ff9800";
const INK = "#0b1120";
const INK_MUTED = "#475569";
const BORDER = "#e2e8f0";
const SURFACE = "#f1f5f9";

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingHorizontal: 40,
    paddingBottom: 72,
    fontFamily: "NotoSans",
    fontSize: 9,
    color: INK,
  },
  topAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: ACCENT,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "58%",
  },
  logo: {
    height: 44,
    width: 132,
    objectFit: "contain",
    objectPosition: "left",
  },
  wordmark: {
    fontSize: 14,
    fontWeight: 700,
    color: INK,
    letterSpacing: -0.3,
  },
  headerContactCol: {
    alignItems: "flex-end",
    maxWidth: "42%",
  },
  headerContactLabel: {
    fontSize: 6.5,
    fontWeight: 700,
    color: INK_MUTED,
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerContactLine: {
    fontSize: 8.5,
    color: INK,
    marginBottom: 2,
    textAlign: "right",
  },
  titleBand: {
    flexDirection: "row",
    marginTop: 18,
    marginBottom: 4,
  },
  titleAccentBar: {
    width: 4,
    backgroundColor: ACCENT,
    marginRight: 12,
  },
  titleTextCol: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 0.5,
    color: INK,
    marginBottom: 4,
  },
  documentTitle: {
    fontSize: 9.5,
    fontWeight: 700,
    color: INK_MUTED,
    letterSpacing: 1.2,
  },
  metaRow: {
    flexDirection: "row",
    marginTop: 16,
    gap: 8,
  },
  metaCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  metaLabel: {
    fontSize: 6.5,
    fontWeight: 700,
    color: INK_MUTED,
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  metaValue: {
    fontSize: 9.5,
    fontWeight: 700,
    color: INK,
  },
  partiesRow: {
    flexDirection: "row",
    marginTop: 18,
    gap: 14,
  },
  partyCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    minHeight: 118,
  },
  partyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  partyTitleAccent: {
    width: 3,
    height: 12,
    backgroundColor: ACCENT,
    marginRight: 8,
  },
  partyTitle: {
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 1,
    color: INK,
  },
  partyLine: {
    fontSize: 9,
    marginBottom: 3,
    color: INK,
    lineHeight: 1.35,
  },
  partyBold: {
    fontWeight: 700,
    marginBottom: 5,
    fontSize: 10,
  },
  tableHeaderWrap: {
    flexDirection: "row",
    backgroundColor: INK,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginTop: 16,
  },
  thNr: { width: "6%", fontSize: 7, fontWeight: 700, color: "#fff" },
  thDesc: { width: "46%", fontSize: 7, fontWeight: 700, color: "#fff" },
  thQty: { width: "12%", fontSize: 7, fontWeight: 700, color: "#fff", textAlign: "right" },
  thPrice: { width: "18%", fontSize: 7, fontWeight: 700, color: "#fff", textAlign: "right" },
  thSum: { width: "18%", fontSize: 7, fontWeight: 700, color: "#fff", textAlign: "right" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tdNr: { width: "6%", fontSize: 9, color: INK_MUTED },
  tdDesc: { width: "46%", fontSize: 9, paddingRight: 6, color: INK },
  tdQty: { width: "12%", fontSize: 9, textAlign: "right", color: INK },
  tdPrice: { width: "18%", fontSize: 9, textAlign: "right", color: INK },
  tdSum: { width: "18%", fontSize: 9, textAlign: "right", fontWeight: 700, color: INK },
  totalsWrap: {
    marginTop: 14,
    alignItems: "flex-end",
  },
  totalsInner: {
    width: "48%",
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fafafa",
  },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 9,
    color: INK_MUTED,
  },
  totalValue: {
    fontSize: 9,
    fontWeight: 700,
    color: INK,
  },
  taxNote: {
    marginTop: 6,
    fontSize: 8,
    color: INK_MUTED,
    textAlign: "right",
    lineHeight: 1.4,
  },
  grandTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: ACCENT,
  },
  grandTotalLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: INK,
  },
  grandTotalValue: {
    fontSize: 11,
    fontWeight: 700,
    color: INK,
  },
  notesSection: {
    marginTop: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  notesTitle: {
    fontSize: 7,
    fontWeight: 700,
    marginBottom: 6,
    letterSpacing: 1,
    color: INK_MUTED,
  },
  notesBody: {
    fontSize: 8.5,
    lineHeight: 1.45,
    color: INK,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
    fontSize: 7,
    color: INK_MUTED,
    textAlign: "center",
    lineHeight: 1.45,
  },
});

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("lt-LT", {
      style: "currency",
      currency: currency.length === 3 ? currency : "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function InvoicePdfDocument({ data }: { data: InvoicePayload }) {
  const logoPath = resolveInvoiceLogoPathForPdf();
  const subtotal = computeInvoiceSubtotal(data.line_items);
  const buyerIdLines = buyerIdentificationPdfLines(data);
  const pdfTitle = getPdfTitle(data.document_type);
  const vatMode = showVatBreakdown(data);
  const serviceMeta = serviceTimingPdfMeta(data);
  const sellerEmail = data.seller_email?.trim() || "";
  const sellerPhone = data.seller_phone?.trim() || "";
  const sellerFooterContact =
    formatSellerContactLine(sellerEmail, sellerPhone) || data.seller_contact_line?.trim() || "";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topAccent} fixed />

        <View style={styles.headerRow}>
          <View style={styles.brandBlock}>
            {logoPath ? (
              <Image src={logoPath} style={styles.logo} />
            ) : (
              <Text style={styles.wordmark}>{data.seller_name}</Text>
            )}
          </View>
          <View style={styles.headerContactCol}>
            <Text style={styles.headerContactLabel}>KONTAKTAI</Text>
            <Text style={styles.headerContactLine}>{sellerEmail || "—"}</Text>
            <Text style={styles.headerContactLine}>{sellerPhone || "—"}</Text>
          </View>
        </View>

        <View style={styles.titleBand}>
          <View style={styles.titleAccentBar} />
          <View style={styles.titleTextCol}>
            <Text style={styles.invoiceNumber}>{data.invoice_number}</Text>
            <Text style={styles.documentTitle}>{pdfTitle}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>IŠRAŠYMO DATA</Text>
            <Text style={styles.metaValue}>{data.issue_date}</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>{serviceMeta.label}</Text>
            <Text style={styles.metaValue}>{serviceMeta.value}</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>APMOKĖJIMO TERMINAS</Text>
            <Text style={styles.metaValue}>{data.due_date}</Text>
          </View>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyCard}>
            <View style={styles.partyTitleRow}>
              <View style={styles.partyTitleAccent} />
              <Text style={styles.partyTitle}>PARDAVĖJAS</Text>
            </View>
            <Text style={[styles.partyLine, styles.partyBold]}>{data.seller_name}</Text>
            <Text style={styles.partyLine}>Įmonės kodas: {data.seller_code}</Text>
            <Text style={styles.partyLine}>{data.seller_address}</Text>
            <Text style={styles.partyLine}>El. paštas: {sellerEmail || "—"}</Text>
            <Text style={styles.partyLine}>Tel.: {sellerPhone || "—"}</Text>
            <Text style={styles.partyLine}>Banko sąskaita: {data.seller_bank_account}</Text>
          </View>
          <View style={styles.partyCard}>
            <View style={styles.partyTitleRow}>
              <View style={styles.partyTitleAccent} />
              <Text style={styles.partyTitle}>PIRKĖJAS</Text>
            </View>
            <Text style={[styles.partyLine, styles.partyBold]}>{data.buyer_name}</Text>
            {buyerIdLines.map((line, i) => (
              <Text key={i} style={styles.partyLine}>
                {line}
              </Text>
            ))}
            {data.buyer_address?.trim() ? (
              <Text style={styles.partyLine}>{data.buyer_address.trim()}</Text>
            ) : null}
            {data.buyer_contact?.trim() ? (
              <Text style={styles.partyLine}>{data.buyer_contact.trim()}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.tableHeaderWrap}>
          <Text style={styles.thNr}>Nr.</Text>
          <Text style={styles.thDesc}>Paslaugos aprašymas</Text>
          <Text style={styles.thQty}>Kiekis</Text>
          <Text style={styles.thPrice}>Vieneto kaina</Text>
          <Text style={styles.thSum}>Suma</Text>
        </View>
        {data.line_items.map((row, i) => (
          <View key={i} style={styles.tableRow} wrap={false}>
            <Text style={styles.tdNr}>{i + 1}</Text>
            <Text style={styles.tdDesc}>{row.description}</Text>
            <Text style={styles.tdQty}>
              {row.quantity} {row.unit}
            </Text>
            <Text style={styles.tdPrice}>{formatMoney(row.unit_price, data.currency)}</Text>
            <Text style={styles.tdSum}>{formatMoney(row.line_total, data.currency)}</Text>
          </View>
        ))}

        <View style={styles.totalsWrap}>
          <View style={styles.totalsInner}>
            {vatMode ? (
              <>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>Suma be PVM</Text>
                  <Text style={styles.totalValue}>{formatMoney(subtotal, data.currency)}</Text>
                </View>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>PVM</Text>
                  <Text style={[styles.totalValue, { fontWeight: 400 }]}>{data.vat_summary_line}</Text>
                </View>
                <View style={[styles.totalLine, styles.grandTotal]}>
                  <Text style={styles.grandTotalLabel}>Iš viso</Text>
                  <Text style={styles.grandTotalValue}>{formatMoney(subtotal, data.currency)}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.totalLine, styles.grandTotal]}>
                  <Text style={styles.grandTotalLabel}>Iš viso</Text>
                  <Text style={styles.grandTotalValue}>{formatMoney(subtotal, data.currency)}</Text>
                </View>
                {data.vat_summary_line?.trim() ? (
                  <Text style={styles.taxNote}>{data.vat_summary_line.trim()}</Text>
                ) : null}
              </>
            )}
          </View>
        </View>

        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>PASTABOS</Text>
          <Text style={styles.notesBody}>{data.notes.trim() || "—"}</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            {data.seller_name} · Įmonės kodas: {data.seller_code} · {data.seller_address}
          </Text>
          <Text>
            {sellerFooterContact}
            {sellerFooterContact && data.seller_bank_account ? " · " : ""}
            {data.seller_bank_account}
          </Text>
          <Text>
            {data.invoice_number} · {data.issue_date}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
