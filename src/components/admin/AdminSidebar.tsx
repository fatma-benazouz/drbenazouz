import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarClock,
  FileBarChart,
  FileText,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Monitor,
  Receipt,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

import practiceLogo from "@/assets/practice-logo.png";

type NavItem = {
  to:
    | "/admin/patients"
    | "/admin/invoices"
    | "/admin/accounting"
    | "/admin/accounting/income"
    | "/admin/accounting/expenses"
    | "/admin/accounting/recurring"
    | "/admin/accounting/equipment"
    | "/admin/accounting/reports"
    | "/admin/settings";
  label: string;
  icon: LucideIcon;
  /** Only highlight on this exact page (not its sub-pages). */
  exact?: boolean;
};

// Add new admin pages here (and as a file in src/routes/_authenticated/admin/).
const NAV: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Records",
    items: [
      { to: "/admin/patients", label: "Patients", icon: Users },
      { to: "/admin/invoices", label: "Invoices", icon: FileText },
    ],
  },
  {
    label: "Accounting",
    items: [
      { to: "/admin/accounting", label: "Overview", icon: LayoutDashboard, exact: true },
      { to: "/admin/accounting/income", label: "Income", icon: HandCoins },
      { to: "/admin/accounting/expenses", label: "Expenses", icon: Receipt },
      { to: "/admin/accounting/recurring", label: "Recurring costs", icon: CalendarClock },
      { to: "/admin/accounting/equipment", label: "Equipment", icon: Monitor },
      { to: "/admin/accounting/reports", label: "Reports", icon: FileBarChart },
    ],
  },
  {
    label: "Practice",
    items: [{ to: "/admin/settings", label: "Settings", icon: Settings }],
  },
];

const itemClass =
  "group flex h-10 items-center gap-3 border-l-2 px-3 text-sm transition-colors [&_svg]:h-[1.125rem] [&_svg]:w-[1.125rem] [&_svg]:shrink-0";

export function AdminBrand() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img
        src={practiceLogo}
        alt=""
        aria-hidden="true"
        className="h-8 w-8 shrink-0 object-contain"
      />
      <div className="min-w-0">
        <p className="truncate font-display text-[0.9375rem] leading-tight text-ink">
          Dr Ben Azouz MH
        </p>
        <p className="truncate text-xs text-grey">Practice Dashboard</p>
      </div>
    </div>
  );
}

export function AdminSidebar({
  email,
  onNavigate,
  onSignOut,
}: {
  email: string | undefined;
  onNavigate?: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-hairline px-5 py-5">
        <AdminBrand />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Admin sections">
        {NAV.map((group) => (
          <div key={group.label} className="mb-6 last:mb-0">
            <p className="px-3 pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-grey/80">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, exact }) => (
                <li key={to}>
                  <Link
                    to={to}
                    onClick={onNavigate}
                    activeOptions={{ exact: exact ?? false }}
                    className={itemClass}
                    activeProps={{
                      className: "border-blue bg-blue/[0.06] font-semibold text-blue",
                    }}
                    inactiveProps={{
                      className: "border-transparent text-grey hover:bg-canvas hover:text-ink",
                    }}
                  >
                    <Icon aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-hairline px-3 py-4">
        {email ? (
          <p className="truncate px-3 pb-3 text-xs text-grey" title={email}>
            Signed in as <span className="text-ink">{email}</span>
          </p>
        ) : null}
        <Link
          to="/"
          onClick={onNavigate}
          className={`${itemClass} border-transparent text-grey hover:bg-canvas hover:text-ink`}
        >
          <ArrowLeft aria-hidden="true" />
          Return to site
        </Link>
        <button
          type="button"
          onClick={onSignOut}
          className={`${itemClass} w-full border-transparent text-grey hover:bg-canvas hover:text-ink`}
        >
          <LogOut aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  );
}
