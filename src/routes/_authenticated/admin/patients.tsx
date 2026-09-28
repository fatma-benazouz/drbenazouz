import { createFileRoute } from "@tanstack/react-router";

import { PatientRecords } from "@/components/admin/PatientRecords";

export const Route = createFileRoute("/_authenticated/admin/patients")({
  head: () => ({ meta: [{ title: "Patients | Practice Dashboard" }] }),
  component: PatientRecords,
});
