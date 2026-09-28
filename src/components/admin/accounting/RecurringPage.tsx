import { CalendarClock, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  useCategories,
  useRecurring,
  useRefreshAccounting,
} from "@/components/admin/accounting/data";
import { MarkPaidDialog, RecurringDialog } from "@/components/admin/accounting/RecurringDialogs";
import { Badge, ExportButton, StatCard } from "@/components/admin/accounting/widgets";
import {
  EmptyState,
  IconButton,
  LoadingRows,
  PageHeader,
  Panel,
  tableHeadClass,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  FREQUENCY_LABELS,
  amountLabel,
  METHOD_LABELS,
  PAID_FROM_LABELS,
  dueState,
  monthlyEquivalent,
  sumMoney,
  type RecurringExpense,
} from "@/lib/accounting";
import { downloadWorkbook } from "@/lib/excel";
import { formatDocDate, money, todayIso } from "@/lib/invoices";

export function DueBadge({ date }: { date: string }) {
  const state = dueState(date, todayIso());
  if (state === "overdue") return <Badge tone="red">Overdue · {formatDocDate(date)}</Badge>;
  if (state === "due_soon") return <Badge tone="amber">Due {formatDocDate(date)}</Badge>;
  return <span className="whitespace-nowrap text-sm text-grey">{formatDocDate(date)}</span>;
}

