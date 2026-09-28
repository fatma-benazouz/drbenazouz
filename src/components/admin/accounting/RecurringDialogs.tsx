import { useId, useState } from "react";
import { toast } from "sonner";

import {
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
import {
  EXPENSE_METHODS,
  FREQUENCIES,
  FREQUENCY_LABELS,
  METHOD_LABELS,
  monthOf,
  nextDueAfter,
  parseAmount,
  periodLabel,
  recurringAmount,
  type ExpenseMethod,
  type Frequency,
  type PaidFrom,
  type RecurringExpense,
} from "@/lib/accounting";
import { formatDocDate, money, todayIso } from "@/lib/invoices";

// ---------------------------------------------------------------------------
// Create / edit a recurring cost
// ---------------------------------------------------------------------------

type Draft = {
  name: string;
  supplier: string;
  category_id: string;
  fixed_amount: string;
  has_units: boolean;
  unit_amount: string;
  unit_label: string;
  frequency: Frequency;
  next_due_date: string;
  payment_method: ExpenseMethod | "";
  paid_from: PaidFrom;
  notes: string;
};

function toDraft(item: RecurringExpense | null): Draft {
  return {
    name: item?.name ?? "",
    supplier: item?.supplier ?? "",
    category_id: item?.category_id ?? "",
    fixed_amount: item?.fixed_amount != null ? item.fixed_amount.toFixed(2) : "",
    has_units: item?.unit_amount != null,
    unit_amount: item?.unit_amount != null ? item.unit_amount.toFixed(2) : "",
    unit_label: item?.unit_label ?? "",
    frequency: item?.frequency ?? "monthly",
    next_due_date: item?.next_due_date ?? todayIso(),
    payment_method: item?.payment_method ?? "",
    paid_from: item?.paid_from ?? "personal",
    notes: item?.notes ?? "",
  };
}

export function RecurringDialog({
  item,
  onClose,
}: {
  item: RecurringExpense | null;
  onClose: () => void;
}) {
  const uid = useId();
  const refresh = useRefreshAccounting();
  const categories = useCategories();
  const [draft, setDraft] = useState<Draft>(() => toDraft(item));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    const fixed = draft.fixed_amount.trim() ? parseAmount(draft.fixed_amount) : null;
    const unit =
      draft.has_units && draft.unit_amount.trim() ? parseAmount(draft.unit_amount) : null;
    const next: typeof errors = {};
    if (!draft.name.trim()) next.name = "Give this cost a name.";
    if (!draft.category_id) next.category_id = "Choose a category.";
    if (draft.fixed_amount.trim() && (fixed == null || fixed < 0))
      next.fixed_amount = "Enter a valid amount.";
    if (draft.has_units && (unit == null || unit <= 0))
      next.unit_amount = "Enter the price per item.";
    if (!draft.next_due_date) next.next_due_date = "Choose when it's next due.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    const payload = {
      name: draft.name.trim(),
      supplier: draft.supplier.trim() || null,
      category_id: draft.category_id,
      fixed_amount: fixed,
      unit_amount: draft.has_units ? unit : null,
      unit_label: draft.has_units ? draft.unit_label.trim() || null : null,
      frequency: draft.frequency,
      next_due_date: draft.next_due_date,
      payment_method: draft.payment_method || null,
      paid_from: draft.paid_from,
      notes: draft.notes.trim() || null,
    };
    const { error } = item
      ? await supabase.from("recurring_expenses").update(payload).eq("id", item.id)
      : await supabase.from("recurring_expenses").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(item ? "Recurring cost updated." : "Recurring cost added.");
    refresh();
    onClose();
  };

  return (
    <Modal
      title={item ? "Edit recurring cost" : "Add recurring cost"}
      description="Rent, subscriptions, insurance and other regular bills."
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : item ? "Save changes" : "Add recurring cost"}
          </Button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" htmlFor={`${uid}-name`} error={errors.name}>
          <input
            id={`${uid}-name`}
            className={inputClass}
            placeholder="e.g. Rent, Office wifi"
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            autoFocus={!item}
          />
        </Field>
        <Field label="Supplier" htmlFor={`${uid}-supplier`}>
          <input
            id={`${uid}-supplier`}
            className={inputClass}
            placeholder="Who is paid"
            value={draft.supplier}
            onChange={(e) => set("supplier", e.target.value)}
          />
        </Field>

        <Field
          label="Category"
          htmlFor={`${uid}-category`}
          error={errors.category_id}
          className="sm:col-span-2"
        >
          <SelectInput
            id={`${uid}-category`}
            value={draft.category_id}
            onChange={(v) => set("category_id", v)}
            options={(categories.data ?? [])
              .filter((c) => c.active || c.id === draft.category_id)
              .map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Choose a category"
          />
        </Field>

        <Field label="How often" className="sm:col-span-2">
          <Segmented
            label="How often"
            value={draft.frequency}
            onChange={(v) => set("frequency", v)}
            options={FREQUENCIES.map((f) => ({ value: f, label: FREQUENCY_LABELS[f] }))}
          />
        </Field>

        <Field
          label="Fixed amount"
          htmlFor={`${uid}-fixed`}
          error={errors.fixed_amount}
          hint="Leave empty if it changes every time."
        >
          <MoneyInput
            id={`${uid}-fixed`}
            value={draft.fixed_amount}
            onChange={(v) => set("fixed_amount", v)}
          />
        </Field>
        <Field label="Next due" htmlFor={`${uid}-due`} error={errors.next_due_date}>
          <input
            id={`${uid}-due`}
            type="date"
            className={inputClass}
            value={draft.next_due_date}
            onChange={(e) => set("next_due_date", e.target.value)}
          />
        </Field>

        <div className="sm:col-span-2">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--blue)]"
              checked={draft.has_units}
              onChange={(e) => set("has_units", e.target.checked)}
            />
            <span>
              Also charged per item
              <span className="block text-xs text-grey">
                For example GoodX's R10.50 per claim, on top of the fixed fee.
              </span>
            </span>
          </label>
        </div>

        {draft.has_units ? (
          <>
            <Field label="Price per item" htmlFor={`${uid}-unit`} error={errors.unit_amount}>
              <MoneyInput
                id={`${uid}-unit`}
                value={draft.unit_amount}
                onChange={(v) => set("unit_amount", v)}
              />
            </Field>
            <Field label="Item name" htmlFor={`${uid}-unit-label`} hint="e.g. claim, booking, SMS">
              <input
                id={`${uid}-unit-label`}
                className={inputClass}
                value={draft.unit_label}
                onChange={(e) => set("unit_label", e.target.value)}
              />
            </Field>
          </>
        ) : null}

        <Field label="Usual payment method" htmlFor={`${uid}-method`}>
          <SelectInput
            id={`${uid}-method`}
            value={draft.payment_method}
            onChange={(v) => set("payment_method", v)}
            options={EXPENSE_METHODS.map((m) => ({ value: m, label: METHOD_LABELS[m] }))}
            placeholder="Not recorded"
          />
        </Field>
        <Field label="Paid from">
          <Segmented
            label="Paid from"
            value={draft.paid_from}
            onChange={(v) => set("paid_from", v)}
            options={[
              { value: "personal", label: "Personal" },
              { value: "practice", label: "Practice" },
            ]}
          />
        </Field>

        <Field label="Notes" htmlFor={`${uid}-notes`} className="sm:col-span-2">
          <input
            id={`${uid}-notes`}
            className={inputClass}
            placeholder="e.g. Amount to confirm with insurer"
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Mark a recurring cost as paid: records the expense and moves the due date on
// ---------------------------------------------------------------------------

