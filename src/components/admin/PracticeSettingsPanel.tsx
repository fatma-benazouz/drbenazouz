import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { PracticeSettings } from "@/lib/invoices";

const FIELDS: Array<[keyof PracticeSettings, string]> = [
  ["practice_name", "Practice name"],
  ["provider_name", "Provider name"],
  ["role_line", "Role line"],
  ["address_line1", "Address line 1"],
  ["address_line2", "Address line 2"],
  ["city", "City"],
  ["postal_code", "Postal code"],
  ["country", "Country"],
  ["contact_email", "Contact email"],
  ["contact_phone", "Contact phone"],
  ["practice_number", "Practice number"],
  ["mp_number", "MP number"],
  ["bank_account_holder", "Bank account holder"],
  ["bank_name", "Bank"],
  ["bank_account_number", "Bank account number"],
  ["bank_branch_code", "Branch code"],
  ["proof_of_payment_email", "Proof of payment email"],
  ["vat_exempt_note", "Footer note"],
];

export function PracticeSettingsPanel({
  settings,
  onClose,
  onSaved,
}: {
  settings: PracticeSettings;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<PracticeSettings>(settings);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { id, ...patch } = form;
    const { error } = await supabase.from("practice_settings").update(patch).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Practice details updated. New documents will use them.");
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full w-full max-w-xl flex-col bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-navy-deep">Practice details</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map(([key, label]) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <Input
                  className="mt-2 h-9"
                  value={(form[key] as string | null) ?? ""}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
        <footer className="flex justify-end gap-3 border-t border-border px-5 py-4">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="navy" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save details"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
