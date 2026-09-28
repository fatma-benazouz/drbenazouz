import { ChevronLeft, ChevronRight, Monitor, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AssetDialog } from "@/components/admin/accounting/AssetDialog";
import { removeReceipt, useAssets, useRefreshAccounting } from "@/components/admin/accounting/data";
import {
  Badge,
  ExportButton,
  ReceiptButton,
  StatCard,
} from "@/components/admin/accounting/widgets";
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
  PAID_FROM_LABELS,
  daysBetween,
  periodLabel,
  periodRange,
  sumMoney,
  taxYearOf,
  type Period,
} from "@/lib/accounting";
import { ASSET_TYPE_LABELS, allowanceInRange, bookValue, type Asset } from "@/lib/assets";
import { downloadWorkbook } from "@/lib/excel";
import { formatDocDate, money, todayIso } from "@/lib/invoices";

function writeOffLabel(asset: Asset): string {
  if (asset.write_off_years <= 1) return "In full when bought";
  return `${asset.write_off_years} years · ${money(asset.cost / asset.write_off_years)}/yr`;
}

export function EquipmentPage() {
  const today = todayIso();
  const [taxYear, setTaxYear] = useState<Extract<Period, { kind: "tax_year" }>>(
    () => taxYearOf(today) as Extract<Period, { kind: "tax_year" }>,
  );
  const range = periodRange(taxYear);
  const assets = useAssets();
  const refresh = useRefreshAccounting();
  const [editing, setEditing] = useState<Asset | null | "new">(null);

  // Items bought on or before the end of the selected tax year.
  const items = (assets.data ?? []).filter((a) => a.purchase_date <= range.to);
  const owned = items.filter((a) => !a.disposed_date || a.disposed_date > range.to);
  const yearWriteOff = sumMoney(items.map((a) => allowanceInRange(a, range)));
  const valueAtYearEnd = sumMoney(owned.map((a) => bookValue(a, range.to)));
  const totalCost = sumMoney(owned.map((a) => a.cost));
  const warrantySoon = owned.filter(
    (a) =>
      a.warranty_until &&
      daysBetween(today, a.warranty_until) >= 0 &&
      daysBetween(today, a.warranty_until) <= 60,
  );

  const remove = async (asset: Asset) => {
    if (
      !window.confirm(
        `Delete ${asset.name} from the equipment register? If it was sold or scrapped, edit it and set a disposal date instead, so its history is kept.`,
      )
    )
      return;
    const { error } = await supabase.from("assets").delete().eq("id", asset.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await removeReceipt(asset.receipt_path);
    toast.success(`${asset.name} deleted.`);
    refresh();
  };

  const exportExcel = () =>
    downloadWorkbook(
      `equipment-register-${taxYear.startYear}-${String(taxYear.startYear + 1).slice(2)}`,
      [
        {
          name: "Equipment register",
          title: "Equipment register",
          subtitle: `${periodLabel(taxYear)} · SARS wear-and-tear estimate · Dr Ben Azouz MH - General Practitioner`,
          rows: items,
          columns: [
            { header: "Item", width: 30, value: (a: Asset) => a.name },
            { header: "Type", width: 24, value: (a: Asset) => ASSET_TYPE_LABELS[a.asset_type] },
            { header: "Supplier", width: 22, value: (a: Asset) => a.supplier },
            { header: "Purchased", type: "date", value: (a: Asset) => a.purchase_date },
            { header: "Cost", type: "money", total: true, value: (a: Asset) => a.cost },
            {
              header: "Write-off years",
              type: "number",
              width: 14,
              value: (a: Asset) => a.write_off_years,
            },
            {
              header: `Write-off ${taxYear.startYear}/${String(taxYear.startYear + 1).slice(2)}`,
              type: "money",
              width: 18,
              total: true,
              value: (a: Asset) => allowanceInRange(a, range),
            },
            {
              header: "Value at year end",
              type: "money",
              width: 17,
              total: true,
              value: (a: Asset) => bookValue(a, range.to),
            },
            { header: "Serial number", width: 18, value: (a: Asset) => a.serial_number },
            {
              header: "Warranty until",
              type: "date",
              width: 14,
              value: (a: Asset) => a.warranty_until,
            },
            { header: "Paid from", width: 17, value: (a: Asset) => PAID_FROM_LABELS[a.paid_from] },
            { header: "Instalments", width: 11, value: (a: Asset) => (a.financed ? "Yes" : "No") },
            { header: "Disposed", type: "date", value: (a: Asset) => a.disposed_date },
            { header: "Notes", width: 30, value: (a: Asset) => a.notes },
          ],
        },
      ],
    );

  const badges = (a: Asset) => (
    <div className="mt-1 flex flex-wrap gap-1">
      {a.disposed_date && a.disposed_date <= range.to ? (
        <Badge tone="grey">Disposed {formatDocDate(a.disposed_date)}</Badge>
      ) : null}
      {a.financed ? <Badge tone="blue">Instalments</Badge> : null}
      {warrantySoon.includes(a) ? (
        <Badge tone="amber">Warranty ends {formatDocDate(a.warranty_until)}</Badge>
      ) : null}
    </div>
  );

  const actions = (a: Asset) => (
    <>
      <ReceiptButton path={a.receipt_path} />
      <IconButton label={`Edit ${a.name}`} onClick={() => setEditing(a)}>
        <Pencil className="h-4 w-4" />
      </IconButton>
      <IconButton label={`Delete ${a.name}`} tone="danger" onClick={() => remove(a)}>
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </>
  );

  return (
    <section>
      <PageHeader
        title="Equipment"
        description="What the practice owns, and how much of it can be written off for tax each year."
        actions={
          <>
            <ExportButton onExport={exportExcel} disabled={items.length === 0} />
            <Button onClick={() => setEditing("new")}>
              <Plus /> Add equipment
            </Button>
          </>
        }
      />

      <div className="mt-6 flex h-9 w-fit items-center border border-hairline bg-white">
        <IconButton
          label="Previous tax year"
          onClick={() => setTaxYear({ kind: "tax_year", startYear: taxYear.startYear - 1 })}
        >
          <ChevronLeft className="h-4 w-4" />
        </IconButton>
        <span className="min-w-[9.5rem] px-1 text-center text-sm font-semibold text-ink">
          {periodLabel(taxYear)}
        </span>
        <IconButton
          label="Next tax year"
          onClick={() => setTaxYear({ kind: "tax_year", startYear: taxYear.startYear + 1 })}
        >
          <ChevronRight className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Write-off this tax year"
          value={assets.isLoading ? "…" : money(yearWriteOff)}
          hint="Deducted from profit for tax"
        />
        <StatCard
          label="Value at year end"
          value={assets.isLoading ? "…" : money(valueAtYearEnd)}
          hint={`Cost less write-offs to ${formatDocDate(range.to)}`}
        />
        <StatCard
          label="Equipment owned"
          value={assets.isLoading ? "…" : String(owned.length)}
          hint={`${money(totalCost)} total cost`}
        />
      </div>

      <Panel className="mt-6">
        {assets.isLoading ? (
          <LoadingRows />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Monitor}
            title="No equipment recorded"
            description="Add card machines, phones, printers, computers and medical equipment the practice owns."
            action={
              <Button onClick={() => setEditing("new")}>
                <Plus /> Add equipment
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className={tableHeadClass}>
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold">Purchased</th>
                    <th className="px-4 py-3 font-semibold">Written off</th>
                    <th className="px-4 py-3 text-right font-semibold">Cost</th>
                    <th className="px-4 py-3 text-right font-semibold">This tax year</th>
                    <th className="px-4 py-3 text-right font-semibold">Value</th>
                    <th className="px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {items.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-canvas/60">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-ink">{a.name}</p>
                        <p className="mt-0.5 text-xs text-grey">
                          {ASSET_TYPE_LABELS[a.asset_type]}
                          {a.supplier ? ` · ${a.supplier}` : ""}
                        </p>
                        {badges(a)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-grey">
                        {formatDocDate(a.purchase_date)}
                      </td>
                      <td className="px-4 py-3.5 text-grey">{writeOffLabel(a)}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-ink">
                        {money(a.cost)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold tabular-nums text-ink">
                        {money(allowanceInRange(a, range))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-grey">
                        {money(bookValue(a, range.to))}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-0.5">{actions(a)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-hairline lg:hidden">
              {items.map((a) => (
                <li key={a.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{a.name}</p>
                      <p className="mt-0.5 text-xs text-grey">
                        {formatDocDate(a.purchase_date)} · {writeOffLabel(a)}
                      </p>
                      {badges(a)}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold tabular-nums text-ink">{money(a.cost)}</p>
                      <p className="text-xs text-grey">
                        {money(allowanceInRange(a, range))} this year
                      </p>
                    </div>
                  </div>
                  <div className="-mr-2 mt-2 flex justify-end gap-0.5">{actions(a)}</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <p className="mt-4 text-xs text-grey">
        Write-offs follow SARS wear-and-tear guidelines: items under R 7,000 are written off in full
        when bought; others are spread over their useful life, counted from the month of purchase.
        These are estimates for planning. Your accountant confirms the final figures.
      </p>

      {editing ? (
        <AssetDialog asset={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      ) : null}
    </section>
  );
}
