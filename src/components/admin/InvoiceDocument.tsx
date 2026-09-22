import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import {
  formatDocDate,
  formatShortDate,
  money,
  type InvoiceItem,
  type InvoiceType,
  type PracticeSettings,
} from "@/lib/invoices";

const INDIGO = "#30199F";
const TEAL = "#3DD7EC";
const INK = "#14171C";
const GREY = "#5B6472";
const HAIRLINE = "#E4E6EA";

export type InvoiceDocData = {
  invoice_number: string;
  invoice_type: InvoiceType;
  patient_name: string;
  patient_email: string | null;
  patient_phone: string | null;
  patient_address: string | null;
  medical_aid_name: string | null;
  medical_aid_plan: string | null;
  medical_aid_member_number: string | null;
  dependant_code: string | null;
  date_issued: string;
  due_date: string | null;
  date_paid: string | null;
  items: InvoiceItem[];
  subtotal: number;
  paid_amount: number;
  total_due: number;
};

const s = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    paddingTop: 38,
    paddingBottom: 46,
    paddingHorizontal: 40,
    fontSize: 9,
    color: INK,
    fontFamily: "Helvetica",
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brandRow: { flexDirection: "column", maxWidth: 260 },
  logo: { width: 220, height: 42, objectFit: "contain", marginTop: 10 },
  practiceName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: INDIGO },
  roleLine: { fontSize: 8, color: GREY, marginTop: 6, maxWidth: 240 },
  docTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: INDIGO, textAlign: "right" },
  metaLine: { fontSize: 8.5, color: GREY, textAlign: "right", marginTop: 3 },
  metaStrong: { color: INK, fontFamily: "Helvetica-Bold" },
  pill: {
    marginTop: 8,
    alignSelf: "flex-end",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
  },
  rule: { height: 1, backgroundColor: HAIRLINE, marginTop: 22 },
  infoRow: { flexDirection: "row", marginTop: 20 },
  infoCol: { width: "50%", paddingRight: 18 },
  infoLabel: { fontSize: 7.5, letterSpacing: 1.1, color: TEAL, fontFamily: "Helvetica-Bold" },
  infoName: { marginTop: 7, fontSize: 11, fontFamily: "Helvetica-Bold" },
  infoText: { marginTop: 3, fontSize: 8.5, color: GREY, lineHeight: 1.45 },
  tableHead: {
    flexDirection: "row",
    backgroundColor: INDIGO,
    color: "#FFFFFF",
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginTop: 26,
    fontSize: 7.5,
    letterSpacing: 0.8,
    fontFamily: "Helvetica-Bold",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
  },
  cDate: { width: "15%" },
  cDesc: { width: "39%", paddingRight: 8 },
  cCode: { width: "14%" },
  cQty: { width: "8%", textAlign: "right" },
  cUnit: { width: "12%", textAlign: "right" },
  cAmt: { width: "12%", textAlign: "right" },
  totals: { marginTop: 16, alignSelf: "flex-end", width: 240 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  totalLabel: { fontSize: 9, color: GREY },
  totalValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: INDIGO,
  },
  grandLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: INDIGO },
  grandValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: INDIGO },
  panel: {
    marginTop: 26,
    borderWidth: 1,
    borderColor: HAIRLINE,
    borderLeftWidth: 3,
    borderLeftColor: TEAL,
    padding: 12,
  },
  panelTitle: { fontSize: 7.5, letterSpacing: 1.1, color: INDIGO, fontFamily: "Helvetica-Bold" },
  bankRow: { flexDirection: "row", marginTop: 10 },
  bankCell: { width: "25%" },
  bankLabel: { fontSize: 7.5, color: GREY },
  bankValue: { fontSize: 9, marginTop: 3, fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 26,
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
    paddingTop: 8,
  },
  footerBrand: { fontSize: 9, fontFamily: "Helvetica-Bold", color: INDIGO },
  footerText: { fontSize: 7, color: GREY, marginTop: 4, lineHeight: 1.4 },
});

function joinParts(parts: Array<string | null | undefined>, sep = " - ") {
  return parts.filter((p) => p && String(p).trim().length > 0).join(sep);
}

