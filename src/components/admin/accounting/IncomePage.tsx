import { Ban, CheckCircle2, HandCoins, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useInvoices, usePayments, useRefreshAccounting } from "@/components/admin/accounting/data";
import { PaymentDialog } from "@/components/admin/accounting/PaymentDialog";
import { Badge, ExportButton, PeriodPicker } from "@/components/admin/accounting/widgets";
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
  PAYER_LABELS,
  feeTotal,
  monthOf,
  periodLabel,
  periodRange,
  periodSlug,
  receivedTotal,
  roundMoney,
  sumMoney,
  type Payment,
  type PaymentStatus,
  type Period,
} from "@/lib/accounting";
import { downloadWorkbook } from "@/lib/excel";
import { formatDocDate, money, todayIso } from "@/lib/invoices";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = ["all", "received", "pending", "void"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export function IncomePage() {
  const [period, setPeriod] = useState<Period>(() => monthOf(todayIso()));
  const range = periodRange(period);
  const payments = usePayments(range);
  const invoices = useInvoices();
  const refresh = useRefreshAccounting();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<Payment | null | "new">(null);

  const invoiceNumber = useMemo(() => {
    const map = new Map((invoices.data ?? []).map((i) => [i.id, i.invoice_number]));
    return (id: string | null) => (id ? (map.get(id) ?? null) : null);
  }, [invoices.data]);

  const all = payments.data ?? [];
  const term = search.trim().toLowerCase();
  const rows = all.filter(
    (p) =>
      (status === "all" || p.status === status) &&
      (!term ||
        (p.patient_name ?? "").toLowerCase().includes(term) ||
        (p.payer_name ?? "").toLowerCase().includes(term) ||
        (p.reference ?? "").toLowerCase().includes(term) ||
        (invoiceNumber(p.invoice_id) ?? "").toLowerCase().includes(term)),
  );

  const received = receivedTotal(all);
  const fees = feeTotal(all);
  const pending = sumMoney(all.filter((p) => p.status === "pending").map((p) => p.amount));
  const counts: Record<StatusFilter, number> = {
    all: all.length,
    received: all.filter((p) => p.status === "received").length,
    pending: all.filter((p) => p.status === "pending").length,
    void: all.filter((p) => p.status === "void").length,
  };

  const update = async (payment: Payment, next: PaymentStatus, message: string) => {
    const { error } = await supabase.from("payments").update({ status: next }).eq("id", payment.id);
    if (error) toast.error(error.message);
    else {
      toast.success(message);
      refresh();
    }
  };

  const remove = async (payment: Payment) => {
    if (!window.confirm(`Permanently delete this voided payment (${money(payment.amount)})?`))
      return;
    const { error } = await supabase.from("payments").delete().eq("id", payment.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Payment deleted.");
      refresh();
    }
  };

  const who = (p: Payment) => p.patient_name || p.payer_name || "Unknown";
  const paidBy = (p: Payment) => {
    if (p.payer_type !== "patient")
      return `${PAYER_LABELS[p.payer_type]}${p.payer_name ? ` · ${p.payer_name}` : ""}`;
    return p.payer_name && p.payer_name !== p.patient_name ? `Paid by ${p.payer_name}` : null;
  };

  const exportExcel = () =>
    downloadWorkbook(`income-${periodSlug(period)}`, [
      {
        name: "Income",
        title: "Income received",
        subtitle: `${periodLabel(period)} · Dr Ben Azouz MH - General Practitioner`,
        rows,
        columns: [
          { header: "Date", type: "date", value: (p: Payment) => p.payment_date },
          { header: "Patient", width: 26, value: (p: Payment) => p.patient_name },
          { header: "Paid by", width: 14, value: (p: Payment) => PAYER_LABELS[p.payer_type] },
          { header: "Payer name", width: 22, value: (p: Payment) => p.payer_name },
          { header: "Invoice", width: 12, value: (p: Payment) => invoiceNumber(p.invoice_id) },
          { header: "Service", width: 22, value: (p: Payment) => p.service },
          {
            header: "Method",
            width: 12,
            value: (p: Payment) => (p.payment_method ? METHOD_LABELS[p.payment_method] : ""),
          },
          { header: "Status", width: 11, value: (p: Payment) => p.status },
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
          {
            header: "Net to bank",
            type: "money",
            total: true,
            value: (p: Payment) =>
              p.status === "received" ? roundMoney(p.amount - p.fee_amount) : 0,
          },
          {
            header: "Pending",
            type: "money",
            total: true,
            value: (p: Payment) => (p.status === "pending" ? p.amount : 0),
          },
          { header: "Reference", width: 16, value: (p: Payment) => p.reference },
          { header: "Notes", width: 32, value: (p: Payment) => p.notes },
        ],
      },
    ]);

  const statusBadge = (p: Payment) =>
    p.status === "pending" ? (
      <Badge tone="amber">Pending</Badge>
    ) : p.status === "void" ? (
      <Badge tone="grey" strike>
        Void
      </Badge>
    ) : null;

  const actions = (p: Payment) => (
    <>
      {p.status === "pending" ? (
        <IconButton
          label="Mark as received"
          onClick={() => update(p, "received", "Marked as received.")}
        >
          <CheckCircle2 className="h-4 w-4" />
        </IconButton>
      ) : null}
      <IconButton label={`Edit payment from ${who(p)}`} onClick={() => setEditing(p)}>
        <Pencil className="h-4 w-4" />
      </IconButton>
      {p.status === "void" ? (
        <>
          <IconButton label="Restore" onClick={() => update(p, "received", "Payment restored.")}>
            <RotateCcw className="h-4 w-4" />
          </IconButton>
          <IconButton label="Delete permanently" tone="danger" onClick={() => remove(p)}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </>
      ) : (
        <IconButton
          label="Void"
          tone="danger"
          onClick={() => {
            const linked = invoiceNumber(p.invoice_id);
            const note = linked ? ` ${linked} will no longer count as paid by it.` : "";
            if (window.confirm(`Void this payment of ${money(p.amount)} from ${who(p)}?${note}`))
              void update(p, "void", "Payment voided.");
          }}
        >
          <Ban className="h-4 w-4" />
        </IconButton>
      )}
    </>
  );

  return (
    <section>
      <PageHeader
        title="Income"
        description={
          payments.isLoading
            ? "Loading…"
            : `${money(received)} received in ${periodLabel(period)}${fees ? ` · ${money(fees)} in fees` : ""}${pending ? ` · ${money(pending)} pending` : ""}`
        }
        actions={
          <>
            <ExportButton onExport={exportExcel} disabled={rows.length === 0} />
            <Button onClick={() => setEditing("new")}>
              <Plus /> Record payment
            </Button>
          </>
        }
      />

      <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <PeriodPicker value={period} onChange={setPeriod} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div
            className="-mx-4 flex overflow-x-auto px-4 sm:mx-0 sm:px-0"
            role="tablist"
            aria-label="Filter by status"
          >
            <div className="flex border border-hairline bg-white">
              {STATUS_FILTERS.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={status === id}
                  onClick={() => setStatus(id)}
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-1.5 border-r border-hairline px-3.5 text-sm capitalize transition-colors last:border-r-0",
                    status === id
                      ? "bg-ink text-white"
                      : "text-grey hover:bg-canvas hover:text-ink",
                  )}
                >
                  {id}
                  <span className={cn("text-xs", status === id ? "text-white/70" : "text-grey/70")}>
                    {counts[id]}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <SearchField
            className="sm:w-64"
            value={search}
            onChange={setSearch}
            placeholder="Search patient, payer or ref"
          />
        </div>
      </div>

      <Panel className="mt-4">
        {payments.isLoading ? (
          <LoadingRows />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title={all.length === 0 ? `No payments in ${periodLabel(period)}` : "No payments match"}
            description={
              all.length === 0
                ? "Record payments from patients, medical aids and insurers as they come in."
                : "Try another status filter or search term."
            }
            action={
              all.length === 0 ? (
                <Button onClick={() => setEditing("new")}>
                  <Plus /> Record payment
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
                    <th className="px-4 py-3 font-semibold">Patient</th>
                    <th className="px-4 py-3 font-semibold">Invoice</th>
                    <th className="px-4 py-3 font-semibold">Method</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    <th className="px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {rows.map((p) => (
                    <tr
                      key={p.id}
                      className={
                        p.status === "void" ? "text-grey" : "transition-colors hover:bg-canvas/60"
                      }
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 text-grey">
                        {formatDocDate(p.payment_date)}
                      </td>
                      <td className="px-4 py-3.5">
                        <p
                          className={p.status === "void" ? "line-through" : "font-medium text-ink"}
                        >
                          {who(p)}
                        </p>
                        {paidBy(p) ? <p className="mt-0.5 text-xs text-grey">{paidBy(p)}</p> : null}
                        {p.service ? <p className="mt-0.5 text-xs text-grey">{p.service}</p> : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-grey">
                        {invoiceNumber(p.invoice_id) ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 text-grey">
                        {p.payment_method ? METHOD_LABELS[p.payment_method] : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <p
                          className={
                            p.status === "void"
                              ? "line-through"
                              : "font-semibold tabular-nums text-ink"
                          }
                        >
                          {money(p.amount)}
                        </p>
                        {p.fee_amount > 0 ? (
                          <p className="text-xs text-grey">−{money(p.fee_amount)} fee</p>
                        ) : null}
                        <div className="mt-1">{statusBadge(p)}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-0.5">{actions(p)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-hairline lg:hidden">
              {rows.map((p) => (
                <li
                  key={p.id}
                  className={p.status === "void" ? "px-4 py-4 text-grey" : "px-4 py-4"}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={p.status === "void" ? "line-through" : "font-medium text-ink"}>
                        {who(p)}
                      </p>
                      <p className="mt-0.5 text-xs text-grey">
                        {formatDocDate(p.payment_date)}
                        {invoiceNumber(p.invoice_id) ? ` · ${invoiceNumber(p.invoice_id)}` : ""}
                        {p.payment_method ? ` · ${METHOD_LABELS[p.payment_method]}` : ""}
                      </p>
                      {paidBy(p) ? <p className="mt-0.5 text-xs text-grey">{paidBy(p)}</p> : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={
                          p.status === "void"
                            ? "line-through"
                            : "font-semibold tabular-nums text-ink"
                        }
                      >
                        {money(p.amount)}
                      </p>
                      {p.fee_amount > 0 ? (
                        <p className="text-xs text-grey">−{money(p.fee_amount)} fee</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div>{statusBadge(p)}</div>
                    <div className="-mr-2 flex gap-0.5">{actions(p)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      {editing ? (
        <PaymentDialog
          payment={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </section>
  );
}
