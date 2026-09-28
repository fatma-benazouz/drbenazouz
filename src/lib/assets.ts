import type { Database } from "@/integrations/supabase/types";
import type { DateRange, PaidFrom } from "@/lib/accounting";
import { toNumber } from "@/lib/invoices";

/*
 * Equipment register: SARS wear-and-tear (section 11(e)) write-off.
 *
 * Model used for estimates (confirm figures with the practice's accountant):
 * - Items under R7,000 are written off in full when bought (write_off_years = 1).
 * - Other items are written off straight-line over write_off_years, spread
 *   evenly per month from the month of purchase. A tax year's allowance is
 *   therefore apportioned for the months the item was owned, as SARS requires.
 * - No allowance is claimed after the month an item is disposed of.
 */

export const SMALL_ITEM_LIMIT = 7000;

export const ASSET_TYPES = [
  "computer",
  "phone",
  "medical_equipment",
  "office_equipment",
  "furniture",
  "other",
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  computer: "Computer / laptop",
  phone: "Phone / tablet",
  medical_equipment: "Medical equipment",
  office_equipment: "Office equipment (printer, card machine)",
  furniture: "Furniture & fittings",
  other: "Other",
};

/** Typical SARS write-off periods (Interpretation Note 47 / BGR 7). */
export const SUGGESTED_YEARS: Record<AssetType, number> = {
  computer: 3,
  phone: 2,
  medical_equipment: 5,
  office_equipment: 3,
  furniture: 6,
  other: 5,
};

export function suggestWriteOffYears(type: AssetType, cost: number): number {
  return cost > 0 && cost < SMALL_ITEM_LIMIT ? 1 : SUGGESTED_YEARS[type];
}

type AssetRow = Database["public"]["Tables"]["assets"]["Row"];

export type Asset = Omit<AssetRow, "asset_type" | "paid_from"> & {
  asset_type: AssetType;
  paid_from: PaidFrom;
};

export function normaliseAsset(row: AssetRow): Asset {
  return {
    ...row,
    cost: toNumber(row.cost),
    write_off_years: toNumber(row.write_off_years),
  } as Asset;
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

/** "2026-09-08" -> "2026-09" */
const monthKey = (iso: string) => iso.slice(0, 7);

function nextMonthKey(key: string): string {
  const [y, m] = key.split("-").map((p) => Number.parseInt(p, 10));
  const year = (y ?? 1970) + ((m ?? 1) === 12 ? 1 : 0);
  const month = ((m ?? 1) % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export type AllowanceEntry = { month: string; amount: number };

/**
 * Month-by-month write-off for an asset, in whole cents. The last month takes
 * any rounding remainder so the entries always add up to the exact cost.
 */
export function allowanceSchedule(
  asset: Pick<Asset, "cost" | "purchase_date" | "write_off_years" | "disposed_date">,
): AllowanceEntry[] {
  const totalCents = Math.round(asset.cost * 100);
  if (totalCents <= 0) return [];
  const start = monthKey(asset.purchase_date);
  const lastAllowed = asset.disposed_date ? monthKey(asset.disposed_date) : null;

  if (asset.write_off_years <= 1) {
    return [{ month: start, amount: totalCents / 100 }];
  }

  const months = Math.round(asset.write_off_years * 12);
  const perMonth = Math.floor(totalCents / months);
  const entries: AllowanceEntry[] = [];
  let key = start;
  let allocated = 0;
  for (let i = 0; i < months; i += 1) {
    if (lastAllowed && key > lastAllowed) break;
    const cents = i === months - 1 ? totalCents - allocated : perMonth;
    entries.push({ month: key, amount: cents / 100 });
    allocated += cents;
    key = nextMonthKey(key);
  }
  return entries;
}

/** Write-off falling within a date range (whole months). */
export function allowanceInRange(
  asset: Parameters<typeof allowanceSchedule>[0],
  range: DateRange,
): number {
  const from = monthKey(range.from);
  const to = monthKey(range.to);
  const cents = allowanceSchedule(asset)
    .filter((e) => e.month >= from && e.month <= to)
    .reduce((sum, e) => sum + Math.round(e.amount * 100), 0);
  return cents / 100;
}

/** Cost less everything written off up to and including the given date's month. */
export function bookValue(asset: Parameters<typeof allowanceSchedule>[0], asOf: string): number {
  const to = monthKey(asOf);
  const writtenOff = allowanceSchedule(asset)
    .filter((e) => e.month <= to)
    .reduce((sum, e) => sum + Math.round(e.amount * 100), 0);
  return (Math.round(asset.cost * 100) - writtenOff) / 100;
}
