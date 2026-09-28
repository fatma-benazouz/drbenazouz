import { createFileRoute } from "@tanstack/react-router";

import { InvoiceList } from "@/components/admin/InvoiceList";

export const Route = createFileRoute("/_authenticated/admin/invoices")({
  head: () => ({ meta: [{ title: "Invoices | Practice Dashboard" }] }),
  component: InvoiceList,
});
