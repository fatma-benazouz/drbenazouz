import { Paperclip, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  openReceipt,
  removeReceipt,
  uploadReceipt,
  useCategories,
  useExpenses,
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
  METHOD_LABELS,
  addMonths,
  parseAmount,
  type Expense,
  type ExpenseMethod,
  type PaidFrom,
} from "@/lib/accounting";
import { todayIso } from "@/lib/invoices";

type Draft = {
  expense_date: string;
  supplier: string;
  description: string;
  category_id: string;
  amount: string;
  payment_method: ExpenseMethod | "";
  paid_from: PaidFrom;
  status: "paid" | "unpaid";
  due_date: string;
  reference: string;
  notes: string;
};

function toDraft(expense: Expense | null, defaults: Partial<Draft>): Draft {
  if (!expense) {
    return {
      expense_date: todayIso(),
      supplier: "",
      description: "",
      category_id: "",
      amount: "",
      payment_method: "",
      paid_from: "personal",
      status: "paid",
      due_date: "",
      reference: "",
      notes: "",
      ...defaults,
    };
  }
  return {
    expense_date: expense.expense_date,
    supplier: expense.supplier,
    description: expense.description ?? "",
    category_id: expense.category_id,
    amount: expense.amount.toFixed(2),
    payment_method: expense.payment_method ?? "",
    paid_from: expense.paid_from,
    status: expense.status === "unpaid" ? "unpaid" : "paid",
    due_date: expense.due_date ?? "",
    reference: expense.reference ?? "",
    notes: expense.notes ?? "",
  };
}

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

