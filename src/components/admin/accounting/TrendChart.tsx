import { useState } from "react";

import { money } from "@/lib/invoices";
import { cn } from "@/lib/utils";

/*
 * Income vs expenses per month as grouped bars. Colours validated for
 * colour-blind separation and contrast (dataviz palette check): brand blue for
 * income, teal for expenses. Identity is never colour-alone: legend + tooltip
 * + a table view.
 */

export type TrendPoint = { key: string; label: string; income: number; expenses: number };

const SERIES = [
  { id: "income", label: "Income", color: "#335caa" },
  { id: "expenses", label: "Expenses", color: "#2a9fb0" },
] as const;

/** Round a raw axis step up to 1, 2, 2.5 or 5 × 10^n so labels read cleanly. */
function niceStep(raw: number): number {
  if (raw <= 0) return 250;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const factor = [1, 2, 2.5, 5, 10].find((f) => f * magnitude >= raw) ?? 10;
  return factor * magnitude;
}

/** 3-5 evenly spaced gridlines with the tightest round top above the data. */
function axisScale(max: number): { step: number; count: number } {
  return [3, 4, 5]
    .map((count) => ({ count, step: niceStep(max / count) }))
    .reduce((best, c) => (c.step * c.count < best.step * best.count ? c : best));
}

/** R 0, R 500, R 7.5k, R 15k — short enough for an axis. */
function compactRand(value: number): string {
  if (value >= 1000) return `R ${Number((value / 1000).toFixed(1))}k`;
  return `R ${value}`;
}

export function TrendChart({ data, title }: { data: TrendPoint[]; title: string }) {
  const [asTable, setAsTable] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(0, ...data.flatMap((d) => [d.income, d.expenses]));
  const { step, count } = axisScale(max);
  const axisMax = step * count;
  const ticks = Array.from({ length: count + 1 }, (_, i) => i * step);

  return (
    <figure className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <figcaption className="text-sm font-semibold text-ink">{title}</figcaption>
        <div className="flex items-center gap-4">
          <ul className="flex items-center gap-4" aria-label="Legend">
            {SERIES.map((s) => (
              <li key={s.id} className="flex items-center gap-1.5 text-xs text-grey">
                <span
                  className="h-2.5 w-2.5 rounded-[2px]"
                  style={{ background: s.color }}
                  aria-hidden="true"
                />
                {s.label}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setAsTable((v) => !v)}
            className="text-xs text-blue hover:underline"
          >
            {asTable ? "View chart" : "View as table"}
          </button>
        </div>
      </div>

      {asTable ? (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs text-grey">
              <th className="py-2 font-semibold">Month</th>
              <th className="py-2 text-right font-semibold">Income</th>
              <th className="py-2 text-right font-semibold">Expenses</th>
              <th className="py-2 text-right font-semibold">Difference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {data.map((d) => (
              <tr key={d.key}>
                <td className="py-2 text-ink">{d.label}</td>
                <td className="py-2 text-right tabular-nums">{money(d.income)}</td>
                <td className="py-2 text-right tabular-nums">{money(d.expenses)}</td>
                <td className="py-2 text-right tabular-nums text-ink">
                  {money(d.income - d.expenses)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="mt-5 flex min-h-56 flex-1 flex-col">
          <div className="flex flex-1">
            {/* Y axis: labels sit in their own gutter so they never cover bars */}
            <div className="relative w-12 shrink-0" aria-hidden="true">
              {ticks.map((t) => (
                <span
                  key={t}
                  className="absolute right-2 translate-y-1/2 text-[0.625rem] tabular-nums text-grey"
                  style={{ bottom: `${(t / axisMax) * 100}%` }}
                >
                  {compactRand(t)}
                </span>
              ))}
            </div>
            <div className="relative flex flex-1 items-end gap-2 border-b border-hairline sm:gap-4">
              {ticks
                .filter((t) => t > 0)
                .map((t) => (
                  <div
                    key={t}
                    className="pointer-events-none absolute inset-x-0 border-t border-dashed border-hairline"
                    style={{ bottom: `${(t / axisMax) * 100}%` }}
                  />
                ))}
              {data.map((d) => (
                <div
                  key={d.key}
                  className="group relative flex h-full flex-1 items-end justify-center gap-[2px]"
                  onMouseEnter={() => setActive(d.key)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(d.key)}
                  onBlur={() => setActive(null)}
                  tabIndex={0}
                  aria-label={`${d.label}: income ${money(d.income)}, expenses ${money(d.expenses)}`}
                >
                  {SERIES.map((s) => {
                    const value = d[s.id];
                    return (
                      <div
                        key={s.id}
                        className={cn(
                          "relative w-full max-w-7 rounded-t-[4px] transition-opacity",
                          active && active !== d.key && "opacity-40",
                        )}
                        style={{
                          height: value > 0 ? `${Math.max(1, (value / axisMax) * 100)}%` : 0,
                          background: s.color,
                        }}
                      />
                    );
                  })}
                  {active === d.key ? (
                    <div className="absolute bottom-full left-1/2 z-10 mb-2 w-44 -translate-x-1/2 border border-hairline bg-white px-3 py-2 text-xs shadow-lg">
                      <p className="font-semibold text-ink">{d.label}</p>
                      {SERIES.map((s) => (
                        <p
                          key={s.id}
                          className="mt-1 flex items-center justify-between gap-2 text-grey"
                        >
                          <span className="flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 rounded-[2px]"
                              style={{ background: s.color }}
                              aria-hidden="true"
                            />
                            {s.label}
                          </span>
                          <span className="tabular-nums text-ink">{money(d[s.id])}</span>
                        </p>
                      ))}
                      <p className="mt-1 flex justify-between border-t border-hairline pt-1 text-grey">
                        Difference{" "}
                        <span className="tabular-nums text-ink">
                          {money(d.income - d.expenses)}
                        </span>
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex gap-2 pl-12 sm:gap-4">
            {data.map((d) => (
              <span key={d.key} className="flex-1 truncate text-center text-[0.6875rem] text-grey">
                {d.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </figure>
  );
}