export function RecurringPage() {
  const recurring = useRecurring();
  const categories = useCategories();
  const refresh = useRefreshAccounting();
  const [editing, setEditing] = useState<RecurringExpense | null | "new">(null);
  const [paying, setPaying] = useState<RecurringExpense | null>(null);

  const categoryName = useMemo(() => {
    const map = new Map((categories.data ?? []).map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? "Uncategorised";
  }, [categories.data]);

  const items = recurring.data ?? [];
  const active = items.filter((i) => i.active);
  const paused = items.filter((i) => !i.active);
  const today = todayIso();
  const monthly = sumMoney(active.map(monthlyEquivalent));
  const overdue = active.filter((i) => dueState(i.next_due_date, today) === "overdue").length;
  const dueSoon = active.filter((i) => dueState(i.next_due_date, today) === "due_soon").length;
  const variable = active.filter((i) => i.unit_amount != null || i.fixed_amount == null).length;

  const toggle = async (item: RecurringExpense) => {
    const { error } = await supabase
      .from("recurring_expenses")
      .update({ active: !item.active })
      .eq("id", item.id);
    if (error) toast.error(error.message);
    else {
      toast.success(item.active ? `${item.name} paused.` : `${item.name} resumed.`);
      refresh();
    }
  };

  const remove = async (item: RecurringExpense) => {
    if (!window.confirm(`Delete ${item.name}? Expenses already recorded for it are kept.`)) return;
    const { error } = await supabase.from("recurring_expenses").delete().eq("id", item.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`${item.name} deleted.`);
      refresh();
    }
  };

  const exportExcel = () =>
    downloadWorkbook("recurring-costs", [
      {
        name: "Recurring costs",
        title: "Recurring costs",
        subtitle: `As at ${formatDocDate(today)} · Dr Ben Azouz MH - General Practitioner`,
        rows: [...active, ...paused],
        columns: [
          { header: "Name", width: 24, value: (i: RecurringExpense) => i.name },
          { header: "Supplier", width: 22, value: (i: RecurringExpense) => i.supplier },
          {
            header: "Category",
            width: 22,
            value: (i: RecurringExpense) => categoryName(i.category_id),
          },
          {
            header: "How often",
            width: 11,
            value: (i: RecurringExpense) => FREQUENCY_LABELS[i.frequency],
          },
          { header: "Fixed amount", type: "money", value: (i: RecurringExpense) => i.fixed_amount },
          { header: "Per item", type: "money", value: (i: RecurringExpense) => i.unit_amount },
          { header: "Item", width: 10, value: (i: RecurringExpense) => i.unit_label },
          {
            header: "Monthly equivalent",
            type: "money",
            width: 18,
            total: true,
            value: (i: RecurringExpense) => (i.active ? monthlyEquivalent(i) : 0),
          },
          { header: "Next due", type: "date", value: (i: RecurringExpense) => i.next_due_date },
          {
            header: "Method",
            width: 13,
            value: (i: RecurringExpense) =>
              i.payment_method ? METHOD_LABELS[i.payment_method] : "",
          },
          {
            header: "Paid from",
            width: 17,
            value: (i: RecurringExpense) => PAID_FROM_LABELS[i.paid_from],
          },
          {
            header: "Active",
            width: 8,
            value: (i: RecurringExpense) => (i.active ? "Yes" : "Paused"),
          },
          { header: "Notes", width: 30, value: (i: RecurringExpense) => i.notes },
        ],
      },
    ]);

  const renderRows = (list: RecurringExpense[]) => (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className={tableHeadClass}>
              <th className="px-4 py-3 font-semibold">Cost</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Next due</th>
              <th className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {list.map((item) => (
              <tr
                key={item.id}
                className={item.active ? "transition-colors hover:bg-canvas/60" : "text-grey"}
              >
                <td className="px-4 py-3.5">
                  <p className={item.active ? "font-medium text-ink" : ""}>{item.name}</p>
                  <p className="mt-0.5 text-xs text-grey">
                    {FREQUENCY_LABELS[item.frequency]}
                    {item.supplier ? ` · ${item.supplier}` : ""}
                  </p>
                </td>
                <td className="px-4 py-3.5 text-grey">{categoryName(item.category_id)}</td>
                <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-ink">
                  {amountLabel(item)}
                </td>
                <td className="px-4 py-3.5">
                  {item.active ? <DueBadge date={item.next_due_date} /> : "Paused"}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-1">{rowActions(item)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-hairline lg:hidden">
        {list.map((item) => (
          <li key={item.id} className={item.active ? "px-4 py-4" : "px-4 py-4 text-grey"}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={item.active ? "font-medium text-ink" : ""}>{item.name}</p>
                <p className="mt-0.5 text-xs text-grey">
                  {FREQUENCY_LABELS[item.frequency]} · {categoryName(item.category_id)}
                </p>
              </div>
              <p className="shrink-0 text-right text-sm tabular-nums text-ink">
                {amountLabel(item)}
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div>
                {item.active ? (
                  <DueBadge date={item.next_due_date} />
                ) : (
                  <span className="text-sm">Paused</span>
                )}
              </div>
              <div className="-mr-2 flex items-center gap-1">{rowActions(item)}</div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );

  const rowActions = (item: RecurringExpense) => (
    <>
      {item.active ? (
        <Button size="sm" variant="outline" onClick={() => setPaying(item)}>
          Mark paid
        </Button>
      ) : null}
      <IconButton label={`Edit ${item.name}`} onClick={() => setEditing(item)}>
        <Pencil className="h-4 w-4" />
      </IconButton>
      <IconButton
        label={item.active ? `Pause ${item.name}` : `Resume ${item.name}`}
        onClick={() => toggle(item)}
      >
        {item.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </IconButton>
      {!item.active ? (
        <IconButton label={`Delete ${item.name}`} tone="danger" onClick={() => remove(item)}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      ) : null}
    </>
  );

  return (
    <section>
      <PageHeader
        title="Recurring costs"
        description="Rent, subscriptions and other regular bills. Mark each one paid when it goes off."
        actions={
          <>
            <ExportButton onExport={exportExcel} disabled={items.length === 0} />
            <Button onClick={() => setEditing("new")}>
              <Plus /> Add recurring cost
            </Button>
          </>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Fixed costs per month"
          value={money(monthly)}
          hint={
            variable
              ? `Plus ${variable} cost${variable === 1 ? "" : "s"} that vary`
              : "Yearly costs spread per month"
          }
        />
        <StatCard
          label="Overdue"
          value={String(overdue)}
          tone={overdue ? "negative" : "default"}
          hint="Past their due date"
        />
        <StatCard
          label="Due this week"
          value={String(dueSoon)}
          tone={dueSoon ? "warning" : "default"}
          hint="In the next 7 days"
        />
      </div>

      <Panel className="mt-6">
        {recurring.isLoading ? (
          <LoadingRows />
        ) : active.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No recurring costs yet"
            description="Add rent, wifi, software subscriptions and insurance so nothing is missed."
            action={
              <Button onClick={() => setEditing("new")}>
                <Plus /> Add recurring cost
              </Button>
            }
          />
        ) : (
          renderRows(active)
        )}
      </Panel>

      {paused.length > 0 ? (
        <>
          <h2 className="mt-8 text-sm font-semibold text-ink">Paused</h2>
          <Panel className="mt-3">{renderRows(paused)}</Panel>
        </>
      ) : null}

      {editing ? (
        <RecurringDialog
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {paying ? <MarkPaidDialog item={paying} onClose={() => setPaying(null)} /> : null}
    </section>
  );
}