export function ExpenseDialog({
  expense,
  onClose,
}: {
  /** Existing expense to edit, or null to add a new one. */
  expense: Expense | null;
  onClose: () => void;
}) {
  const uid = useId();
  const refresh = useRefreshAccounting();
  const categories = useCategories();
  // The last year of expenses, to suggest suppliers and their usual category.
  const today = todayIso();
  const history = useExpenses({ from: addMonths(today, -12), to: today });
  const knownExpenses = useMemo(() => history.data ?? [], [history.data]);
  const [draft, setDraft] = useState<Draft>(() => toDraft(expense, {}));
  const [file, setFile] = useState<File | null>(null);
  const [keepReceipt, setKeepReceipt] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // Supplier -> most recent category, for one-tap suggestions.
  const supplierCategory = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of knownExpenses) {
      const key = e.supplier.trim().toLowerCase();
      if (!map.has(key)) map.set(key, e.category_id);
    }
    return map;
  }, [knownExpenses]);
  const suppliers = useMemo(
    () =>
      [...new Set(knownExpenses.map((e) => e.supplier.trim()))].sort((a, b) => a.localeCompare(b)),
    [knownExpenses],
  );

  const onSupplierChange = (value: string) => {
    setDraft((d) => {
      const suggested = supplierCategory.get(value.trim().toLowerCase());
      return { ...d, supplier: value, category_id: d.category_id || suggested || "" };
    });
  };

  const categoryOptions = (categories.data ?? [])
    .filter((c) => c.active || c.id === draft.category_id)
    .map((c) => ({
      value: c.id,
      label: c.affects_profit ? c.name : `${c.name} (not a running cost)`,
    }));

  const save = async () => {
    const amount = parseAmount(draft.amount);
    const next: typeof errors = {};
    if (!draft.supplier.trim()) next.supplier = "Who was paid?";
    if (!draft.category_id) next.category_id = "Choose a category.";
    if (amount == null || amount <= 0) next.amount = "Enter an amount above R0.";
    if (!draft.expense_date) next.expense_date = "Choose a date.";
    setErrors(next);
    if (Object.keys(next).length > 0 || amount == null) return;

    setSaving(true);
    let uploadedPath: string | null = null;
    try {
      if (file) uploadedPath = await uploadReceipt(file, draft.expense_date);
      const previousPath = expense?.receipt_path ?? null;
      const receiptPath = uploadedPath ?? (keepReceipt ? previousPath : null);

      const payload = {
        expense_date: draft.expense_date,
        supplier: draft.supplier.trim(),
        description: draft.description.trim() || null,
        category_id: draft.category_id,
        amount,
        payment_method: draft.payment_method || null,
        paid_from: draft.paid_from,
        status: draft.status,
        due_date: draft.status === "unpaid" ? draft.due_date || null : null,
        reference: draft.reference.trim() || null,
        notes: draft.notes.trim() || null,
        receipt_path: receiptPath,
      };

      const { error } = expense
        ? await supabase.from("expenses").update(payload).eq("id", expense.id)
        : await supabase.from("expenses").insert(payload);
      if (error) throw error;

      // Only discard the old file once the record no longer points at it.
      if (previousPath && previousPath !== receiptPath) await removeReceipt(previousPath);

      toast.success(expense ? "Expense updated." : "Expense added.");
      refresh();
      onClose();
    } catch (error) {
      if (uploadedPath) await removeReceipt(uploadedPath);
      toast.error(error instanceof Error ? error.message : "Could not save the expense.");
    } finally {
      setSaving(false);
    }
  };

  const existingReceipt =
    expense?.receipt_path && keepReceipt && !file ? expense.receipt_path : null;

  return (
    <Modal
      title={expense ? "Edit expense" : "Add expense"}
      description="Record money that went out, with its receipt."
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : expense ? "Save changes" : "Add expense"}
          </Button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Supplier"
          htmlFor={`${uid}-supplier`}
          error={errors.supplier}
          className="sm:col-span-2"
        >
          <input
            id={`${uid}-supplier`}
            className={inputClass}
            list={`${uid}-suppliers`}
            placeholder="e.g. Incredible Connection, landlord, GoodX"
            value={draft.supplier}
            onChange={(e) => onSupplierChange(e.target.value)}
            autoFocus={!expense}
          />
          <datalist id={`${uid}-suppliers`}>
            {suppliers.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>

        <Field label="Amount paid" htmlFor={`${uid}-amount`} error={errors.amount}>
          <MoneyInput
            id={`${uid}-amount`}
            value={draft.amount}
            onChange={(v) => set("amount", v)}
          />
        </Field>

        <Field label="Date" htmlFor={`${uid}-date`} error={errors.expense_date}>
          <input
            id={`${uid}-date`}
            type="date"
            className={inputClass}
            value={draft.expense_date}
            onChange={(e) => set("expense_date", e.target.value)}
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
            options={categoryOptions}
            placeholder="Choose a category"
          />
        </Field>

        <Field label="What was it for?" htmlFor={`${uid}-description`} className="sm:col-span-2">
          <input
            id={`${uid}-description`}
            className={inputClass}
            placeholder="e.g. Office wifi – September"
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>

        <Field label="Status" className="sm:col-span-2">
          <Segmented
            label="Status"
            value={draft.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "paid", label: "Paid" },
              { value: "unpaid", label: "Still to pay" },
            ]}
          />
        </Field>

        {draft.status === "unpaid" ? (
          <Field label="Due date" htmlFor={`${uid}-due`} className="sm:col-span-2">
            <input
              id={`${uid}-due`}
              type="date"
              className={inputClass}
              value={draft.due_date}
              onChange={(e) => set("due_date", e.target.value)}
            />
          </Field>
        ) : null}

        <Field label="Payment method" htmlFor={`${uid}-method`}>
          <SelectInput
            id={`${uid}-method`}
            value={draft.payment_method}
            onChange={(v) => set("payment_method", v)}
            options={EXPENSE_METHODS.map((m) => ({ value: m, label: METHOD_LABELS[m] }))}
            placeholder="Not recorded"
          />
        </Field>

        <Field
          label="Paid from"
          hint="Everything goes through the personal Capitec account for now."
        >
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

        <Field label="Reference" htmlFor={`${uid}-ref`} hint="Invoice or slip number, if any.">
          <input
            id={`${uid}-ref`}
            className={inputClass}
            value={draft.reference}
            onChange={(e) => set("reference", e.target.value)}
          />
        </Field>

        <Field label="Notes" htmlFor={`${uid}-notes`}>
          <input
            id={`${uid}-notes`}
            className={inputClass}
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
