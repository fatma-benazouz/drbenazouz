import { createFileRoute, redirect } from "@tanstack/react-router";

// /admin has no page of its own yet; send people to Patients.
export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/patients", replace: true });
  },
});
