import { Link } from "@tanstack/react-router";
import { ArrowRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import {
  useCategories,
  useExpenses,
  useInvoices,
  usePayments,
  useRecurring,
} from "@/components/admin/accounting/data";
import { ExpenseDialog } from "@/components/admin/accounting/ExpenseDialog";
import { PaymentDialog, type PaymentPrefill } from "@/components/admin/accounting/PaymentDialog";
import { MarkPaidDialog } from "@/components/admin/accounting/RecurringDialogs";
import { DueBadge } from "@/components/admin/accounting/RecurringPage";
import { TrendChart, type TrendPoint } from "@/components/admin/accounting/TrendChart";
import {
  BreakdownRow,
  ExportButton,
  PeriodPicker,
  StatCard,
} from "@/components/admin/accounting/widgets";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  PAYER_LABELS,
  PAYER_TYPES,
  amountLabel,
  daysBetween,
  dueState,
  feeTotal,
  inRange,
  monthOf,
  operatingExpenseTotal,
  periodLabel,
  periodRange,
  periodSlug,
  receivedTotal,
  roundMoney,
  shiftPeriod,
  shortMonthLabel,
  sumMoney,
  trendMonths,
  type Period,
  type RecurringExpense,
} from "@/lib/accounting";
import { downloadWorkbook } from "@/lib/excel";
import { formatDocDate, money, todayIso } from "@/lib/invoices";

