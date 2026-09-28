import { Ban, Pencil, Plus, Receipt, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  removeReceipt,
  useCategories,
  useExpenses,
  useRefreshAccounting,
} from "@/components/admin/accounting/data";
import { ExpenseDialog } from "@/components/admin/accounting/ExpenseDialog";
import {
  Badge,
  ExportButton,
  PeriodPicker,
  ReceiptButton,
} from "@/components/admin/accounting/widgets";
import { SelectInput } from "@/components/admin/form";
import {
  EmptyState,
  IconButton,
  LoadingRows,
  PageHeader,
  Panel,
  SearchField,
  tableHeadClass,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  METHOD_LABELS,
  PAID_FROM_LABELS,
  monthOf,
  periodLabel,
  periodRange,
  periodSlug,
  sumMoney,
  type Expense,
  type Period,
} from "@/lib/accounting";
import { downloadWorkbook } from "@/lib/excel";
import { formatDocDate, money, todayIso } from "@/lib/invoices";

export function ExpensesPage() {
  const [period, setPeriod] = useState<Period>(() => monthOf(todayIso()));
  const range = periodRange(period);
  const expenses = useExpenses(range);
  const categories = useCategories();
  const refresh = useRefreshAccounting();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [editing, setEditing] = useState<Expense | null | "new">(null);

  const categoryName = useMemo(() => {
    const map = new Map((categories.data ?? []).map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? "Uncategorised";
  }, [categories.data]);

  const all = expenses.data ?? [];
  const term = search.trim().toLowerCase();
  const rows = all.filter(
    (e) =>
      (!categoryId || e.category_id === categoryId) &&
      (!term ||
        e.supplier.toLowerCase().includes(term) ||
        (e.description ?? "").toLowerCase().includes(term) ||
        (e.reference ?? "").toLowerCase().includes(term)),
  );

  const live = rows.filter((e) => e.status !== "void");
  const paidTotal = sumMoney(live.filter((e) => e.status === "paid").map((e) => e.amount));
  const unpaidTotal = sumMoney(live.filter((e) => e.status === "unpaid").map((e) => e.amount));
  const missingReceipts = live.filter((e) => !e.receipt_path).length;

  const setStatus = async (expense: Expense, status: Expense["status"]) => {
    const { error } = await supabase.from("expenses").update({ status }).eq("id", expense.id);
    if (error) toast.error(error.message);
    else {
      toast.success(status === "void" ? "Expense voided." : "Expense restored.");
      refresh();
    }
  };

  const remove = async (expense: Expense) => {
    if (
      !window.confirm(
        `Permanently delete this voided expense (${expense.supplier}, ${money(expense.amount)})?`,
      )
    )
      return;
    const { error } = await supabase.from("expenses").delete().eq("id", expense.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await removeReceipt(expense.receipt_path);
    toast.success("Expense deleted.");
    refresh();
  };

  const exportExcel = () =>
    downloadWorkbook(`expenses-${periodSlug(period)}`, [
      {
        name: "Expenses",
        title: "Expenses",
        subtitle: `${periodLabel(period)} · Dr Ben Azouz MH - General Practitioner`,
        rows: rows,
        columns: [
          { header: "Date", type: "date", value: (e: Expense) => e.expense_date },
          { header: "Supplier", width: 26, value: (e: Expense) => e.supplier },
          { header: "Description", width: 32, value: (e: Expense) => e.description },
          { header: "Category", width: 24, value: (e: Expense) => categoryName(e.category_id) },
          {
            header: "Amount",
            type: "money",
            total: true,
            value: (e: Expense) => (e.status === "void" ? 0 : e.amount),
          },
          { header: "Status", width: 10, value: (e: Expense) => e.status },
          {
            header: "Method",
            width: 13,
            value: (e: Expense) => (e.payment_method ? METHOD_LABELS[e.payment_method] : ""),
          },
          { header: "Paid from", width: 17, value: (e: Expense) => PAID_FROM_LABELS[e.paid_from] },
          { header: "Reference", width: 16, value: (e: Expense) => e.reference },
          { header: "Receipt", width: 10, value: (e: Expense) => (e.receipt_path ? "Yes" : "No") },
          { header: "Notes", width: 30, value: (e: Expense) => e.notes },
        ],
      },
    ]);

  const actions = (expense: Expense) => (
    <>
      <ReceiptButton path={expense.receipt_path} />
      <IconButton label={`Edit ${expense.supplier}`} onClick={() => setEditing(expense)}>
        <Pencil className="h-4 w-4" />
      </IconButton>
      {expense.status === "void" ? (
        <>
          <IconButton label="Restore" onClick={() => setStatus(expense, "paid")}>
            <RotateCcw className="h-4 w-4" />
          </IconButton>
          <IconButton label="Delete permanently" tone="danger" onClick={() => remove(expense)}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </>
      ) : (
        <IconButton
          label="Void"
          tone="danger"
          onClick={() => {
            if (
              window.confirm(
                `Void this expense (${expense.supplier}, ${money(expense.amount)})? It stays on record but no longer counts.`,
              )
            )
              void setStatus(expense, "void");
          }}
        >
          <Ban className="h-4 w-4" />
        </IconButton>
      )}
    </>
  );

  const statusBadge = (expense: Expense) =>
    expense.status === "void" ? (
      <Badge tone="grey" strike>
        Void
      </Badge>
    ) : expense.status === "unpaid" ? (
      <Badge tone="amber">
        {expense.due_date ? `Due ${formatDocDate(expense.due_date)}` : "Unpaid"}
      </Badge>
    ) : null;

  return (
    <section>
      <PageHeader
        title="Expenses"
        description={
          expenses.isLoading
            ? "Loading…"
            : `${money(paidTotal)} paid in ${periodLabel(period)}${unpaidTotal ? ` · ${money(unpaidTotal)} still to pay` : ""}`
        }
        actions={
          <>
            <ExportButton onExport={exportExcel} disabled={rows.length === 0} />
            <Button onClick={() => setEditing("new")}>
              <Plus /> Add expense
            </Button>
          </>
        }
      />

      <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <PeriodPicker value={period} onChange={setPeriod} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <SelectInput
            className="sm:w-56"
            value={categoryId}
            onChange={setCategoryId}
            options={[
              { value: "", label: "All categories" },
              ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <SearchField
            className="sm:w-64"
            value={search}
            onChange={setSearch}
            placeholder="Search supplier or note"
          />
        </div>
      </div>

      {missingReceipts > 0 ? (
        <p className="mt-4 border-l-2 border-amber-400 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          {missingReceipts} expense{missingReceipts === 1 ? " has" : "s have"} no receipt attached.
          SARS expects receipts for every expense, so attach them when you can.
        </p>
      ) : null}

      <Panel className="mt-4">
        {expenses.isLoading ? (
          <LoadingRows />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={all.length === 0 ? `No expenses in ${periodLabel(period)}` : "No expenses match"}
            description={
              all.length === 0
                ? "Add rent, supplies, subscriptions and equipment as they're paid."
                : "Try another category or search term."
            }
            action={
              all.length === 0 ? (
                <Button onClick={() => setEditing("new")}>
                  <Plus /> Add expense
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className={tableHeadClass}>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Supplier</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Paid via</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    <th className="px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {rows.map((e) => (
                    <tr
                      key={e.id}
                      className={
                        e.status === "void" ? "text-grey" : "transition-colors hover:bg-canvas/60"
                      }
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 text-grey">
                        {formatDocDate(e.expense_date)}
                      </td>
                      <td className="px-4 py-3.5">
                        <p
                          className={e.status === "void" ? "line-through" : "font-medium text-ink"}
                        >
                          {e.supplier}
                        </p>
                        {e.description ? (
                          <p className="mt-0.5 text-xs text-grey">{e.description}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 text-grey">{categoryName(e.category_id)}</td>
                      <td className="px-4 py-3.5 text-grey">
                        {e.payment_method ? METHOD_LABELS[e.payment_method] : "—"}
                        <span className="block text-xs">
                          {e.paid_from === "personal" ? "Personal account" : "Practice account"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <p
                          className={
                            e.status === "void"
                              ? "line-through"
                              : "font-semibold tabular-nums text-ink"
                          }
                        >
                          {money(e.amount)}
                        </p>
                        <div className="mt-1">{statusBadge(e)}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-0.5">{actions(e)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-hairline lg:hidden">
              {rows.map((e) => (
                <li
                  key={e.id}
                  className={e.status === "void" ? "px-4 py-4 text-grey" : "px-4 py-4"}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={e.status === "void" ? "line-through" : "font-medium text-ink"}>
                        {e.supplier}
                      </p>
                      <p className="mt-0.5 text-xs text-grey">
                        {formatDocDate(e.expense_date)} · {categoryName(e.category_id)}
                      </p>
                      {e.description ? (
                        <p className="mt-0.5 truncate text-xs text-grey">{e.description}</p>
                      ) : null}
                    </div>
                    <p
                      className={
                        e.status === "void"
                          ? "shrink-0 line-through"
                          : "shrink-0 font-semibold tabular-nums text-ink"
                      }
                    >
                      {money(e.amount)}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div>{statusBadge(e)}</div>
                    <div className="-mr-2 flex gap-0.5">{actions(e)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      {editing ? (
        <ExpenseDialog
          expense={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </section>
  );
}
