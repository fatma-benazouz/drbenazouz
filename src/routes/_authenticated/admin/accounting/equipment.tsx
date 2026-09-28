import { createFileRoute } from "@tanstack/react-router";

import { EquipmentPage } from "@/components/admin/accounting/EquipmentPage";

export const Route = createFileRoute("/_authenticated/admin/accounting/equipment")({
  head: () => ({ meta: [{ title: "Equipment | Practice Dashboard" }] }),
  component: EquipmentPage,
});
