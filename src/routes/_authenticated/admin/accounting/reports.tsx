import { createFileRoute } from "@tanstack/react-router";

import { ReportsPage } from "@/components/admin/accounting/ReportsPage";

export const Route = createFileRoute("/_authenticated/admin/accounting/reports")({
  head: () => ({ meta: [{ title: "Reports | Practice Dashboard" }] }),
  component: ReportsPage,
});
