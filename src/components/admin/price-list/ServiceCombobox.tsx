import { useId, useMemo, useState } from "react";

import { inputClass } from "@/components/admin/form";
import { money } from "@/lib/invoices";
import { RATE_LABELS, searchPriceList, type PriceItem, type Rate } from "@/lib/priceList";
import { cn } from "@/lib/utils";

/**
 * Description input with price-list suggestions. Typing filters services by
 * name or tariff code; arrow keys + Enter (or a click) pick one. Anything not
 * on the list can still be typed freely.
 */
export function ServiceCombobox({
  id,
  value,
  onChange,
  onPick,
  items,
  preferredRate,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (text: string) => void;
  onPick: (item: PriceItem) => void;
  items: PriceItem[];
  preferredRate: Rate;
  placeholder?: string | undefined;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const suggestions = useMemo(() => searchPriceList(items, value), [items, value]);
  const showList = open && suggestions.length > 0;

  const pick = (item: PriceItem) => {
    onPick(item);
    setOpen(false);
  };

  const rateLine = (item: PriceItem, rate: Rate) => {
    const price = rate === "private" ? item.private_price : item.medical_aid_price;
    const code = rate === "private" ? item.private_tariff_code : item.medical_aid_tariff_code;
    if (price == null) return null;
    return (
      <span className={cn(rate === preferredRate ? "font-semibold text-ink" : "text-grey")}>
        {RATE_LABELS[rate]}: {code ? `${code} · ` : ""}
        {money(price)}
      </span>
    );
  };

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList ? `${listId}-${highlight}` : undefined}
        autoComplete="off"
        className={inputClass}
        placeholder={placeholder}
        value={value}
        onFocus={() => {
          setOpen(true);
          setHighlight(0);
        }}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={(e) => {
          if (!showList) {
            if (e.key === "ArrowDown") setOpen(true);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => (h + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            const item = suggestions[highlight];
            if (item) pick(item);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto border border-hairline bg-white py-1 shadow-lg"
        >
          <li className="px-4 pb-1 pt-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-grey">
            From your price list
          </li>
          {suggestions.map((item, index) => (
            <li
              key={item.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === highlight}
              // mousedown (not click) so the pick happens before the input blurs
              onMouseDown={(e) => {
                e.preventDefault();
                pick(item);
              }}
              onMouseEnter={() => setHighlight(index)}
              className={cn("cursor-pointer px-4 py-2.5", index === highlight && "bg-canvas")}
            >
              <p className="text-sm font-medium text-ink">{item.name}</p>
              <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs">
                {rateLine(item, "private")}
                {rateLine(item, "medical_aid")}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
