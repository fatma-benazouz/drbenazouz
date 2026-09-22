import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Patient } from "@/lib/invoices";

type PatientDraft = Omit<Patient, "id"> & { id?: string };

const FIELDS: Array<[keyof PatientDraft, string, string?]> = [
  ["full_name", "Full name"],
  ["email", "Email", "email"],
  ["phone", "Phone"],
  ["address", "Address"],
  ["date_of_birth", "Date of birth", "date"],
  ["medical_aid_name", "Medical aid"],
  ["medical_aid_plan", "Plan"],
  ["medical_aid_member_number", "Member number"],
  ["dependant_code", "Dependant code"],
];

function blankPatient(): PatientDraft {
  return {
    full_name: "",
    email: "",
    phone: "",
    address: "",
    date_of_birth: null,
    medical_aid_name: "",
    medical_aid_plan: "",
    medical_aid_member_number: "",
    dependant_code: "",
  };
}

function nullable(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function PatientsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<PatientDraft | null>(null);

  const patients = useQuery({
    queryKey: ["admin-patients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*").order("full_name");
      if (error) throw error;
      return (data ?? []) as Patient[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-patients"] });

  const remove = useMutation({
    mutationFn: async (patient: Patient) => {
      const { count } = await supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("patient_id", patient.id);
      if ((count ?? 0) > 0) {
        throw new Error(
          `${patient.full_name} has ${count} billing document(s). Those documents keep their own copy of the details, so removing the patient record is still safe - confirm again to proceed.`,
        );
      }
      const { error } = await supabase.from("patients").delete().eq("id", patient.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Patient removed.");
      refresh();
    },
    onError: async (error: Error, patient) => {
      if (!error.message.includes("billing document")) {
        toast.error(error.message);
        return;
      }
      if (!window.confirm(error.message)) return;
      const { error: delError } = await supabase.from("patients").delete().eq("id", patient.id);
      if (delError) {
        toast.error(delError.message);
        return;
      }
      toast.success("Patient removed.");
      refresh();
    },
  });

  const term = search.trim().toLowerCase();
  const rows = (patients.data ?? []).filter(
    (p) =>
      !term ||
      p.full_name.toLowerCase().includes(term) ||
      (p.email ?? "").toLowerCase().includes(term) ||
      (p.phone ?? "").toLowerCase().includes(term),
  );

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-navy-deep">Patient records</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} of {patients.data?.length ?? 0} shown
          </p>
        </div>
        <Button variant="navy" size="sm" onClick={() => setDraft(blankPatient())}>
          <Plus className="h-4 w-4" /> New patient
        </Button>
      </div>

      <Input
        className="mt-5 h-9 w-full sm:max-w-sm"
        placeholder="Search name, email or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="mt-5 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Medical aid</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {patients.isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Loading patients…
                </td>
              </tr>
            ) : null}
            {!patients.isLoading && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No patient records yet.
                </td>
              </tr>
            ) : null}
            {rows.map((patient) => (
              <tr key={patient.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-navy-deep">{patient.full_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{patient.email ?? "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{patient.phone ?? "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{patient.medical_aid_name ?? "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      title="Edit"
                      aria-label={`Edit ${patient.full_name}`}
                      onClick={() => setDraft({ ...patient })}
                      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-navy-deep"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      aria-label={`Delete ${patient.full_name}`}
                      onClick={() => {
                        if (window.confirm(`Delete ${patient.full_name} from your patient list?`))
                          remove.mutate(patient);
                      }}
                      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {draft ? (
        <PatientDialog
          draft={draft}
          onClose={() => setDraft(null)}
          onSaved={() => {
            refresh();
            setDraft(null);
          }}
        />
      ) : null}
    </section>
  );
}

function PatientDialog({
  draft,
  onClose,
  onSaved,
}: {
  draft: PatientDraft;
  onClose: () => void;
  onSaved: () => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<PatientDraft>(draft);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.full_name.trim()) {
      toast.error("A full name is required.");
      return;
    }
    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(),
      email: nullable(form.email),
      phone: nullable(form.phone),
      address: nullable(form.address),
      date_of_birth: nullable(form.date_of_birth),
      medical_aid_name: nullable(form.medical_aid_name),
      medical_aid_plan: nullable(form.medical_aid_plan),
      medical_aid_member_number: nullable(form.medical_aid_member_number),
      dependant_code: nullable(form.dependant_code),
    };

    if (payload.email) {
      let query = supabase.from("patients").select("id, full_name").ilike("email", payload.email);
      if (form.id) query = query.neq("id", form.id);
      const { data: existing } = await query.maybeSingle();
      if (existing) {
        setSaving(false);
        toast.error(`${existing.full_name} already uses this email address.`);
        return;
      }
    }

    const { error } = form.id
      ? await supabase.from("patients").update(payload).eq("id", form.id)
      : await supabase.from("patients").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(
        error.code === "23505" ? "A patient with this email address already exists." : error.message,
      );
      return;
    }
    toast.success(form.id ? "Patient updated." : "Patient added.");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40 p-0 sm:p-6" role="dialog" aria-modal="true">
      <div className="m-auto flex max-h-full w-full max-w-2xl flex-col rounded-none bg-background shadow-2xl sm:rounded-lg">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-navy-deep">
            {form.id ? "Edit patient" : "New patient"}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map(([key, label, type]) => (
              <div key={key}>
                <Label htmlFor={`${uid}-${key}`} className="text-xs">
                  {label}
                </Label>
                <Input
                  id={`${uid}-${key}`}
                  className="mt-2 h-9"
                  type={type ?? "text"}
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
            {saving ? "Saving…" : "Save patient"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