export function MarkPaidDialog({ item, onClose }: { item: RecurringExpense; onClose: () => void }) {
  const uid = useId();
  const refresh = useRefreshAccounting();
  const [units, setUnits] = useState("");
  const [amount, setAmount] = useState(() =>
    item.fixed_amount != null && item.unit_amount == null ? item.fixed_amount.toFixed(2) : "",
  );
  const [date, setDate] = useState(todayIso());
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextDue = nextDueAfter(item.next_due_date, item.frequency);
  const forPeriod = periodLabel(monthOf(item.next_due_date));

  const onUnits = (value: string) => {
    setUnits(value);
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n) && n >= 0) setAmount(recurringAmount(item, n).toFixed(2));
  };

  const advance = async () =>
    supabase.from("recurring_expenses").update({ next_due_date: nextDue }).eq("id", item.id);

  const save = async () => {
    const value = parseAmount(amount);
    if (value == null || value <= 0) {
      setError("Enter the amount paid.");
      return;
    }
    setSaving(true);
    let path: string | null = null;
    try {
      if (file) path = await uploadReceipt(file, date);
      const unitsNote =
        item.unit_amount != null && units
          ? `${units} × ${money(item.unit_amount)}${item.unit_label ? ` per ${item.unit_label}` : ""}`
          : null;
      const { error: insertError } = await supabase.from("expenses").insert({
        expense_date: date,
        supplier: item.supplier || item.name,
        description: `${item.name} – ${forPeriod}`,
        category_id: item.category_id,
        amount: value,
        payment_method: item.payment_method,
        paid_from: item.paid_from,
        status: "paid",
        recurring_expense_id: item.id,
        receipt_path: path,
        notes: unitsNote,
      });
      if (insertError) throw insertError;
      const { error: updateError } = await advance();
      if (updateError) throw updateError;
      toast.success(`${item.name} recorded. Next due ${formatDocDate(nextDue)}.`);
      refresh();
      onClose();
    } catch (e) {
      if (path) await removeReceipt(path);
      toast.error(e instanceof Error ? e.message : "Could not record the payment.");
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    if (
      !window.confirm(
        `Skip ${forPeriod} for ${item.name}? No expense is recorded; it moves to ${formatDocDate(nextDue)}.`,
      )
    )
      return;
    setSaving(true);
    const { error: updateError } = await advance();
    setSaving(false);
    if (updateError) {
      toast.error(updateError.message);
      return;
    }
    toast.success(`${item.name} skipped. Next due ${formatDocDate(nextDue)}.`);
    refresh();
    onClose();
  };

  return (
    <Modal
      title={`Mark ${item.name} as paid`}
      description={`Due ${formatDocDate(item.next_due_date)} · records an expense and moves the next due date to ${formatDocDate(nextDue)}.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" className="mr-auto" onClick={skip} disabled={saving}>
            Skip this time
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Record payment"}
          </Button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {item.unit_amount != null ? (
          <Field
            label={`Number of ${item.unit_label ? `${item.unit_label}s` : "items"}`}
            htmlFor={`${uid}-units`}
            hint={`${item.fixed_amount != null ? `${money(item.fixed_amount)} + ` : ""}${money(item.unit_amount)} each`}
          >
            <input
              id={`${uid}-units`}
              inputMode="numeric"
              className={inputClass}
              value={units}
              onChange={(e) => onUnits(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
          </Field>
        ) : null}
        <Field label="Amount paid" htmlFor={`${uid}-amount`} error={error}>
          <MoneyInput id={`${uid}-amount`} value={amount} onChange={setAmount} />
        </Field>
        <Field label="Date paid" htmlFor={`${uid}-date`}>
          <input
            id={`${uid}-date`}
            type="date"
            className={inputClass}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Receipt" className="sm:col-span-2" hint="Optional photo or PDF.">
          <input
            type="file"
            accept="image/*,application/pdf"
            className="block w-full text-sm text-grey file:mr-3 file:h-10 file:cursor-pointer file:border file:border-hairline file:bg-white file:px-4 file:text-sm file:font-semibold file:text-ink hover:file:border-ink"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Field>
      </div>
    </Modal>
  );
}
