import { createFileRoute } from "@tanstack/react-router";

import { AccountingOverview } from "@/components/admin/accounting/AccountingOverview";

export const Route = createFileRoute("/_authenticated/admin/accounting/")({
  head: () => ({ meta: [{ title: "Accounting | Practice Dashboard" }] }),
  component: AccountingOverview,
});
