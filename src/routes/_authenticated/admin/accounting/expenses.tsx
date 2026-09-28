import { createFileRoute } from "@tanstack/react-router";

import { ExpensesPage } from "@/components/admin/accounting/ExpensesPage";

export const Route = createFileRoute("/_authenticated/admin/accounting/expenses")({
  head: () => ({ meta: [{ title: "Expenses | Practice Dashboard" }] }),
  component: ExpensesPage,
});
