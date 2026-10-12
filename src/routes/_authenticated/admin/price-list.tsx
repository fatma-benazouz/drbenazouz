import { createFileRoute } from "@tanstack/react-router";

import { PriceListPage } from "@/components/admin/price-list/PriceListPage";

export const Route = createFileRoute("/_authenticated/admin/price-list")({
  head: () => ({ meta: [{ title: "Price list | Practice Dashboard" }] }),
  component: PriceListPage,
});