export function AccountingOverview() {
  const today = todayIso();
  const [period, setPeriod] = useState<Period>(() => monthOf(today));
  const range = periodRange(period);
  const months = useMemo(() => trendMonths(period), [period]);
  // One fetch covers the whole trend; the selected period is always inside it.
  const fetchRange = {
    from: periodRange(months[0]!).from,
    to: periodRange(months[months.length - 1]!).to,
  };

  const payments = usePayments(fetchRange);
  const expenses = useExpenses(fetchRange);
  const categories = useCategories();
  const recurring = useRecurring();
  const invoices = useInvoices();

  const [dialog, setDialog] = useState<
    | { kind: "expense" }
    | { kind: "payment"; prefill?: PaymentPrefill }
    | { kind: "recurring"; item: RecurringExpense }
    | null
  >(null);

  const cats = categories.data ?? [];
  const periodPayments = (payments.data ?? []).filter((p) => inRange(p.payment_date, range));
  const periodExpenses = (expenses.data ?? []).filter((e) => inRange(e.expense_date, range));

  const income = receivedTotal(periodPayments);
  const fees = feeTotal(periodPayments);
  const operating = operatingExpenseTotal(periodExpenses, cats);
  const profit = roundMoney(income - fees - operating);
  const capitalIds = new Set(cats.filter((c) => !c.affects_profit).map((c) => c.id));
  const capital = sumMoney(
    periodExpenses
      .filter((e) => e.status === "paid" && capitalIds.has(e.category_id))
      .map((e) => e.amount),
  );
  const personal = sumMoney(
    periodExpenses
      .filter((e) => e.status === "paid" && e.paid_from === "personal")
      .map((e) => e.amount),
  );

  // Outstanding is "right now", independent of the selected period.
  const openInvoices = (invoices.data ?? [])
    .filter((i) => (i.status === "sent" || i.status === "overdue") && i.total_due > 0)
    .sort((a, b) => a.date_issued.localeCompare(b.date_issued));
  const outstanding = sumMoney(openInvoices.map((i) => i.total_due));
  const pendingTotal = sumMoney(
    (payments.data ?? []).filter((p) => p.status === "pending").map((p) => p.amount),
  );

  const trend: TrendPoint[] = months.map((m) => {
    const r = periodRange(m);
    const pays = (payments.data ?? []).filter((p) => inRange(p.payment_date, r));
    const exps = (expenses.data ?? []).filter((e) => inRange(e.expense_date, r));
    return {
      key: periodSlug(m),
      label: shortMonthLabel(m),
      income: receivedTotal(pays),
      expenses: roundMoney(operatingExpenseTotal(exps, cats) + feeTotal(pays)),
    };
  });

  const byCategory = (() => {
    const totals = new Map<string, number>();
    for (const e of periodExpenses) {
      if (e.status !== "paid") continue;
      totals.set(e.category_id, roundMoney((totals.get(e.category_id) ?? 0) + e.amount));
    }
    const name = new Map(cats.map((c) => [c.id, c.name]));
    return [...totals.entries()]
      .map(([id, total]) => ({ id, name: name.get(id) ?? "Uncategorised", total }))
      .sort((a, b) => b.total - a.total);
  })();
  const categoryMax = Math.max(1, ...byCategory.map((c) => c.total));

  const byPayer = PAYER_TYPES.map((t) => ({
    type: t,
    total: receivedTotal(periodPayments.filter((p) => p.payer_type === t)),
  })).filter((r) => r.total > 0);
  const payerMax = Math.max(1, ...byPayer.map((r) => r.total));

  const upcoming = (recurring.data ?? [])
    .filter((r) => r.active && daysBetween(today, r.next_due_date) <= 14)
    .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date));

  const exportExcel = () =>
    downloadWorkbook(`practice-finances-${periodSlug(period)}`, [
      {
        name: "Summary",
        title: "Practice finances",
        subtitle: `${periodLabel(period)} · Dr Ben Azouz MH - General Practitioner · exported ${formatDocDate(today)}`,
        rows: [
          { label: "Income received", value: income },
          { label: "Card and bank fees", value: -fees },
          { label: "Running costs", value: -operating },
          { label: "Operating profit (before equipment write-offs and tax)", value: profit },
          { label: "Equipment and instalments (not running costs)", value: capital },
          { label: "Paid from personal account", value: personal },
          { label: "Outstanding invoices (today)", value: outstanding },
          { label: "Pending payments", value: pendingTotal },
        ],
        columns: [
          { header: "Item", width: 44, value: (r: { label: string }) => r.label },
          { header: "Amount", type: "money", width: 16, value: (r: { value: number }) => r.value },
        ],
      },
      {
        name: "By month",
        title: "Income and expenses by month",
        rows: trend,
        columns: [
          { header: "Month", width: 12, value: (t: TrendPoint) => t.label },
          { header: "Income", type: "money", total: true, value: (t: TrendPoint) => t.income },
          {
            header: "Expenses incl. fees",
            type: "money",
            width: 18,
            total: true,
            value: (t: TrendPoint) => t.expenses,
          },
          {
            header: "Difference",
            type: "money",
            total: true,
            value: (t: TrendPoint) => roundMoney(t.income - t.expenses),
          },
        ],
      },
      {
        name: "By category",
        title: `Expenses by category · ${periodLabel(period)}`,
        rows: byCategory,
        columns: [
          { header: "Category", width: 30, value: (c: { name: string }) => c.name },
          {
            header: "Amount",
            type: "money",
            total: true,
            value: (c: { total: number }) => c.total,
          },
        ],
      },
      {
        name: "Outstanding",
        title: "Outstanding invoices",
        subtitle: `As at ${formatDocDate(today)}`,
        rows: openInvoices,
        columns: [
          {
            header: "Invoice",
            width: 12,
            value: (i: (typeof openInvoices)[number]) => i.invoice_number,
          },
          {
            header: "Patient",
            width: 26,
            value: (i: (typeof openInvoices)[number]) => i.patient_name,
          },
          {
            header: "Issued",
            type: "date",
            value: (i: (typeof openInvoices)[number]) => i.date_issued,
          },
          { header: "Due", type: "date", value: (i: (typeof openInvoices)[number]) => i.due_date },
          {
            header: "Days since issued",
            type: "number",
            width: 16,
            value: (i: (typeof openInvoices)[number]) => daysBetween(i.date_issued, today),
          },
          {
            header: "Amount due",
            type: "money",
            total: true,
            value: (i: (typeof openInvoices)[number]) => i.total_due,
          },
        ],
      },
    ]);

  const loading = payments.isLoading || expenses.isLoading || categories.isLoading;

  return (
    <section>
      <PageHeader
        title="Accounting"
        description="How the practice is doing: money in, money out and what's still owed."
        actions={
          <>
            <ExportButton onExport={exportExcel} disabled={loading} />
            <Button variant="outline" onClick={() => setDialog({ kind: "expense" })}>
              <Plus /> Expense
            </Button>
            <Button onClick={() => setDialog({ kind: "payment" })}>
              <Plus /> Payment
            </Button>
          </>
        }
      />

      <div className="mt-6">
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Income received"
          value={loading ? "…" : money(income)}
          hint={fees ? `${money(fees)} card and bank fees` : "Payments marked received"}
        />
        <StatCard
          label="Running costs"
          value={loading ? "…" : money(operating)}
          hint={capital ? `Plus ${money(capital)} equipment` : "Paid expenses"}
        />
        <StatCard
          label="Operating profit"
          value={loading ? "…" : money(profit)}
          tone={loading ? "default" : profit >= 0 ? "positive" : "negative"}
          hint="Before equipment write-offs and tax · see Reports"
        />
        <StatCard
          label="Outstanding"
          value={invoices.isLoading ? "…" : money(outstanding)}
          tone={outstanding > 0 ? "warning" : "default"}
          hint={`${openInvoices.length} unpaid invoice${openInvoices.length === 1 ? "" : "s"}${pendingTotal ? ` · ${money(pendingTotal)} pending` : ""}`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel className="flex flex-col p-5 sm:p-6">
          <TrendChart
            data={trend}
            title={period.kind === "tax_year" ? `${periodLabel(period)} by month` : "Last 6 months"}
          />
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Bills due soon</h2>
            <Link
              to="/admin/accounting/recurring"
              className="flex items-center gap-1 text-xs text-blue hover:underline"
            >
              All recurring <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-4 text-sm text-grey">Nothing due in the next two weeks.</p>
          ) : (
            <ul className="mt-2 divide-y divide-hairline">
              {upcoming.slice(0, 6).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{r.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <DueBadge date={r.next_due_date} />
                      <span className="text-xs text-grey">{amountLabel(r)}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={dueState(r.next_due_date, today) === "overdue" ? "default" : "outline"}
                    onClick={() => setDialog({ kind: "recurring", item: r })}
                  >
                    Mark paid
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-ink">Spending by category</h2>
          {byCategory.length === 0 ? (
            <p className="mt-4 text-sm text-grey">No expenses in {periodLabel(period)}.</p>
          ) : (
            <ul className="mt-2">
              {byCategory.slice(0, 7).map((c) => (
                <BreakdownRow
                  key={c.id}
                  label={c.name}
                  value={c.total}
                  share={c.total / categoryMax}
                  amount={money(c.total)}
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-ink">Income by payer</h2>
          {byPayer.length === 0 ? (
            <p className="mt-4 text-sm text-grey">No payments received in {periodLabel(period)}.</p>
          ) : (
            <ul className="mt-2">
              {byPayer.map((r) => (
                <BreakdownRow
                  key={r.type}
                  label={PAYER_LABELS[r.type]}
                  value={r.total}
                  share={r.total / payerMax}
                  amount={money(r.total)}
                />
              ))}
            </ul>
          )}
          {personal > 0 ? (
            <p className="mt-4 border-t border-hairline pt-3 text-xs text-grey">
              {money(personal)} of this period's expenses were paid from the personal account.
            </p>
          ) : null}
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Unpaid invoices</h2>
            <Link
              to="/admin/invoices"
              className="flex items-center gap-1 text-xs text-blue hover:underline"
            >
              All invoices <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {openInvoices.length === 0 ? (
            <p className="mt-4 text-sm text-grey">Everything invoiced has been paid.</p>
          ) : (
            <ul className="mt-2 divide-y divide-hairline">
              {openInvoices.slice(0, 5).map((i) => {
                const age = daysBetween(i.date_issued, today);
                return (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{i.patient_name}</p>
                      <p className={age > 90 ? "text-xs text-red-700" : "text-xs text-grey"}>
                        {i.invoice_number} · {money(i.total_due)} · {age} day{age === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setDialog({
                          kind: "payment",
                          prefill: {
                            invoice_id: i.id,
                            patient_name: i.patient_name,
                            amount: i.total_due.toFixed(2),
                          },
                        })
                      }
                    >
                      Record payment
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {dialog?.kind === "expense" ? (
        <ExpenseDialog expense={null} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.kind === "payment" ? (
        <PaymentDialog payment={null} prefill={dialog.prefill} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.kind === "recurring" ? (
        <MarkPaidDialog item={dialog.item} onClose={() => setDialog(null)} />
      ) : null}
    </section>
  );
}
