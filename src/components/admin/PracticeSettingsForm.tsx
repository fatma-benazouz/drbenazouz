import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";

import { EmptyState, LoadingRows, PageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { PracticeSettings } from "@/lib/invoices";

type Field = [keyof PracticeSettings, string, string?];

const SECTIONS: Array<{ title: string; description: string; fields: Field[] }> = [
  {
    title: "Practice",
    description: "How the practice and doctor are named on invoices and receipts.",
    fields: [
      ["practice_name", "Practice name"],
      ["provider_name", "Provider name"],
      ["role_line", "Role line"],
      ["practice_number", "Practice number"],
      ["mp_number", "MP number"],
    ],
  },
  {
    title: "Address",
    description: "Printed in the header of every document.",
    fields: [
      ["address_line1", "Address line 1"],
      ["address_line2", "Address line 2"],
      ["city", "City"],
      ["postal_code", "Postal code"],
      ["country", "Country"],
    ],
  },
  {
    title: "Contact",
    description: "Where patients can reach the practice about billing.",
    fields: [
      ["contact_email", "Contact email", "email"],
      ["contact_phone", "Contact phone", "tel"],
      ["proof_of_payment_email", "Proof of payment email", "email"],
    ],
  },
  {
    title: "Banking",
    description: "Shown on payment requests so patients can pay by EFT.",
    fields: [
      ["bank_account_holder", "Account holder"],
      ["bank_name", "Bank"],
      ["bank_account_number", "Account number"],
      ["bank_branch_code", "Branch code"],
    ],
  },
  {
    title: "Documents",
    description: "Small print at the bottom of each document.",
    fields: [["vat_exempt_note", "Footer note"]],
  },
];

export function PracticeSettingsForm() {
  const qc = useQueryClient();
  const uid = useId();

  const settings = useQuery({
    queryKey: ["practice-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("practice_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PracticeSettings | null;
    },
  });

  const [form, setForm] = useState<PracticeSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);

  const dirty =
    !!form &&
    !!settings.data &&
    SECTIONS.some((section) =>
      section.fields.some(([key]) => (form[key] ?? "") !== (settings.data?.[key] ?? "")),
    );

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const { id, ...patch } = form;
    const { error } = await supabase.from("practice_settings").update(patch).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Practice details updated. New documents will use them.");
    qc.invalidateQueries({ queryKey: ["practice-settings"] });
  };

  const header = (
    <PageHeader
      title="Settings"
      description="Practice details used on invoices and receipts. Changes apply to new documents."
    />
  );

  if (settings.isLoading || (settings.data && !form)) {
    return (
      <section>
        {header}
        <Panel className="mt-6">
          <LoadingRows rows={6} />
        </Panel>
      </section>
    );
  }

  if (!form) {
    return (
      <section>
        {header}
        <Panel className="mt-6">
          <EmptyState
            icon={Settings}
            title="Practice details are not set up yet"
            description="The practice settings record hasn't been created in the database."
          />
        </Panel>
      </section>
    );
  }

  return (
    <section>
      {header}

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Panel className="divide-y divide-hairline">
          {SECTIONS.map((section) => (
            <fieldset
              key={section.title}
              className="grid gap-5 px-5 py-6 sm:px-6 lg:grid-cols-[14rem_1fr] lg:gap-10"
            >
              <div>
                <legend className="font-display text-base text-ink">{section.title}</legend>
                <p className="mt-1 text-sm text-grey">{section.description}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {section.fields.map(([key, label, type]) => (
                  <div
                    key={key}
                    className={section.fields.length === 1 ? "sm:col-span-2" : undefined}
                  >
                    <Label htmlFor={`${uid}-${key}`} className="text-xs font-semibold text-ink">
                      {label}
                    </Label>
                    <Input
                      id={`${uid}-${key}`}
                      type={type ?? "text"}
                      className="mt-2 h-10"
                      value={(form[key] as string | null) ?? ""}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </fieldset>
          ))}
        </Panel>

        <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center justify-end gap-3 border-t border-hairline bg-canvas/95 px-4 py-4 backdrop-blur sm:mx-0 sm:border sm:bg-white sm:px-5">
          <p className="mr-auto text-sm text-grey">
            {dirty ? "You have unsaved changes." : "All changes saved."}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={!dirty || saving}
            onClick={() => settings.data && setForm(settings.data)}
          >
            Discard
          </Button>
          <Button type="submit" disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </section>
  );
}
