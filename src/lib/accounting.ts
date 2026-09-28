import type { Database } from "@/integrations/supabase/types";
import { money, toNumber } from "@/lib/invoices";

/*
 * Accounting domain: types, labels and pure helpers (dates, periods, money).
 * Keep calculations here so pages stay presentational and totals are computed
 * the same way everywhere, including Excel exports.
 */

type Tables = Database["public"]["Tables"];

// ---------------------------------------------------------------------------
// Enumerations (mirror the CHECK constraints in the accounting migration)
// ---------------------------------------------------------------------------

export const EXPENSE_METHODS = ["eft", "card", "cash", "debit_order", "online", "other"] as const;
export const PAYMENT_METHODS = ["eft", "card", "cash", "online", "other"] as const;
export const PAYER_TYPES = ["patient", "medical_aid", "insurer", "other"] as const;
export const FREQUENCIES = ["monthly", "quarterly", "annually"] as const;
export const PAID_FROM = ["personal", "practice"] as const;
export const EXPENSE_STATUSES = ["paid", "unpaid", "void"] as const;
export const PAYMENT_STATUSES = ["received", "pending", "void"] as const;

export type ExpenseMethod = (typeof EXPENSE_METHODS)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PayerType = (typeof PAYER_TYPES)[number];
export type Frequency = (typeof FREQUENCIES)[number];
export type PaidFrom = (typeof PAID_FROM)[number];
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const METHOD_LABELS: Record<ExpenseMethod, string> = {
  eft: "EFT",
  card: "Card",
  cash: "Cash",
  debit_order: "Debit order",
  online: "Online",
  other: "Other",
};

export const PAYER_LABELS: Record<PayerType, string> = {
  patient: "Patient",
  medical_aid: "Medical aid",
  insurer: "Insurer",
  other: "Other",
};

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Yearly",
};

export const PAID_FROM_LABELS: Record<PaidFrom, string> = {
  personal: "Personal account",
  practice: "Practice account",
};

// ---------------------------------------------------------------------------
// Row types (numeric columns normalised to numbers)
// ---------------------------------------------------------------------------

export type ExpenseCategory = Tables["expense_categories"]["Row"];

export type Expense = Omit<Tables["expenses"]["Row"], "payment_method" | "paid_from" | "status"> & {
  payment_method: ExpenseMethod | null;
  paid_from: PaidFrom;
  status: ExpenseStatus;
};

export type Payment = Omit<
  Tables["payments"]["Row"],
  "payment_method" | "payer_type" | "status"
> & {
  payment_method: PaymentMethod | null;
  payer_type: PayerType;
  status: PaymentStatus;
};

export type RecurringExpense = Omit<
  Tables["recurring_expenses"]["Row"],
  "frequency" | "payment_method" | "paid_from"
> & {
  frequency: Frequency;
  payment_method: ExpenseMethod | null;
  paid_from: PaidFrom;
};

export function normaliseExpense(row: Tables["expenses"]["Row"]): Expense {
  return {
    ...row,
    amount: toNumber(row.amount),
    vat_amount: toNumber(row.vat_amount),
  } as Expense;
}

export function normalisePayment(row: Tables["payments"]["Row"]): Payment {
  return {
    ...row,
    amount: toNumber(row.amount),
    fee_amount: toNumber(row.fee_amount),
  } as Payment;
}

export function normaliseRecurring(row: Tables["recurring_expenses"]["Row"]): RecurringExpense {
  return {
    ...row,
    fixed_amount: row.fixed_amount == null ? null : toNumber(row.fixed_amount),
    unit_amount: row.unit_amount == null ? null : toNumber(row.unit_amount),
  } as RecurringExpense;
}

// ---------------------------------------------------------------------------
// Money: sum in whole cents so totals never drift (0.1 + 0.2 problem)
// ---------------------------------------------------------------------------

export function sumMoney(values: Iterable<number>): number {
  let cents = 0;
  for (const value of values) cents += Math.round(value * 100);
  return cents / 100;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Parse a user-typed amount such as "1 240,30", "R620.30" or "1,070". */
export function parseAmount(input: string): number | null {
  let s = input.replace(/[R\s]/gi, "");
  if (!s) return null;
  // "620,30" / "1.240,30" (comma decimal) -> "620.30" / "1240.30";
  // "1,070" / "1,070.50" (comma thousands) -> "1070" / "1070.50"
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? roundMoney(n) : null;
}

// ---------------------------------------------------------------------------
// Dates (ISO yyyy-mm-dd strings; no timezone shifting)
// ---------------------------------------------------------------------------

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

const pad = (n: number) => String(n).padStart(2, "0");

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map((p) => Number.parseInt(p, 10));
  return [y ?? 1970, m ?? 1, d ?? 1];
}

