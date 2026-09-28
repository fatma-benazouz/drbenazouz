import { Paperclip, X } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import {
  copyReceipt,
  openReceipt,
  removeReceipt,
  uploadReceipt,
  useCategories,
  useRefreshAccounting,
} from "@/components/admin/accounting/data";
import {
  Field,
  inputClass,
  Modal,
  MoneyInput,
  Segmented,
  SelectInput,
} from "@/components/admin/form";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { parseAmount, type PaidFrom } from "@/lib/accounting";
import {
  ASSET_TYPE_LABELS,
  ASSET_TYPES,
  SMALL_ITEM_LIMIT,
  suggestWriteOffYears,
  type Asset,
  type AssetType,
} from "@/lib/assets";
import { money, todayIso } from "@/lib/invoices";

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

type Draft = {
  name: string;
  asset_type: AssetType;
  supplier: string;
  purchase_date: string;
  cost: string;
  write_off_years: string;
  years_touched: boolean;
  serial_number: string;
  warranty_until: string;
  paid_from: PaidFrom;
  financed: boolean;
  disposed_date: string;
  notes: string;
};

function toDraft(asset: Asset | null): Draft {
  return {
    name: asset?.name ?? "",
    asset_type: asset?.asset_type ?? "office_equipment",
    supplier: asset?.supplier ?? "",
    purchase_date: asset?.purchase_date ?? todayIso(),
    cost: asset ? asset.cost.toFixed(2) : "",
    write_off_years: asset ? String(asset.write_off_years) : "",
    years_touched: Boolean(asset),
    serial_number: asset?.serial_number ?? "",
    warranty_until: asset?.warranty_until ?? "",
    paid_from: asset?.paid_from ?? "personal",
    financed: asset?.financed ?? false,
    disposed_date: asset?.disposed_date ?? "",
    notes: asset?.notes ?? "",
  };
}

