import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import {
  useAssets,
  useCategories,
  useExpenses,
  useInvoices,
  usePayments,
} from "@/components/admin/accounting/data";
import { Badge, ExportButton } from "@/components/admin/accounting/widgets";
import { Segmented } from "@/components/admin/form";
import { IconButton, LoadingRows, PageHeader, Panel, tableHeadClass } from "@/components/admin/ui";
import {
  METHOD_LABELS,
  PAID_FROM_LABELS,
  PAYER_LABELS,
  PAYER_TYPES,
  addMonths,
  daysBetween,
  feeTotal,
  inRange,
  monthOf,
  periodRange,
  receivedTotal,
  roundMoney,
  shortMonthLabel,
  sumMoney,
  taxYearOf,
  type DateRange,
  type Expense,
  type Payment,
} from "@/lib/accounting";
import { ASSET_TYPE_LABELS, allowanceInRange, bookValue, type Asset } from "@/lib/assets";
import { downloadWorkbook } from "@/lib/excel";
import { formatDocDate, money, todayIso, type Invoice } from "@/lib/invoices";
import { cn } from "@/lib/utils";

type Scope = "year" | "first" | "second";

const SCOPES: ReadonlyArray<{ value: Scope; label: string }> = [
  { value: "year", label: "Full tax year" },
  { value: "first", label: "Mar – Aug" },
  { value: "second", label: "Sep – Feb" },
];

function scopeRange(startYear: number, scope: Scope): DateRange {
  const year = periodRange({ kind: "tax_year", startYear });
  if (scope === "first") return { from: year.from, to: `${startYear}-08-31` };
  if (scope === "second") return { from: `${startYear}-09-01`, to: year.to };
  return year;
}

function scopeTitle(startYear: number, scope: Scope): string {
  const ty = `${startYear}/${String(startYear + 1).slice(2)}`;
  if (scope === "first") return `1 March – 31 August ${startYear} (tax year ${ty}, first half)`;
  if (scope === "second")
    return `1 September ${startYear} – end February ${startYear + 1} (tax year ${ty}, second half)`;
  return `Tax year ${ty} (1 March ${startYear} – end February ${startYear + 1})`;
}

function provisionalNote(startYear: number, scope: Scope): string | null {
  if (scope === "first")
    return `First provisional tax payment (IRP6) is due by 31 August ${startYear}.`;
  if (scope === "second")
    return `Second provisional tax payment (IRP6) is due by the end of February ${startYear + 1}.`;
  return null;
}

type StatementRow = {
  label: string;
  amount: number | null;
  kind: "section" | "line" | "subtotal" | "total";
};

const AGE_BUCKETS = [
  { label: "0 – 30 days", min: 0, max: 30 },
  { label: "31 – 60 days", min: 31, max: 60 },
  { label: "61 – 90 days", min: 61, max: 90 },
  { label: "Over 90 days", min: 91, max: Number.POSITIVE_INFINITY },
] as const;