/** Add whole months, clamping the day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = parts(iso);
  const index = y * 12 + (m - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${pad(month)}-${pad(Math.min(d, daysInMonth(year, month)))}`;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = parts(fromIso);
  const [ty, tm, td] = parts(toIso);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

export const FREQUENCY_MONTHS: Record<Frequency, number> = {
  monthly: 1,
  quarterly: 3,
  annually: 12,
};

export function nextDueAfter(iso: string, frequency: Frequency): string {
  return addMonths(iso, FREQUENCY_MONTHS[frequency]);
}

// ---------------------------------------------------------------------------
// Periods: calendar months and the SARS tax year (1 March - end February)
// ---------------------------------------------------------------------------

export type Period =
  { kind: "month"; year: number; month: number } | { kind: "tax_year"; startYear: number };

export type DateRange = { from: string; to: string };

export function periodRange(period: Period): DateRange {
  if (period.kind === "month") {
    const { year, month } = period;
    return {
      from: `${year}-${pad(month)}-01`,
      to: `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`,
    };
  }
  const end = period.startYear + 1;
  return { from: `${period.startYear}-03-01`, to: `${end}-02-${pad(daysInMonth(end, 2))}` };
}

export function periodLabel(period: Period): string {
  if (period.kind === "month") return `${MONTHS[period.month - 1]} ${period.year}`;
  return `Tax year ${period.startYear}/${String(period.startYear + 1).slice(2)}`;
}

/** Short label used in file names, e.g. "2026-09" or "tax-year-2026-27". */
export function periodSlug(period: Period): string {
  if (period.kind === "month") return `${period.year}-${pad(period.month)}`;
  return `tax-year-${period.startYear}-${String(period.startYear + 1).slice(2)}`;
}

export function shiftPeriod(period: Period, step: number): Period {
  if (period.kind === "tax_year") return { kind: "tax_year", startYear: period.startYear + step };
  const index = period.year * 12 + (period.month - 1) + step;
  return { kind: "month", year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function monthOf(iso: string): Period {
  const [y, m] = parts(iso);
  return { kind: "month", year: y, month: m };
}

export function taxYearOf(iso: string): Period {
  const [y, m] = parts(iso);
  return { kind: "tax_year", startYear: m >= 3 ? y : y - 1 };
}

/** Months for trend charts: the 6 ending at a month, or all 12 of a tax year. */
export function trendMonths(period: Period): Period[] {
  if (period.kind === "tax_year") {
    return Array.from({ length: 12 }, (_, i) => ({
      kind: "month" as const,
      year: period.startYear + (i >= 10 ? 1 : 0),
      month: ((i + 2) % 12) + 1,
    }));
  }
  return Array.from({ length: 6 }, (_, i) => shiftPeriod(period, i - 5));
}

export function inRange(iso: string, range: DateRange): boolean {
  return iso >= range.from && iso <= range.to;
}

export function shortMonthLabel(period: Period): string {
  if (period.kind !== "month") return periodLabel(period);
  return `${MONTHS[period.month - 1]?.slice(0, 3)} ${String(period.year).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Recurring costs
// ---------------------------------------------------------------------------

/** Expected amount for one billing period, given how many units were used. */
export function recurringAmount(
  item: Pick<RecurringExpense, "fixed_amount" | "unit_amount">,
  units = 0,
): number {
  return roundMoney((item.fixed_amount ?? 0) + (item.unit_amount ?? 0) * units);
}

export function isVariable(item: Pick<RecurringExpense, "fixed_amount" | "unit_amount">): boolean {
  return item.unit_amount != null || item.fixed_amount == null;
}

/** Recurring cost expressed per month, for "monthly commitments" totals. */
export function monthlyEquivalent(item: RecurringExpense): number {
  return roundMoney((item.fixed_amount ?? 0) / FREQUENCY_MONTHS[item.frequency]);
}

/** e.g. "R 1,782.50 + R 10.50 per claim", "R 850.00" or "Varies". */
export function amountLabel(item: RecurringExpense): string {
  const unit =
    item.unit_amount != null ? `${money(item.unit_amount)} per ${item.unit_label || "item"}` : null;
  if (item.fixed_amount != null && unit) return `${money(item.fixed_amount)} + ${unit}`;
  if (item.fixed_amount != null) return money(item.fixed_amount);
  return unit ?? "Varies";
}

export type DueState = "overdue" | "due_soon" | "upcoming";

export function dueState(nextDue: string, today: string): DueState {
  const days = daysBetween(today, nextDue);
  if (days < 0) return "overdue";
  if (days <= 7) return "due_soon";
  return "upcoming";
}

// ---------------------------------------------------------------------------
// Totals
// ---------------------------------------------------------------------------

export function receivedTotal(payments: Payment[]): number {
  return sumMoney(payments.filter((p) => p.status === "received").map((p) => p.amount));
}

export function feeTotal(payments: Payment[]): number {
  return sumMoney(payments.filter((p) => p.status === "received").map((p) => p.fee_amount));
}

/** Expenses that count toward profit (excludes void and capital categories). */
export function operatingExpenseTotal(expenses: Expense[], categories: ExpenseCategory[]): number {
  const capital = new Set(categories.filter((c) => !c.affects_profit).map((c) => c.id));
  return sumMoney(
    expenses.filter((e) => e.status === "paid" && !capital.has(e.category_id)).map((e) => e.amount),
  );
}
