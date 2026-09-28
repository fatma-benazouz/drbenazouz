import { X } from "lucide-react";
import { useEffect, useId, type ReactNode } from "react";

import { IconButton } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/*
 * Form primitives for admin dialogs: a modal shell, labelled fields and inputs
 * styled to match the rest of the dashboard.
 */

export const inputClass =
  "h-10 w-full border border-hairline bg-white px-3 text-sm text-ink placeholder:text-grey/70 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/15 disabled:bg-canvas disabled:text-grey";

export function Modal({
  title,
  description,
  onClose,
  footer,
  size = "md",
  children,
}: {
  title: string;
  description?: string | undefined;
  onClose: () => void;
  footer: ReactNode;
  size?: "md" | "lg" | undefined;
  children: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex bg-ink/40 p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={cn(
          "m-auto flex h-full max-h-full w-full flex-col bg-white shadow-2xl sm:h-auto",
          size === "lg" ? "max-w-3xl" : "max-w-xl",
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-hairline px-6 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-xl text-ink">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-sm text-grey">{description}</p> : null}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
        <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-hairline bg-canvas px-6 py-4">
          {footer}
        </footer>
      </div>
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string | undefined;
  hint?: ReactNode | undefined;
  error?: string | null | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-ink">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p className="mt-1.5 text-xs text-red-700">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-grey">{hint}</p>
      ) : null}
    </div>
  );
}

export function SelectInput<T extends string>({
  id,
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  id?: string | undefined;
  value: T | "";
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  placeholder?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(inputClass, "cursor-pointer pr-8", !value && "text-grey/70", className)}
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** Rand amount input: free text so "620,30" and "1 240.30" both work. */
export function MoneyInput({
  id,
  value,
  onChange,
  placeholder = "0.00",
}: {
  id?: string | undefined;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-grey">
        R
      </span>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, "pl-7 tabular-nums")}
      />
    </div>
  );
}

/** Segmented choice for 2-4 short options (e.g. Received / Pending). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  label: string;
}) {
  return (
    <div className="flex border border-hairline bg-white" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-10 flex-1 whitespace-nowrap border-r border-hairline px-3 text-sm transition-colors last:border-r-0",
            value === option.value
              ? "bg-ink text-white"
              : "text-grey hover:bg-canvas hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
