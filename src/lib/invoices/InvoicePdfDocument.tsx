import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { InvoicePayload } from "./types";
import { computeInvoiceSubtotal } from "./types";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "NotoSans",
    fontSize: 9,
    color: "#111",
  },
  sellerHeader: {
    marginBottom: 16,
  },
  sellerName: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
  },
  sellerContact: {
    fontSize: 9,
    color: "#333",
  },
  centerBlock: {
    alignItems: "center",
    marginBottom: 14,
  },
  invoiceNumber: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 1,
    marginBottom: 6,
  },
  documentTitle: {
    fontSize: 11,
    fontWeight: 700,
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 10,
  },
  metaCol: {
    flex: 1,
    paddingRight: 8,
  },
  metaLabel: {
    fontSize: 7,
    fontWeight: 700,
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 9,
  },
  partiesRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  partyCol: {
    flex: 1,
    paddingRight: 10,
  },
  partyTitle: {
    fontSize: 7,
    fontWeight: 700,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  partyLine: {
    fontSize: 9,
    marginBottom: 3,
  },
  partyBold: {
    fontWeight: 700,
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 4,
    marginBottom: 4,
  },
  thNr: { width: "6%", fontSize: 7, fontWeight: 700 },
  thDesc: { width: "46%", fontSize: 7, fontWeight: 700 },
  thQty: { width: "12%", fontSize: 7, fontWeight: 700, textAlign: "right" },
  thPrice: { width: "18%", fontSize: 7, fontWeight: 700, textAlign: "right" },
  thSum: { width: "18%", fontSize: 7, fontWeight: 700, textAlign: "right" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  tdNr: { width: "6%", fontSize: 9 },
  tdDesc: { width: "46%", fontSize: 9, paddingRight: 6 },
  tdQty: { width: "12%", fontSize: 9, textAlign: "right" },
  tdPrice: { width: "18%", fontSize: 9, textAlign: "right" },
  tdSum: { width: "18%", fontSize: 9, textAlign: "right" },
  totals: {
    marginTop: 10,
    alignItems: "flex-end",
  },
  totalLine: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 3,
    width: "100%",
  },
  totalLabel: {
    width: "35%",
    textAlign: "right",
    paddingRight: 8,
    fontSize: 9,
  },
  totalValue: {
    width: "22%",
    textAlign: "right",
    fontSize: 9,
    fontWeight: 700,
  },
  grandTotal: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#000",
  },
  notesSection: {
    marginTop: 16,
  },
  notesTitle: {
    fontSize: 7,
    fontWeight: 700,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  notesBody: {
    fontSize: 8,
    lineHeight: 1.4,
    color: "#222",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 36,
    right: 36,
    borderTopWidth: 0.5,
    borderTopColor: "#aaa",
    paddingTop: 8,
    fontSize: 7,
    color: "#444",
    textAlign: "center",
    lineHeight: 1.35,
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
  const subtotal = computeInvoiceSubtotal(data.line_items);
  const buyerCodeLine = data.buyer_code?.trim()
    ? `Įmonės kodas: ${data.buyer_code.trim()}`
    : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.sellerHeader}>
          <Text style={styles.sellerName}>{data.seller_name}</Text>
          <Text style={styles.sellerContact}>{data.seller_contact_line}</Text>
        </View>

        <View style={styles.centerBlock}>
          <Text style={styles.invoiceNumber}>{data.invoice_number}</Text>
          <Text style={styles.documentTitle}>{data.document_title}</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>IŠRAŠYMO DATA</Text>
            <Text style={styles.metaValue}>{data.issue_date}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>APMOKĖJIMO TERMINAS</Text>
            <Text style={styles.metaValue}>{data.due_date}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>TIPAS</Text>
            <Text style={styles.metaValue}>{data.invoice_type}</Text>
          </View>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyCol}>
            <Text style={styles.partyTitle}>PARDAVĖJAS</Text>
            <Text style={[styles.partyLine, styles.partyBold]}>{data.seller_name}</Text>
            <Text style={styles.partyLine}>Įmonės kodas: {data.seller_code}</Text>
            <Text style={styles.partyLine}>{data.seller_address}</Text>
            <Text style={styles.partyLine}>{data.seller_contact_line}</Text>
            <Text style={styles.partyLine}>Banko sąskaita: {data.seller_bank_account}</Text>
          </View>
          <View style={styles.partyCol}>
            <Text style={styles.partyTitle}>PIRKĖJAS</Text>
            <Text style={[styles.partyLine, styles.partyBold]}>{data.buyer_name}</Text>
            {buyerCodeLine ? <Text style={styles.partyLine}>{buyerCodeLine}</Text> : null}
            {data.buyer_address?.trim() ? (
              <Text style={styles.partyLine}>{data.buyer_address.trim()}</Text>
            ) : null}
            {data.buyer_contact?.trim() ? (
              <Text style={styles.partyLine}>{data.buyer_contact.trim()}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.thNr}>Nr.</Text>
          <Text style={styles.thDesc}>Paslaugos aprašymas</Text>
          <Text style={styles.thQty}>Kiekis</Text>
          <Text style={styles.thPrice}>Kaina</Text>
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

        <View style={styles.totals}>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>Suma be PVM:</Text>
            <Text style={styles.totalValue}>{formatMoney(subtotal, data.currency)}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>PVM:</Text>
            <Text style={[styles.totalValue, { fontWeight: 400 }]}>{data.vat_summary_line}</Text>
          </View>
          <View style={[styles.totalLine, styles.grandTotal]}>
            <Text style={styles.totalLabel}>IŠ VISO:</Text>
            <Text style={styles.totalValue}>{formatMoney(subtotal, data.currency)}</Text>
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
            {data.seller_contact_line} · {data.seller_bank_account}
          </Text>
          <Text>
            {data.invoice_number} · {data.issue_date}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
