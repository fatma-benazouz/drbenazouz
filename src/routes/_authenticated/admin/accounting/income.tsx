import { createFileRoute } from "@tanstack/react-router";

import { IncomePage } from "@/components/admin/accounting/IncomePage";

export const Route = createFileRoute("/_authenticated/admin/accounting/income")({
  head: () => ({ meta: [{ title: "Income | Practice Dashboard" }] }),
  component: IncomePage,
});