export function ReportsPage() {
  const today = todayIso();
  const current = taxYearOf(today);
  const [startYear, setStartYear] = useState(
    current.kind === "tax_year" ? current.startYear : 2026,
  );
  const [scope, setScope] = useState<Scope>("year");
  const range = scopeRange(startYear, scope);

  const payments = usePayments(range);
  const expenses = useExpenses(range);
  const categories = useCategories();
  const assets = useAssets();
  const invoices = useInvoices();
  const loading =
    payments.isLoading || expenses.isLoading || categories.isLoading || assets.isLoading;

  const cats = categories.data ?? [];
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const capitalIds = new Set(cats.filter((c) => !c.affects_profit).map((c) => c.id));
  const pays = (payments.data ?? []).filter((p) => inRange(p.payment_date, range));
  const exps = (expenses.data ?? []).filter((e) => inRange(e.expense_date, range));
  const paidExps = exps.filter((e) => e.status === "paid");
  const operatingExps = paidExps.filter((e) => !capitalIds.has(e.category_id));
  const assetList = assets.data ?? [];

  // --- Profit and loss ------------------------------------------------------
  const incomeByPayer = PAYER_TYPES.map((t) => ({
    type: t,
    total: receivedTotal(pays.filter((p) => p.payer_type === t)),
  })).filter((r) => r.total !== 0);
  const income = receivedTotal(pays);
  const fees = feeTotal(pays);

  const byCategory = [...new Set(operatingExps.map((e) => e.category_id))]
    .map((id) => ({
      name: catName.get(id) ?? "Uncategorised",
      total: sumMoney(operatingExps.filter((e) => e.category_id === id).map((e) => e.amount)),
    }))
    .sort((a, b) => b.total - a.total);
  const operating = sumMoney(byCategory.map((c) => c.total));
  const writeOff = sumMoney(assetList.map((a) => allowanceInRange(a, range)));
  const totalCosts = roundMoney(fees + operating + writeOff);
  const profit = roundMoney(income - totalCosts);

  const statement: StatementRow[] = [
    { label: "Income", amount: null, kind: "section" },
    ...(incomeByPayer.length
      ? incomeByPayer.map((r) => ({
          label: `Received from ${PAYER_LABELS[r.type].toLowerCase()}s`,
          amount: r.total,
          kind: "line" as const,
        }))
      : [{ label: "No income received", amount: 0, kind: "line" as const }]),
    { label: "Total income", amount: income, kind: "subtotal" },
    { label: "Expenses", amount: null, kind: "section" },
    ...byCategory.map((c) => ({ label: c.name, amount: c.total, kind: "line" as const })),
    ...(fees ? [{ label: "Card and payment fees", amount: fees, kind: "line" as const }] : []),
    ...(writeOff
      ? [{ label: "Equipment write-off (wear and tear)", amount: writeOff, kind: "line" as const }]
      : []),
    ...(totalCosts ? [] : [{ label: "No expenses recorded", amount: 0, kind: "line" as const }]),
    { label: "Total expenses", amount: totalCosts, kind: "subtotal" },
    { label: "Profit before tax", amount: profit, kind: "total" },
  ];

  // --- Month by month --------------------------------------------------------
  const months: DateRange[] = [];
  for (let m = range.from; m <= range.to; m = addMonths(m, 1)) {
    const p = monthOf(m);
    months.push(periodRange(p));
  }
  const monthly = months.map((r) => {
    const mp = pays.filter((p) => inRange(p.payment_date, r));
    const me = operatingExps.filter((e) => inRange(e.expense_date, r));
    const inc = receivedTotal(mp);
    const f = feeTotal(mp);
    const run = sumMoney(me.map((e) => e.amount));
    const wo = sumMoney(assetList.map((a) => allowanceInRange(a, r)));
    return {
      key: r.from,
      label: shortMonthLabel(monthOf(r.from)),
      income: inc,
      fees: f,
      running: run,
      writeOff: wo,
      profit: roundMoney(inc - f - run - wo),
    };
  });

  // --- Other figures -------------------------------------------------------
  const equipmentBought = sumMoney(
    paidExps.filter((e) => capitalIds.has(e.category_id)).map((e) => e.amount),
  );
  const paidPersonally = sumMoney(
    paidExps.filter((e) => e.paid_from === "personal").map((e) => e.amount),
  );
  const pending = sumMoney(pays.filter((p) => p.status === "pending").map((p) => p.amount));
  const unpaidBills = sumMoney(exps.filter((e) => e.status === "unpaid").map((e) => e.amount));

  // --- Aged debtors (as at today) -------------------------------------------
  const open = (invoices.data ?? []).filter(
    (i) => (i.status === "sent" || i.status === "overdue") && i.total_due > 0,
  );
  const aged = AGE_BUCKETS.map((b) => {
    const list = open.filter((i) => {
      const age = daysBetween(i.date_issued, today);
      return age >= b.min && age <= b.max;
    });
    return { ...b, count: list.length, total: sumMoney(list.map((i) => i.total_due)) };
  });
  const openTotal = sumMoney(open.map((i) => i.total_due));

  const note = provisionalNote(startYear, scope);
  const title = scopeTitle(startYear, scope);
  const fileSlug = `${startYear}-${String(startYear + 1).slice(2)}${scope === "year" ? "" : scope === "first" ? "-mar-aug" : "-sep-feb"}`;

  const exportExcel = () =>
    downloadWorkbook(`financial-report-${fileSlug}`, [
      {
        name: "Profit and loss",
        title: "Profit and loss statement",
        subtitle: `${title} · Dr Ben Azouz MH - General Practitioner · prepared ${formatDocDate(today)}`,
        rows: [
          ...statement,
          { label: "", amount: null, kind: "line" },
          { label: "Other figures", amount: null, kind: "section" },
          {
            label: "Equipment bought (written off separately)",
            amount: equipmentBought,
            kind: "line",
          },
          { label: "Expenses paid from personal account", amount: paidPersonally, kind: "line" },
          { label: "Payments pending", amount: pending, kind: "line" },
          { label: "Bills still to pay", amount: unpaidBills, kind: "line" },
        ],
        columns: [
          {
            header: "Item",
            width: 46,
            value: (r: StatementRow) => (r.kind === "line" && r.label ? `    ${r.label}` : r.label),
          },
          { header: "Amount", type: "money", width: 16, value: (r: StatementRow) => r.amount },
        ],
      },
      {
        name: "By month",
        title: "Month by month",
        subtitle: title,
        rows: monthly,
        columns: [
          { header: "Month", width: 12, value: (m: (typeof monthly)[number]) => m.label },
          {
            header: "Income",
            type: "money",
            total: true,
            value: (m: (typeof monthly)[number]) => m.income,
          },
          {
            header: "Fees",
            type: "money",
            total: true,
            value: (m: (typeof monthly)[number]) => m.fees,
          },
          {
            header: "Running costs",
            type: "money",
            total: true,
            value: (m: (typeof monthly)[number]) => m.running,
          },
          {
            header: "Equipment write-off",
            type: "money",
            width: 18,
            total: true,
            value: (m: (typeof monthly)[number]) => m.writeOff,
          },
          {
            header: "Profit",
            type: "money",
            total: true,
            value: (m: (typeof monthly)[number]) => m.profit,
          },
        ],
      },
      {
        name: "Income",
        title: "Payments",
        subtitle: title,
        rows: pays,
        columns: [
          { header: "Date", type: "date", value: (p: Payment) => p.payment_date },
          { header: "Patient", width: 26, value: (p: Payment) => p.patient_name },
          { header: "Paid by", width: 13, value: (p: Payment) => PAYER_LABELS[p.payer_type] },
          { header: "Payer name", width: 20, value: (p: Payment) => p.payer_name },
          {
            header: "Method",
            width: 12,
            value: (p: Payment) => (p.payment_method ? METHOD_LABELS[p.payment_method] : ""),
          },
          { header: "Status", width: 10, value: (p: Payment) => p.status },
          {
            header: "Amount",
            type: "money",
            total: true,
            value: (p: Payment) => (p.status === "received" ? p.amount : 0),
          },
          {
            header: "Fee",
            type: "money",
            total: true,
            value: (p: Payment) => (p.status === "received" ? p.fee_amount : 0),
          },
          { header: "Reference", width: 16, value: (p: Payment) => p.reference },
          { header: "Notes", width: 30, value: (p: Payment) => p.notes },
        ],
      },
      {
        name: "Expenses",
        title: "Expenses",
        subtitle: title,
        rows: exps,
        columns: [
          { header: "Date", type: "date", value: (e: Expense) => e.expense_date },
          { header: "Supplier", width: 24, value: (e: Expense) => e.supplier },
          { header: "Description", width: 30, value: (e: Expense) => e.description },
          {
            header: "Category",
            width: 24,
            value: (e: Expense) => catName.get(e.category_id) ?? "",
          },
          {
            header: "Running cost",
            width: 12,
            value: (e: Expense) => (capitalIds.has(e.category_id) ? "No" : "Yes"),
          },
          { header: "Status", width: 9, value: (e: Expense) => e.status },
          {
            header: "Amount",
            type: "money",
            total: true,
            value: (e: Expense) => (e.status === "paid" ? e.amount : 0),
          },
          { header: "Paid from", width: 17, value: (e: Expense) => PAID_FROM_LABELS[e.paid_from] },
          { header: "Receipt", width: 9, value: (e: Expense) => (e.receipt_path ? "Yes" : "No") },
          { header: "Reference", width: 16, value: (e: Expense) => e.reference },
        ],
      },
      {
        name: "Equipment",
        title: "Equipment write-off",
        subtitle: title,
        rows: assetList.filter((a) => a.purchase_date <= range.to),
        columns: [
          { header: "Item", width: 30, value: (a: Asset) => a.name },
          { header: "Type", width: 24, value: (a: Asset) => ASSET_TYPE_LABELS[a.asset_type] },
          { header: "Purchased", type: "date", value: (a: Asset) => a.purchase_date },
          { header: "Cost", type: "money", total: true, value: (a: Asset) => a.cost },
          { header: "Years", type: "number", width: 8, value: (a: Asset) => a.write_off_years },
          {
            header: "Write-off in period",
            type: "money",
            width: 18,
            total: true,
            value: (a: Asset) => allowanceInRange(a, range),
          },
          {
            header: "Value at period end",
            type: "money",
            width: 18,
            total: true,
            value: (a: Asset) => bookValue(a, range.to),
          },
          { header: "Disposed", type: "date", value: (a: Asset) => a.disposed_date },
        ],
      },
      {
        name: "Aged debtors",
        title: "Unpaid invoices by age",
        subtitle: `As at ${formatDocDate(today)}`,
        rows: open,
        columns: [
          { header: "Invoice", width: 12, value: (i: Invoice) => i.invoice_number },
          { header: "Patient", width: 26, value: (i: Invoice) => i.patient_name },
          { header: "Issued", type: "date", value: (i: Invoice) => i.date_issued },
          {
            header: "Days",
            type: "number",
            width: 8,
            value: (i: Invoice) => daysBetween(i.date_issued, today),
          },
          { header: "Amount due", type: "money", total: true, value: (i: Invoice) => i.total_due },
        ],
      },
    ]);

  return (
    <section>
      <PageHeader
        title="Reports"
        description="Profit and loss for a tax year or provisional-tax period, ready for your accountant."
        actions={<ExportButton onExport={exportExcel} disabled={loading} />}
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex h-9 items-center border border-hairline bg-white">
          <IconButton label="Previous tax year" onClick={() => setStartYear((y) => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <span className="min-w-[9.5rem] px-1 text-center text-sm font-semibold text-ink">
            Tax year {startYear}/{String(startYear + 1).slice(2)}
          </span>
          <IconButton label="Next tax year" onClick={() => setStartYear((y) => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="w-full sm:w-auto [&>div]:h-9 [&_button]:h-9">
          <Segmented label="Period" value={scope} onChange={setScope} options={SCOPES} />
        </div>
      </div>
      {note ? <p className="mt-3 text-sm text-grey">{note}</p> : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Panel className="p-5 sm:p-7">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-grey">
            Profit and loss
          </p>
          <h2 className="mt-1 font-display text-lg text-ink">{title}</h2>
          {loading ? (
            <div className="mt-4">
              <LoadingRows rows={6} />
            </div>
          ) : (
            <dl className="mt-5 text-sm">
              {statement.map((row, i) =>
                row.kind === "section" ? (
                  <dt
                    key={`${row.label}-${i}`}
                    className="mt-5 border-b border-hairline pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-grey first:mt-0"
                  >
                    {row.label}
                  </dt>
                ) : (
                  <div
                    key={`${row.label}-${i}`}
                    className={cn(
                      "flex items-baseline justify-between gap-4",
                      row.kind === "line" && "py-1.5 pl-3 text-grey",
                      row.kind === "subtotal" &&
                        "mt-1 border-t border-hairline py-2 font-semibold text-ink",
                      row.kind === "total" &&
                        "mt-5 border-y-2 border-ink py-3 font-display text-base text-ink",
                    )}
                  >
                    <dt>{row.label}</dt>
                    <dd
                      className={cn(
                        "tabular-nums",
                        row.kind === "total" && (profit >= 0 ? "text-emerald-700" : "text-red-700"),
                      )}
                    >
                      {row.amount == null ? "" : money(row.amount)}
                    </dd>
                  </div>
                ),
              )}
            </dl>
          )}
          <p className="mt-5 text-xs text-grey">
            Income counts payments marked received; expenses count paid running costs. Equipment is
            included through its SARS write-off rather than its purchase price. Figures are
            estimates for planning and provisional tax; your accountant confirms the final numbers.
          </p>
        </Panel>

        <div className="space-y-6">
          <Panel className="p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-ink">Other figures for this period</h2>
            <dl className="mt-3 divide-y divide-hairline text-sm">
              {[
                ["Equipment bought", equipmentBought, "Written off separately, not a running cost"],
                [
                  "Paid from personal account",
                  paidPersonally,
                  "Practice costs paid personally (sole proprietor)",
                ],
                ["Payments pending", pending, "Not yet counted as income"],
                ["Bills still to pay", unpaidBills, "Recorded but unpaid expenses"],
              ].map(([label, value, hint]) => (
                <div
                  key={label as string}
                  className="flex items-start justify-between gap-4 py-2.5"
                >
                  <div>
                    <dt className="text-ink">{label as string}</dt>
                    <p className="text-xs text-grey">{hint as string}</p>
                  </div>
                  <dd className="shrink-0 tabular-nums text-ink">{money(value as number)}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel className="p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink">Unpaid invoices by age</h2>
              <span className="text-xs text-grey">As at {formatDocDate(today)}</span>
            </div>
            <dl className="mt-3 divide-y divide-hairline text-sm">
              {aged.map((b) => (
                <div key={b.label} className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="flex items-center gap-2 text-ink">
                    {b.label}
                    {b.min > 90 && b.count > 0 ? <Badge tone="red">Follow up</Badge> : null}
                  </dt>
                  <dd className="tabular-nums text-ink">
                    {money(b.total)}
                    <span className="ml-2 text-xs text-grey">({b.count})</span>
                  </dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 py-2.5 font-semibold text-ink">
                <dt>Total outstanding</dt>
                <dd className="tabular-nums">{money(openTotal)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-grey">
              Medical schemes only pay claims submitted within four months of the consultation.
            </p>
          </Panel>
        </div>
      </div>

      <Panel className="mt-6">
        <div className="px-5 pt-5 sm:px-6">
          <h2 className="text-sm font-semibold text-ink">Month by month</h2>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className={tableHeadClass}>
                <th className="px-5 py-3 font-semibold sm:px-6">Month</th>
                <th className="px-4 py-3 text-right font-semibold">Income</th>
                <th className="px-4 py-3 text-right font-semibold">Fees</th>
                <th className="px-4 py-3 text-right font-semibold">Running costs</th>
                <th className="px-4 py-3 text-right font-semibold">Write-off</th>
                <th className="px-5 py-3 text-right font-semibold sm:px-6">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline tabular-nums">
              {monthly.map((m) => (
                <tr key={m.key}>
                  <td className="px-5 py-2.5 text-ink sm:px-6">{m.label}</td>
                  <td className="px-4 py-2.5 text-right text-ink">{money(m.income)}</td>
                  <td className="px-4 py-2.5 text-right text-grey">{money(m.fees)}</td>
                  <td className="px-4 py-2.5 text-right text-grey">{money(m.running)}</td>
                  <td className="px-4 py-2.5 text-right text-grey">{money(m.writeOff)}</td>
                  <td
                    className={cn(
                      "px-5 py-2.5 text-right font-semibold sm:px-6",
                      m.profit < 0 ? "text-red-700" : "text-ink",
                    )}
                  >
                    {money(m.profit)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-ink font-semibold text-ink">
                <td className="px-5 py-3 sm:px-6">Total</td>
                <td className="px-4 py-3 text-right">{money(income)}</td>
                <td className="px-4 py-3 text-right">{money(fees)}</td>
                <td className="px-4 py-3 text-right">{money(operating)}</td>
                <td className="px-4 py-3 text-right">{money(writeOff)}</td>
                <td
                  className={cn("px-5 py-3 text-right sm:px-6", profit < 0 ? "text-red-700" : "")}
                >
                  {money(profit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  );
}
