import { ChevronLeft, ChevronRight, FileSpreadsheet, Loader2, Paperclip } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { openReceipt } from "@/components/admin/accounting/data";
import { IconButton } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { monthOf, periodLabel, shiftPeriod, taxYearOf, type Period } from "@/lib/accounting";
import { todayIso } from "@/lib/invoices";
import { cn } from "@/lib/utils";

export function PeriodPicker({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  const today = todayIso();
  const isCurrent =
    value.kind === "month"
      ? JSON.stringify(value) === JSON.stringify(monthOf(today))
      : JSON.stringify(value) === JSON.stringify(taxYearOf(today));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="flex border border-hairline bg-white"
        role="radiogroup"
        aria-label="Period type"
      >
        {(
          [
            ["month", "Month"],
            ["tax_year", "Tax year"],
          ] as const
        ).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={value.kind === kind}
            onClick={() => onChange(kind === "month" ? monthOf(today) : taxYearOf(today))}
            className={cn(
              "h-9 border-r border-hairline px-3 text-sm transition-colors last:border-r-0",
              value.kind === kind
                ? "bg-ink text-white"
                : "text-grey hover:bg-canvas hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex h-9 items-center border border-hairline bg-white">
        <IconButton label="Previous period" onClick={() => onChange(shiftPeriod(value, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </IconButton>
        <span className="min-w-[9.5rem] px-1 text-center text-sm font-semibold text-ink">
          {periodLabel(value)}
        </span>
        <IconButton label="Next period" onClick={() => onChange(shiftPeriod(value, 1))}>
          <ChevronRight className="h-4 w-4" />
        </IconButton>
      </div>
      {!isCurrent ? (
        <button
          type="button"
          onClick={() => onChange(value.kind === "month" ? monthOf(today) : taxYearOf(today))}
          className="text-sm text-blue hover:underline"
        >
          Back to current
        </button>
      ) : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: ReactNode | undefined;
  tone?: "default" | "positive" | "negative" | "warning" | undefined;
}) {
  return (
    <div className="border border-hairline bg-white px-5 py-4">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-grey">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-display text-2xl tabular-nums",
          tone === "positive" && "text-emerald-700",
          tone === "negative" && "text-red-700",
          tone === "warning" && "text-amber-700",
          tone === "default" && "text-ink",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-grey">{hint}</p> : null}
    </div>
  );
}

const BADGE_TONES = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-red-700",
  blue: "border-blue/25 bg-blue/[0.07] text-blue",
  grey: "border-hairline bg-canvas text-grey",
} as const;

export function Badge({
  tone,
  children,
  strike,
}: {
  tone: keyof typeof BADGE_TONES;
  children: ReactNode;
  strike?: boolean | undefined;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center whitespace-nowrap border px-2 text-xs font-semibold",
        BADGE_TONES[tone],
        strike && "line-through",
      )}
    >
      {children}
    </span>
  );
}

export function ExportButton({
  onExport,
  disabled,
}: {
  onExport: () => Promise<void>;
  disabled?: boolean | undefined;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={disabled || busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onExport();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Could not create the Excel file.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
      Export to Excel
    </Button>
  );
}

export function ReceiptButton({ path }: { path: string | null }) {
  if (!path) return null;
  return (
    <IconButton
      label="Open receipt"
      onClick={() => {
        openReceipt(path).catch((error: Error) => toast.error(error.message));
      }}
    >
      <Paperclip className="h-4 w-4" />
    </IconButton>
  );
}

/** Horizontal bar used for "spending by category" style breakdowns. */
export function BreakdownRow({
  label,
  value,
  share,
  amount,
}: {
  label: string;
  value: number;
  share: number;
  amount: string;
}) {
  return (
    <li className="py-2.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate text-ink">{label}</span>
        <span className="shrink-0 tabular-nums text-ink">{amount}</span>
      </div>
      <div className="mt-1.5 h-1.5 bg-canvas" aria-hidden="true">
        <div
          className="h-full bg-blue"
          style={{ width: `${Math.max(2, Math.round(share * 100))}%` }}
        />
      </div>
      <span className="sr-only">{`${label}: ${amount}, ${Math.round(share * 100)}% (${value})`}</span>
    </li>
  );
}