export function AssetDialog({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
  const uid = useId();
  const refresh = useRefreshAccounting();
  const categories = useCategories();
  const [draft, setDraft] = useState<Draft>(() => toDraft(asset));
  const [file, setFile] = useState<File | null>(null);
  const [keepReceipt, setKeepReceipt] = useState(true);
  const [alsoExpense, setAlsoExpense] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});

  const cost = parseAmount(draft.cost);
  const suggested = cost != null ? suggestWriteOffYears(draft.asset_type, cost) : null;

  // Keep the write-off period on the SARS suggestion until it's changed by hand.
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => {
      const next = { ...d, [key]: value };
      if (!next.years_touched && (key === "cost" || key === "asset_type")) {
        const c = parseAmount(next.cost);
        next.write_off_years = c != null ? String(suggestWriteOffYears(next.asset_type, c)) : "";
      }
      return next;
    });

  const equipmentCategory = (categories.data ?? []).find((c) => c.name === "Equipment purchases");

  const save = async () => {
    const years = Number.parseFloat(draft.write_off_years);
    const next: typeof errors = {};
    if (!draft.name.trim()) next.name = "What is the item?";
    if (cost == null || cost <= 0) next.cost = "Enter what it cost.";
    if (!draft.purchase_date) next.purchase_date = "Choose the purchase date.";
    if (!Number.isFinite(years) || years < 1) next.write_off_years = "At least 1 year.";
    if (draft.disposed_date && draft.disposed_date < draft.purchase_date)
      next.disposed_date = "Can't be before the purchase date.";
    setErrors(next);
    if (Object.keys(next).length > 0 || cost == null) return;

    setSaving(true);
    let uploaded: string | null = null;
    let expenseCopy: string | null = null;
    try {
      if (file) uploaded = await uploadReceipt(file, draft.purchase_date);
      const previous = asset?.receipt_path ?? null;
      const receiptPath = uploaded ?? (keepReceipt ? previous : null);

      const payload = {
        name: draft.name.trim(),
        asset_type: draft.asset_type,
        supplier: draft.supplier.trim() || null,
        purchase_date: draft.purchase_date,
        cost,
        write_off_years: years,
        serial_number: draft.serial_number.trim() || null,
        warranty_until: draft.warranty_until || null,
        paid_from: draft.paid_from,
        financed: draft.financed,
        disposed_date: draft.disposed_date || null,
        notes: draft.notes.trim() || null,
        receipt_path: receiptPath,
      };
      const { error } = asset
        ? await supabase.from("assets").update(payload).eq("id", asset.id)
        : await supabase.from("assets").insert(payload);
      if (error) throw error;

      if (!asset && alsoExpense && equipmentCategory) {
        // The expense gets its own copy of the receipt so the two records stay independent.
        if (receiptPath) expenseCopy = await copyReceipt(receiptPath);
        const { error: expenseError } = await supabase.from("expenses").insert({
          expense_date: draft.purchase_date,
          supplier: draft.supplier.trim() || draft.name.trim(),
          description: draft.name.trim(),
          category_id: equipmentCategory.id,
          amount: cost,
          paid_from: draft.paid_from,
          status: "paid",
          receipt_path: expenseCopy,
          notes: "Recorded from the equipment register.",
        });
        if (expenseError) throw expenseError;
      }

      if (previous && previous !== receiptPath) await removeReceipt(previous);
      toast.success(asset ? "Equipment updated." : "Equipment added.");
      refresh();
      onClose();
    } catch (error) {
      if (uploaded) await removeReceipt(uploaded);
      if (expenseCopy) await removeReceipt(expenseCopy);
      toast.error(error instanceof Error ? error.message : "Could not save the equipment.");
    } finally {
      setSaving(false);
    }
  };

  const existingReceipt = asset?.receipt_path && keepReceipt && !file ? asset.receipt_path : null;
  const years = Number.parseFloat(draft.write_off_years);

  return (
    <Modal
      title={asset ? "Edit equipment" : "Add equipment"}
      description="Items the practice owns, written off for tax over their useful life."
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : asset ? "Save changes" : "Add equipment"}
          </Button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Item" htmlFor={`${uid}-name`} error={errors.name} className="sm:col-span-2">
          <input
            id={`${uid}-name`}
            className={inputClass}
            placeholder="e.g. Canon PIXMA G3470 printer"
            value={draft.name}
            onChange={(e) => update("name", e.target.value)}
            autoFocus={!asset}
          />
        </Field>

        <Field label="Type" htmlFor={`${uid}-type`} className="sm:col-span-2">
          <SelectInput
            id={`${uid}-type`}
            value={draft.asset_type}
            onChange={(v) => update("asset_type", v)}
            options={ASSET_TYPES.map((t) => ({ value: t, label: ASSET_TYPE_LABELS[t] }))}
          />
        </Field>

        <Field
          label="Cost"
          htmlFor={`${uid}-cost`}
          error={errors.cost}
          hint="The full price, even if paid in instalments."
        >
          <MoneyInput id={`${uid}-cost`} value={draft.cost} onChange={(v) => update("cost", v)} />
        </Field>

        <Field label="Purchase date" htmlFor={`${uid}-date`} error={errors.purchase_date}>
          <input
            id={`${uid}-date`}
            type="date"
            className={inputClass}
            value={draft.purchase_date}
            onChange={(e) => update("purchase_date", e.target.value)}
          />
        </Field>

        <Field
          label="Write off over (years)"
          htmlFor={`${uid}-years`}
          error={errors.write_off_years}
          className="sm:col-span-2"
          hint={
            cost != null && cost > 0 ? (
              cost < SMALL_ITEM_LIMIT ? (
                `Under ${money(SMALL_ITEM_LIMIT)}, so SARS allows it to be written off in full this year.`
              ) : (
                <>
                  SARS guideline for this type: {suggested} year{suggested === 1 ? "" : "s"}
                  {Number.isFinite(years) && years >= 1
                    ? ` · about ${money(cost / years)} a year`
                    : ""}
                  .
                </>
              )
            ) : (
              "Filled in from SARS guidelines once you enter the cost."
            )
          }
        >
          <input
            id={`${uid}-years`}
            inputMode="decimal"
            className={inputClass}
            value={draft.write_off_years}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                write_off_years: e.target.value.replace(/[^\d.]/g, ""),
                years_touched: true,
              }))
            }
          />
        </Field>

        <Field label="Supplier" htmlFor={`${uid}-supplier`}>
          <input
            id={`${uid}-supplier`}
            className={inputClass}
            placeholder="e.g. Incredible Connection"
            value={draft.supplier}
            onChange={(e) => update("supplier", e.target.value)}
          />
        </Field>

        <Field label="Serial number" htmlFor={`${uid}-serial`}>
          <input
            id={`${uid}-serial`}
            className={inputClass}
            value={draft.serial_number}
            onChange={(e) => update("serial_number", e.target.value)}
          />
        </Field>

        <Field label="Warranty until" htmlFor={`${uid}-warranty`}>
          <input
            id={`${uid}-warranty`}
            type="date"
            className={inputClass}
            value={draft.warranty_until}
            onChange={(e) => update("warranty_until", e.target.value)}
          />
        </Field>

        <Field label="Paid from">
          <Segmented
            label="Paid from"
            value={draft.paid_from}
            onChange={(v) => update("paid_from", v)}
            options={[
              { value: "personal", label: "Personal" },
              { value: "practice", label: "Practice" },
            ]}
          />
        </Field>

        <div className="space-y-3 sm:col-span-2">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--blue)]"
              checked={draft.financed}
              onChange={(e) => {
                update("financed", e.target.checked);
                if (!asset) setAlsoExpense(!e.target.checked);
              }}
            />
            <span>
              Bought on instalments
              <span className="block text-xs text-grey">
                Record the monthly repayments as a recurring cost under "Instalment repayments".
              </span>
            </span>
          </label>
          {!asset ? (
            <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[var(--blue)]"
                checked={alsoExpense}
                onChange={(e) => setAlsoExpense(e.target.checked)}
              />
              <span>
                Also add the payment to Expenses
                <span className="block text-xs text-grey">
                  Recorded under "Equipment purchases", which doesn't count as a running cost, so
                  it's never counted twice.
                </span>
              </span>
            </label>
          ) : null}
        </div>

        <Field label="Receipt" className="sm:col-span-2" hint="Photo or PDF, up to 10 MB.">
          {existingReceipt ? (
            <div className="flex items-center justify-between gap-3 border border-hairline bg-canvas px-3 py-2">
              <button
                type="button"
                className="flex items-center gap-2 text-sm text-blue hover:underline"
                onClick={() =>
                  openReceipt(existingReceipt).catch((e: Error) => toast.error(e.message))
                }
              >
                <Paperclip className="h-4 w-4" /> View attached receipt
              </button>
              <button
                type="button"
                className="text-xs text-grey hover:text-red-700"
                onClick={() => setKeepReceipt(false)}
              >
                Remove
              </button>
            </div>
          ) : file ? (
            <div className="flex items-center justify-between gap-3 border border-hairline bg-canvas px-3 py-2">
              <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                <Paperclip className="h-4 w-4 shrink-0" />
                <span className="truncate">{file.name}</span>
              </span>
              <button
                type="button"
                aria-label="Remove selected file"
                className="text-grey hover:text-red-700"
                onClick={() => setFile(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <input
              type="file"
              accept="image/*,application/pdf"
              className="block w-full text-sm text-grey file:mr-3 file:h-10 file:cursor-pointer file:border file:border-hairline file:bg-white file:px-4 file:text-sm file:font-semibold file:text-ink hover:file:border-ink"
              onChange={(e) => {
                const chosen = e.target.files?.[0] ?? null;
                if (chosen && chosen.size > MAX_RECEIPT_BYTES) {
                  toast.error("That file is over 10 MB. Try a smaller photo or PDF.");
                  e.target.value = "";
                  return;
                }
                setFile(chosen);
              }}
            />
          )}
        </Field>

        {asset ? (
          <Field
            label="Disposed of on"
            htmlFor={`${uid}-disposed`}
            error={errors.disposed_date}
            hint="If it was sold, scrapped or lost. The write-off stops from this month."
          >
            <input
              id={`${uid}-disposed`}
              type="date"
              className={inputClass}
              value={draft.disposed_date}
              onChange={(e) => update("disposed_date", e.target.value)}
            />
          </Field>
        ) : null}

        <Field
          label="Notes"
          htmlFor={`${uid}-notes`}
          className={asset ? undefined : "sm:col-span-2"}
        >
          <input
            id={`${uid}-notes`}
            className={inputClass}
            value={draft.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