export function InvoiceDocument({
  data,
  settings,
  logoSrc,
}: {
  data: InvoiceDocData;
  settings: PracticeSettings;
  logoSrc?: string | undefined;
}) {
  const isDue = data.invoice_type === "payment_due";
  const statusLabel = isDue ? "PAYMENT DUE" : "PAID IN FULL";

  return (
    <Document title={`${data.invoice_number} ${isDue ? "Invoice" : "Receipt"}`}>
      <Page size="A4" style={s.page}>
        <View style={s.topRow}>
          <View style={s.brandRow}>
            {logoSrc ? (
              <Image src={logoSrc} style={s.logo} />
            ) : (
              <Text style={s.practiceName}>{settings.practice_name}</Text>
            )}
          </View>
          <View>
            <Text style={s.docTitle}>{isDue ? "INVOICE" : "RECEIPT"}</Text>
            <Text style={s.metaLine}>
              Invoice No. <Text style={s.metaStrong}>{data.invoice_number}</Text>
            </Text>
            <Text style={s.metaLine}>Date Issued {formatDocDate(data.date_issued)}</Text>
            {isDue ? (
              <Text style={s.metaLine}>Payment Due {formatDocDate(data.due_date)}</Text>
            ) : (
              <Text style={s.metaLine}>Date Paid {formatDocDate(data.date_paid)}</Text>
            )}
            <Text
              style={[
                s.pill,
                isDue
                  ? { backgroundColor: "#EFECFB", color: INDIGO }
                  : { backgroundColor: "#E4FAFD", color: "#0E6B7A" },
              ]}
            >
              {statusLabel}
            </Text>
          </View>
        </View>

        <View style={s.rule} />

        <View style={s.infoRow}>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>{isDue ? "BILLED TO" : "PATIENT"}</Text>
            <Text style={s.infoName}>{data.patient_name}</Text>
            {data.patient_address ? <Text style={s.infoText}>{data.patient_address}</Text> : null}
            <Text style={s.infoText}>{joinParts([data.patient_phone, data.patient_email], " · ")}</Text>
            {data.medical_aid_name || data.medical_aid_plan ? (
              <Text style={s.infoText}>
                {joinParts(
                  [
                    data.medical_aid_name ? `Medical Aid: ${data.medical_aid_name}` : null,
                    data.medical_aid_plan ? `Plan: ${data.medical_aid_plan}` : null,
                  ],
                  " · ",
                )}
              </Text>
            ) : null}
            {data.medical_aid_member_number || data.dependant_code ? (
              <Text style={s.infoText}>
                {joinParts(
                  [
                    data.medical_aid_member_number ? `Member No: ${data.medical_aid_member_number}` : null,
                    data.dependant_code ? `Dependant Code: ${data.dependant_code}` : null,
                  ],
                  " · ",
                )}
              </Text>
            ) : null}
          </View>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>PRACTICE</Text>
            <Text style={s.infoName}>{settings.provider_name}</Text>
            <Text style={s.infoText}>{joinParts([settings.address_line1, settings.address_line2], ", ")}</Text>
            <Text style={s.infoText}>{joinParts([settings.city, settings.postal_code, settings.country], ", ")}</Text>
            <Text style={s.infoText}>{joinParts([settings.contact_email, settings.contact_phone], " · ")}</Text>
            <Text style={s.infoText}>
              Practice No: {settings.practice_number} · MP No: {settings.mp_number}
            </Text>
          </View>
        </View>

        <View style={s.tableHead}>
          <Text style={s.cDate}>DATE</Text>
          <Text style={s.cDesc}>DESCRIPTION</Text>
          <Text style={s.cCode}>CODE</Text>
          <Text style={s.cQty}>QTY</Text>
          <Text style={s.cUnit}>UNIT PRICE</Text>
          <Text style={s.cAmt}>AMOUNT</Text>
        </View>

        {data.items.map((item, index) => (
          <View key={index} style={s.row} wrap={false}>
            <Text style={s.cDate}>{formatShortDate(item.item_date)}</Text>
            <Text style={s.cDesc}>{item.description}</Text>
            <Text style={s.cCode}>{item.icd10_code ?? ""}</Text>
            <Text style={s.cQty}>{item.quantity}</Text>
            <Text style={s.cUnit}>{money(item.unit_price)}</Text>
            <Text style={s.cAmt}>{money(item.amount)}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>{money(data.subtotal)}</Text>
          </View>
          {isDue ? (
            <View style={s.grand}>
              <Text style={s.grandLabel}>Amount Due</Text>
              <Text style={s.grandValue}>{money(data.total_due)}</Text>
            </View>
          ) : (
            <>
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Paid by Patient</Text>
                <Text style={s.totalValue}>{money(data.paid_amount)}</Text>
              </View>
              <View style={s.grand}>
                <Text style={s.grandLabel}>Balance</Text>
                <Text style={s.grandValue}>{money(data.total_due)}</Text>
              </View>
            </>
          )}
        </View>

        {isDue ? (
          <View style={s.panel}>
            <Text style={s.panelTitle}>PAYMENT / BANKING DETAILS</Text>
            <View style={s.bankRow}>
              <View style={s.bankCell}>
                <Text style={s.bankLabel}>Account Holder</Text>
                <Text style={s.bankValue}>{settings.bank_account_holder ?? "-"}</Text>
              </View>
              <View style={s.bankCell}>
                <Text style={s.bankLabel}>Bank</Text>
                <Text style={s.bankValue}>{settings.bank_name ?? "-"}</Text>
              </View>
              <View style={s.bankCell}>
                <Text style={s.bankLabel}>Account No.</Text>
                <Text style={s.bankValue}>{settings.bank_account_number ?? "-"}</Text>
              </View>
              <View style={s.bankCell}>
                <Text style={s.bankLabel}>Branch Code</Text>
                <Text style={s.bankValue}>{settings.bank_branch_code ?? "-"}</Text>
              </View>
            </View>
            <Text style={[s.infoText, { marginTop: 10 }]}>
              Payment Reference {data.invoice_number}
              {settings.proof_of_payment_email ? ` · Proof of Payment ${settings.proof_of_payment_email}` : ""}
            </Text>
          </View>
        ) : (
          <View style={s.panel}>
            <Text style={s.panelTitle}>FOR MEDICAL AID REIMBURSEMENT</Text>
            <Text style={[s.infoText, { marginTop: 8 }]}>
              This account has been settled in full by the patient. Please use the code(s) and practice/provider numbers
              above to submit this receipt to your medical aid for reimbursement. Reimbursement will be paid directly to
              the patient by the medical aid.
            </Text>
          </View>
        )}

        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>{settings.practice_name}</Text>
          <Text style={s.footerText}>
            {isDue
              ? "Terms & Conditions: Payment is due within the period stated above. Accounts unpaid after the due date may incur a late payment reminder. This invoice is issued electronically and no signature is required. All amounts are quoted in South African Rand (ZAR)."
              : "Terms & Conditions: This receipt confirms payment received in full and is issued electronically; no signature is required. Reimbursement from your medical aid is subject to your plan's rules and is not guaranteed by this practice. All amounts are quoted in South African Rand (ZAR)."}
          </Text>
          <Text style={s.footerText}>{settings.vat_exempt_note}</Text>
        </View>
      </Page>
    </Document>
  );
}
