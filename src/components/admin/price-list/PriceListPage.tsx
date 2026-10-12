import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge, ExportButton } from "@/components/admin/accounting/widgets";
import { usePriceList, useRefreshPriceList } from "@/components/admin/price-list/data";
import { PriceItemDialog } from "@/components/admin/price-list/PriceItemDialog";
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
import { downloadWorkbook } from "@/lib/excel";
import { formatDocDate, money, todayIso } from "@/lib/invoices";
import { PRICE_CATEGORIES, PRICE_CATEGORY_LABELS, type PriceItem } from "@/lib/priceList";
import { cn } from "@/lib/utils";

function RateCell({ code, price }: { code: string | null; price: number | null }) {
  if (price == null) return <span className="text-grey">—</span>;
  return (
    <div>
      <p className="font-semibold tabular-nums text-ink">{money(price)}</p>
      <p className="mt-0.5 text-xs text-grey">{code ? `Tariff ${code}` : "No tariff code"}</p>
    </div>
  );
}

export function PriceListPage() {
  const list = usePriceList();
  const refresh = useRefreshPriceList();
  const [search, setSearch] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [editing, setEditing] = useState<PriceItem | null | "new">(null);

  const all = list.data ?? [];
  const hiddenCount = all.filter((i) => !i.active).length;
  const term = search.trim().toLowerCase();
  const visible = all.filter(
    (i) =>
      (showHidden || i.active) &&
      (!term ||
        i.name.toLowerCase().includes(term) ||
        (i.private_tariff_code ?? "").toLowerCase().includes(term) ||
        (i.medical_aid_tariff_code ?? "").toLowerCase().includes(term)),
  );
  const groups = PRICE_CATEGORIES.map((c) => ({
    category: c,
    items: visible.filter((i) => i.category === c),
  })).filter((g) => g.items.length > 0);

  const toggleActive = async (item: PriceItem) => {
    const { error } = await supabase
      .from("price_list_items")
      .update({ active: !item.active })
      .eq("id", item.id);
    if (error) toast.error(error.message);
    else {
      toast.success(
        item.active ? `${item.name} hidden from suggestions.` : `${item.name} is shown again.`,
      );
      void refresh();
    }
  };

  const remove = async (item: PriceItem) => {
    if (
      !window.confirm(
        `Delete ${item.name} from the price list? Invoices that used it keep their own copy of the price. To keep it for reference instead, hide it.`,
      )
    )
      return;
    const { error } = await supabase.from("price_list_items").delete().eq("id", item.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`${item.name} deleted.`);
      void refresh();
    }
  };

  /** Swap a service with its neighbour within its category (renumbering the group). */
  const move = async (item: PriceItem, step: -1 | 1) => {
    const group = all
      .filter((i) => i.category === item.category)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    const from = group.findIndex((i) => i.id === item.id);
    const to = from + step;
    if (to < 0 || to >= group.length) return;
    const reordered = [...group];
    [reordered[from], reordered[to]] = [reordered[to]!, reordered[from]!];
    const updates = reordered
      .map((i, index) => ({
        id: i.id,
        sort_order: (index + 1) * 10,
        changed: i.sort_order !== (index + 1) * 10,
      }))
      .filter((u) => u.changed);
    const results = await Promise.all(
      updates.map((u) =>
        supabase.from("price_list_items").update({ sort_order: u.sort_order }).eq("id", u.id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) toast.error(failed.error.message);
    void refresh();
  };

  const exportExcel = () =>
    downloadWorkbook("price-list", [
      {
        name: "Price list",
        title: "Price list",
        subtitle: `As at ${formatDocDate(todayIso())} · Dr Ben Azouz MH - General Practitioner`,
        rows: [...all].sort(
          (a, b) =>
            PRICE_CATEGORIES.indexOf(a.category) - PRICE_CATEGORIES.indexOf(b.category) ||
            a.sort_order - b.sort_order,
        ),
        columns: [
          { header: "Service", width: 34, value: (i: PriceItem) => i.name },
          {
            header: "Category",
            width: 24,
            value: (i: PriceItem) => PRICE_CATEGORY_LABELS[i.category],
          },
          {
            header: "Private tariff code",
            width: 18,
            value: (i: PriceItem) => i.private_tariff_code,
          },
          {
            header: "Private price",
            type: "money",
            width: 14,
            value: (i: PriceItem) => i.private_price,
          },
          {
            header: "Medical aid tariff code",
            width: 21,
            value: (i: PriceItem) => i.medical_aid_tariff_code,
          },
          {
            header: "Medical aid price",
            type: "money",
            width: 17,
            value: (i: PriceItem) => i.medical_aid_price,
          },
          { header: "Shown", width: 8, value: (i: PriceItem) => (i.active ? "Yes" : "Hidden") },
          { header: "Notes", width: 30, value: (i: PriceItem) => i.notes },
        ],
      },
    ]);

  const actions = (item: PriceItem, index: number, count: number) => (
    <>
      <IconButton
        label={`Move ${item.name} up`}
        disabled={index === 0}
        onClick={() => move(item, -1)}
      >
        <ArrowUp className="h-4 w-4" />
      </IconButton>
      <IconButton
        label={`Move ${item.name} down`}
        disabled={index === count - 1}
        onClick={() => move(item, 1)}
      >
        <ArrowDown className="h-4 w-4" />
      </IconButton>
      <IconButton label={`Edit ${item.name}`} onClick={() => setEditing(item)}>
        <Pencil className="h-4 w-4" />
      </IconButton>
      <IconButton
        label={item.active ? `Hide ${item.name}` : `Show ${item.name}`}
        onClick={() => toggleActive(item)}
      >
        {item.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </IconButton>
      <IconButton label={`Delete ${item.name}`} tone="danger" onClick={() => remove(item)}>
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </>
  );

  return (
    <section>
      <PageHeader
        title="Price list"
        description="The services you charge for. Pick them on invoice lines to fill in the tariff code and price."
        actions={
          <>
            <ExportButton onExport={exportExcel} disabled={all.length === 0} />
            <Button onClick={() => setEditing("new")}>
              <Plus /> Add service
            </Button>
          </>
        }
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchField
          className="sm:w-72"
          value={search}
          onChange={setSearch}
          placeholder="Search service or tariff code"
        />
        {hiddenCount > 0 ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-grey">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--blue)]"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
            />
            Show {hiddenCount} hidden service{hiddenCount === 1 ? "" : "s"}
          </label>
        ) : null}
      </div>

      {list.error ? (
        <Panel className="mt-4">
          <EmptyState
            icon={Tags}
            title="The price list couldn't be loaded"
            description={
              /price_list_items/.test(list.error.message)
                ? "The price list table doesn't exist yet. Run the price list migration in the Supabase SQL Editor, then reload."
                : list.error.message
            }
          />
        </Panel>
      ) : list.isPending ? (
        <Panel className="mt-4">
          <LoadingRows />
        </Panel>
      ) : groups.length === 0 ? (
        <Panel className="mt-4">
          <EmptyState
            icon={Tags}
            title={all.length === 0 ? "No services yet" : "No services match"}
            description={
              all.length === 0
                ? "Add consultations, procedures and tests with their tariff codes and prices."
                : "Try another name or tariff code."
            }
            action={
              all.length === 0 ? (
                <Button onClick={() => setEditing("new")}>
                  <Plus /> Add service
                </Button>
              ) : undefined
            }
          />
        </Panel>
      ) : (
        groups.map((group) => (
          <div key={group.category} className="mt-6">
            <h2 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-grey">
              {PRICE_CATEGORY_LABELS[group.category]}
            </h2>
            <Panel>
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={tableHeadClass}>
                      <th className="px-4 py-3 font-semibold">Service</th>
                      <th className="w-44 px-4 py-3 font-semibold">Private</th>
                      <th className="w-44 px-4 py-3 font-semibold">Medical aid rate</th>
                      <th className="w-56 px-4 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {group.items.map((item, index) => (
                      <tr
                        key={item.id}
                        className={cn(
                          "transition-colors hover:bg-canvas/60",
                          !item.active && "text-grey",
                        )}
                      >
                        <td className="px-4 py-3.5">
                          <p className={cn("font-medium", item.active ? "text-ink" : "text-grey")}>
                            {item.name}
                          </p>
                          {!item.active ? (
                            <div className="mt-1">
                              <Badge tone="grey">Hidden</Badge>
                            </div>
                          ) : null}
                          {item.notes ? (
                            <p className="mt-0.5 text-xs text-grey">{item.notes}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3.5">
                          <RateCell code={item.private_tariff_code} price={item.private_price} />
                        </td>
                        <td className="px-4 py-3.5">
                          <RateCell
                            code={item.medical_aid_tariff_code}
                            price={item.medical_aid_price}
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex justify-end gap-0.5">
                            {actions(item, index, group.items.length)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-hairline md:hidden">
                {group.items.map((item, index) => (
                  <li key={item.id} className="px-4 py-4">
                    <p className={cn("font-medium", item.active ? "text-ink" : "text-grey")}>
                      {item.name}
                    </p>
                    {!item.active ? (
                      <div className="mt-1">
                        <Badge tone="grey">Hidden</Badge>
                      </div>
                    ) : null}
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-grey">Private</p>
                        <RateCell code={item.private_tariff_code} price={item.private_price} />
                      </div>
                      <div>
                        <p className="text-xs text-grey">Medical aid rate</p>
                        <RateCell
                          code={item.medical_aid_tariff_code}
                          price={item.medical_aid_price}
                        />
                      </div>
                    </div>
                    <div className="-mr-2 mt-2 flex justify-end gap-0.5">
                      {actions(item, index, group.items.length)}
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        ))
      )}

      {editing ? (
        <PriceItemDialog
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </section>
  );
}
