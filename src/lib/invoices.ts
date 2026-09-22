export type InvoiceType = "payment_due" | "paid_receipt";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";

export type PracticeSettings = {
  id: string;
  practice_name: string;
  provider_name: string;
  role_line: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postal_code: string;
  country: string;
  contact_email: string;
  contact_phone: string;
  practice_number: string;
  mp_number: string;
  bank_account_holder: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_branch_code: string | null;
  proof_of_payment_email: string | null;
  logo_url: string | null;
  vat_exempt_note: string;
};

export type Patient = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  medical_aid_name: string | null;
  medical_aid_plan: string | null;
  medical_aid_member_number: string | null;
  dependant_code: string | null;
};

export type InvoiceItem = {
  id?: string;
  item_date: string;
  description: string;
  icd10_code: string | null;
  quantity: number;
  unit_price: number;
  amount: number;
  sort_order: number;
};

export type Invoice = {
  id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  status: InvoiceStatus;
  patient_id: string | null;
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
  subtotal: number;
  paid_amount: number;
  total_due: number;
  pdf_url: string | null;
  admin_note: string | null;
  created_at: string;
};

export const INVOICE_STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "overdue", "void"];

export const INK = "#14171C";
export const INDIGO = "#30199F";
export const TEAL = "#3DD7EC";

export function money(value: number): string {
  const fixed = Math.abs(value).toFixed(2);
  const [whole, cents] = fixed.split(".");
  const grouped = (whole ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${value < 0 ? "-" : ""}R ${grouped}.${cents}`;
}

export function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** 2026-09-16 -> 16 September 2026 (no timezone shifting). */
export function formatDocDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map((p) => Number.parseInt(p, 10));
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** 2026-08-19 -> "19 Aug\n2026" style parts for the items table. */
export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map((p) => Number.parseInt(p, 10));
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]?.slice(0, 3)} ${y}`;
}

export function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Today's date in South African Standard Time (UTC+2). */
export function todayIso(): string {
  const now = new Date();
  return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function invoiceTypeLabel(type: InvoiceType): string {
  return type === "payment_due" ? "Invoice" : "Receipt";
}
