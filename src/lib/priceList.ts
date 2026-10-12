import type { Database } from "@/integrations/supabase/types";
import { toNumber } from "@/lib/invoices";

/*
 * Price list: services the practice charges for, each with a private rate
 * and/or a medical aid rate. A rate has its own tariff code and price
 * (e.g. GP consultation: 0190 at R820 private, 0191 at R620.20 medical aid).
 */

export const PRICE_CATEGORIES = [
  "consultation",
  "procedure",
  "test",
  "medication",
  "other",
] as const;
export type PriceCategory = (typeof PRICE_CATEGORIES)[number];

export const PRICE_CATEGORY_LABELS: Record<PriceCategory, string> = {
  consultation: "Consultations",
  procedure: "Procedures",
  test: "Tests",
  medication: "Medication & consumables",
  other: "Other",
};

export type Rate = "private" | "medical_aid";

export const RATE_LABELS: Record<Rate, string> = {
  private: "Private",
  medical_aid: "Medical aid rate",
};

type Row = Database["public"]["Tables"]["price_list_items"]["Row"];

export type PriceItem = Omit<Row, "category"> & { category: PriceCategory };

export function normalisePriceItem(row: Row): PriceItem {
  return {
    ...row,
    private_price: row.private_price == null ? null : toNumber(row.private_price),
    medical_aid_price: row.medical_aid_price == null ? null : toNumber(row.medical_aid_price),
  } as PriceItem;
}

export function hasRate(
  item: Pick<PriceItem, "private_price" | "medical_aid_price">,
  rate: Rate,
): boolean {
  return (rate === "private" ? item.private_price : item.medical_aid_price) != null;
}

/** The rate to use: the preferred one if the service has it, otherwise the other. */
export function resolveRate(
  item: Pick<PriceItem, "private_price" | "medical_aid_price">,
  preferred: Rate,
): Rate {
  if (hasRate(item, preferred)) return preferred;
  return preferred === "private" ? "medical_aid" : "private";
}

/** Tariff code and price for a rate (falls back to the other rate if missing). */
export function priceFor(
  item: PriceItem,
  preferred: Rate,
): { rate: Rate; tariffCode: string | null; price: number } {
  const rate = resolveRate(item, preferred);
  return rate === "private"
    ? { rate, tariffCode: item.private_tariff_code, price: item.private_price ?? 0 }
    : { rate, tariffCode: item.medical_aid_tariff_code, price: item.medical_aid_price ?? 0 };
}

/** Patients with a medical aid on the document default to the medical aid rate. */
export function defaultRate(medicalAidName: string | null | undefined): Rate {
  return medicalAidName && medicalAidName.trim() ? "medical_aid" : "private";
}

/**
 * Suggestions for what's typed: active services whose name contains the text
 * or whose tariff code starts with it. Name-start matches come first.
 */
export function searchPriceList(items: PriceItem[], query: string, limit = 8): PriceItem[] {
  const q = query.trim().toLowerCase();
  const active = items.filter((i) => i.active);
  if (!q) return active.slice(0, limit);
  const scored = active
    .map((item) => {
      const name = item.name.toLowerCase();
      const codes = [item.private_tariff_code, item.medical_aid_tariff_code].filter(
        Boolean,
      ) as string[];
      let score = -1;
      if (name.startsWith(q)) score = 0;
      else if (codes.some((c) => c.toLowerCase().startsWith(q))) score = 1;
      else if (name.split(/\s+/).some((w) => w.startsWith(q))) score = 2;
      else if (name.includes(q)) score = 3;
      return { item, score };
    })
    .filter((s) => s.score >= 0)
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.item.sort_order - b.item.sort_order ||
        a.item.name.localeCompare(b.item.name),
    );
  return scored.slice(0, limit).map((s) => s.item);
}
