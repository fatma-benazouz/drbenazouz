import { Search, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/*
 * Small building blocks shared by the admin pages so every section has the
 * same page header, surfaces, search field and states.
 */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode | undefined;
  actions?: ReactNode | undefined;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-2xl leading-tight text-ink sm:text-[1.75rem]">{title}</h1>
        {description ? <p className="mt-1 text-sm text-grey">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** White surface with a hairline border, used for tables, lists and forms. */
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("border border-hairline bg-white", className)}>{children}</div>;
}

export function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string | undefined;
}) {
  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">{placeholder}</span>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full border border-hairline bg-white pl-9 pr-3 text-sm text-ink placeholder:text-grey/80 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/15"
      />
    </label>
  );
}

export function IconButton({
  label,
  onClick,
  disabled,
  tone = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean | undefined;
  tone?: "default" | "danger" | undefined;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid h-8 w-8 place-items-center text-grey transition-colors hover:bg-canvas disabled:pointer-events-none disabled:opacity-40",
        tone === "danger" ? "hover:text-red-700" : "hover:text-blue",
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string | undefined;
  action?: ReactNode | undefined;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-11 w-11 place-items-center bg-canvas text-grey">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-4 text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-grey">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Placeholder rows while a list loads. */
export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-hairline" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="h-4 w-40 rounded-none bg-canvas" />
          <Skeleton className="hidden h-4 w-48 rounded-none bg-canvas sm:block" />
          <Skeleton className="ml-auto h-4 w-16 rounded-none bg-canvas" />
        </div>
      ))}
    </div>
  );
}

export const tableHeadClass =
  "border-b border-hairline bg-canvas text-left text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-grey";
