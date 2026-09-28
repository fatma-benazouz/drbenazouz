import { createFileRoute } from "@tanstack/react-router";

import { RecurringPage } from "@/components/admin/accounting/RecurringPage";

export const Route = createFileRoute("/_authenticated/admin/accounting/recurring")({
  head: () => ({ meta: [{ title: "Recurring costs | Practice Dashboard" }] }),
  component: RecurringPage,
});
