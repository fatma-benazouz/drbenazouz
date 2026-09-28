import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Pencil, Phone, Plus, Trash2, UserRound, X } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EmptyState,
  IconButton,
  LoadingRows,
  PageHeader,
  Panel,
  SearchField,
  tableHeadClass,
} from "@/components/admin/ui";
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

export function PatientRecords() {
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

  const total = patients.data?.length ?? 0;
  const newPatient = () => setDraft(blankPatient());
  const confirmRemove = (patient: Patient) => {
    if (window.confirm(`Delete ${patient.full_name} from your patient list?`))
      remove.mutate(patient);
  };

  return (
    <section>
      <PageHeader
        title="Patients"
        description={
          patients.isLoading
            ? "Loading records…"
            : term
              ? `${rows.length} of ${total} patients match your search`
              : `${total} patient${total === 1 ? "" : "s"} on record`
        }
        actions={
          <Button onClick={newPatient}>
            <Plus /> New patient
          </Button>
        }
      />

      <SearchField
        className="mt-6 sm:max-w-sm"
        value={search}
        onChange={setSearch}
        placeholder="Search name, email or phone"
      />

      <Panel className="mt-4">
        {patients.isLoading ? (
          <LoadingRows />
        ) : rows.length === 0 ? (
          term ? (
            <EmptyState
              icon={UserRound}
              title="No matching patients"
              description="Try a different name, email address or phone number."
            />
          ) : (
            <EmptyState
              icon={UserRound}
              title="No patient records yet"
              description="Patients you add here can be selected when you create an invoice."
              action={
                <Button onClick={newPatient}>
                  <Plus /> New patient
                </Button>
              }
            />
          )
        ) : (
          <>
            {/* Table on tablet and up */}
            <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className={tableHeadClass}>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Medical aid</th>
                  <th className="w-24 px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {rows.map((patient) => (
                  <tr key={patient.id} className="transition-colors hover:bg-canvas/60">
                    <td className="px-4 py-3.5 font-medium text-ink">{patient.full_name}</td>
                    <td className="px-4 py-3.5">
                      <p className="text-ink">
                        {patient.email ?? <span className="text-grey">No email</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-grey">{patient.phone ?? "No phone"}</p>
                    </td>
                    <td className="px-4 py-3.5 text-grey">
                      {patient.medical_aid_name ? (
                        <>
                          <p className="text-ink">{patient.medical_aid_name}</p>
                          {patient.medical_aid_plan ? (
                            <p className="mt-0.5 text-xs">{patient.medical_aid_plan}</p>
                          ) : null}
                        </>
                      ) : (
                        "Private"
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-1">
                        <IconButton
                          label={`Edit ${patient.full_name}`}
                          onClick={() => setDraft({ ...patient })}
                        >
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          label={`Delete ${patient.full_name}`}
                          tone="danger"
                          onClick={() => confirmRemove(patient)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Cards on phones */}
            <ul className="divide-y divide-hairline md:hidden">
              {rows.map((patient) => (
                <li key={patient.id} className="flex items-start gap-3 px-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{patient.full_name}</p>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-grey">
                      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{patient.email ?? "No email"}</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-grey">
                      <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {patient.phone ?? "No phone"}
                    </p>
                    <p className="mt-2 text-xs text-grey">
                      {patient.medical_aid_name ?? "Private"}
                      {patient.medical_aid_plan ? ` · ${patient.medical_aid_plan}` : ""}
                    </p>
                  </div>
                  <div className="-mr-2 flex shrink-0 gap-0.5">
                    <IconButton
                      label={`Edit ${patient.full_name}`}
                      onClick={() => setDraft({ ...patient })}
                    >
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label={`Delete ${patient.full_name}`}
                      tone="danger"
                      onClick={() => confirmRemove(patient)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

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
        error.code === "23505"
          ? "A patient with this email address already exists."
          : error.message,
      );
      return;
    }
    toast.success(form.id ? "Patient updated." : "Patient added.");
    onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex bg-ink/40 p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${uid}-title`}
    >
      <div className="m-auto flex max-h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2 id={`${uid}-title`} className="font-display text-xl text-ink">
            {form.id ? "Edit patient" : "New patient"}
          </h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map(([key, label, type]) => (
              <div key={key}>
                <Label htmlFor={`${uid}-${key}`} className="text-xs font-semibold text-ink">
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
        <footer className="flex justify-end gap-3 border-t border-hairline bg-canvas px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save patient"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
