import { createFileRoute } from "@tanstack/react-router";

import { PracticeSettingsForm } from "@/components/admin/PracticeSettingsForm";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Settings | Practice Dashboard" }] }),
  component: PracticeSettingsForm,
});
