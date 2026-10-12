import { useId, useState } from "react";
import { toast } from "sonner";

import { Field, inputClass, Modal, MoneyInput, SelectInput } from "@/components/admin/form";
import { useRefreshPriceList } from "@/components/admin/price-list/data";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { parseAmount } from "@/lib/accounting";
import {
  PRICE_CATEGORIES,
  PRICE_CATEGORY_LABELS,
  type PriceCategory,
  type PriceItem,
} from "@/lib/priceList";

type Draft = {
  name: string;
  category: PriceCategory;
  private_tariff_code: string;
  private_price: string;
  medical_aid_tariff_code: string;
  medical_aid_price: string;
  notes: string;
};

export type PriceItemPrefill = Partial<Draft>;

function toDraft(item: PriceItem | null, prefill: PriceItemPrefill): Draft {
  if (!item) {
    return {
      name: "",
      category: "consultation",
      private_tariff_code: "",
      private_price: "",
      medical_aid_tariff_code: "",
      medical_aid_price: "",
      notes: "",
      ...prefill,
    };
  }
  return {
    name: item.name,
    category: item.category,
    private_tariff_code: item.private_tariff_code ?? "",
    private_price: item.private_price != null ? item.private_price.toFixed(2) : "",
    medical_aid_tariff_code: item.medical_aid_tariff_code ?? "",
    medical_aid_price: item.medical_aid_price != null ? item.medical_aid_price.toFixed(2) : "",
    notes: item.notes ?? "",
  };
}

export function PriceItemDialog({
  item,
  prefill = {},
  onClose,
  onSaved,
}: {
  item: PriceItem | null;
  prefill?: PriceItemPrefill | undefined;
  onClose: () => void;
  /** Called with the saved service (e.g. to link an invoice line to it). */
  onSaved?: ((saved: PriceItem) => void) | undefined;
}) {
  const uid = useId();
  const refresh = useRefreshPriceList();
  const [draft, setDraft] = useState<Draft>(() => toDraft(item, prefill));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft | "prices", string>>>({});
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    const priv = draft.private_price.trim() ? parseAmount(draft.private_price) : null;
    const aid = draft.medical_aid_price.trim() ? parseAmount(draft.medical_aid_price) : null;
    const next: typeof errors = {};
    if (!draft.name.trim()) next.name = "Name the service.";
    if (draft.private_price.trim() && (priv == null || priv < 0))
      next.private_price = "Enter a valid price.";
    if (draft.medical_aid_price.trim() && (aid == null || aid < 0))
      next.medical_aid_price = "Enter a valid price.";
    if (!draft.private_price.trim() && !draft.medical_aid_price.trim())
      next.prices = "Add at least one price.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    const payload = {
      name: draft.name.trim(),
      category: draft.category,
      private_tariff_code: draft.private_tariff_code.trim() || null,
      private_price: priv,
      medical_aid_tariff_code: draft.medical_aid_tariff_code.trim() || null,
      medical_aid_price: aid,
      notes: draft.notes.trim() || null,
    };
    const query = item
      ? supabase.from("price_list_items").update(payload).eq("id", item.id).select("*").single()
      : supabase.from("price_list_items").insert(payload).select("*").single();
    const { data, error } = await query;
    setSaving(false);
    if (error || !data) {
      toast.error(error?.message ?? "Could not save the service.");
      return;
    }
    toast.success(item ? "Service updated." : "Service added to the price list.");
    void refresh();
    onSaved?.({
      ...(data as PriceItem),
      private_price: data.private_price == null ? null : Number(data.private_price),
      medical_aid_price: data.medical_aid_price == null ? null : Number(data.medical_aid_price),
    });
    onClose();
  };

  const rateBlock = (
    title: string,
    hint: string,
    codeKey: "private_tariff_code" | "medical_aid_tariff_code",
    priceKey: "private_price" | "medical_aid_price",
    codePlaceholder: string,
  ) => (
    <fieldset className="border border-hairline p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-[0.08em] text-grey">
        {title}
      </legend>
      <p className="-mt-1 mb-3 text-xs text-grey">{hint}</p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Tariff code" htmlFor={`${uid}-${codeKey}`}>
          <input
            id={`${uid}-${codeKey}`}
            className={inputClass}
            placeholder={codePlaceholder}
            value={draft[codeKey]}
            onChange={(e) => set(codeKey, e.target.value)}
          />
        </Field>
        <Field label="Price" htmlFor={`${uid}-${priceKey}`} error={errors[priceKey]}>
          <MoneyInput
            id={`${uid}-${priceKey}`}
            value={draft[priceKey]}
            onChange={(v) => set(priceKey, v)}
          />
        </Field>
      </div>
    </fieldset>
  );

  return (
    <Modal
      title={item ? "Edit service" : "Add service"}
      description="Picked from invoice lines to fill in the description, tariff code and price."
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : item ? "Save changes" : "Add service"}
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <Field label="Service" htmlFor={`${uid}-name`} error={errors.name}>
            <input
              id={`${uid}-name`}
              className={inputClass}
              placeholder="e.g. In-person GP consultation"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              autoFocus={!item}
            />
          </Field>
          <Field label="Category" htmlFor={`${uid}-category`}>
            <SelectInput
              id={`${uid}-category`}
              value={draft.category}
              onChange={(v) => set("category", v)}
              options={PRICE_CATEGORIES.map((c) => ({ value: c, label: PRICE_CATEGORY_LABELS[c] }))}
            />
          </Field>
        </div>

        {rateBlock(
          "Private",
          "Patients paying privately.",
          "private_tariff_code",
          "private_price",
          "e.g. 0190",
        )}
        {rateBlock(
          "Medical aid rate",
          "Patients with a medical aid. Leave empty if there's no separate rate.",
          "medical_aid_tariff_code",
          "medical_aid_price",
          "e.g. 0191",
        )}
        {errors.prices ? <p className="-mt-2 text-xs text-red-700">{errors.prices}</p> : null}

        <Field label="Notes" htmlFor={`${uid}-notes`} hint="For the practice only.">
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
