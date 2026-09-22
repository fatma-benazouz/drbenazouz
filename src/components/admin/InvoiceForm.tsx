import { usePDF } from "@react-pdf/renderer";
import { useEffect, useId, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import brandLogo from "@/assets/dr-ben-azouz-dark-brand.png.asset.json";
import { InvoiceDocument, type InvoiceDocData } from "@/components/admin/InvoiceDocument";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  addDaysIso,
  money,
  todayIso,
  toNumber,
  type Invoice,
  type InvoiceItem,
  type InvoiceStatus,
  type InvoiceType,
  type Patient,
  type PracticeSettings,
} from "@/lib/invoices";
import { cn } from "@/lib/utils";

export type InvoiceDraft = {
  id?: string;
  invoice_number?: string;
  invoice_type: InvoiceType;
  status: InvoiceStatus;
  patient_id: string | null;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  patient_address: string;
  medical_aid_name: string;
  medical_aid_plan: string;
  medical_aid_member_number: string;
  dependant_code: string;
  date_issued: string;
  due_date: string;
  date_paid: string;
  admin_note: string;
  items: InvoiceItem[];
};

export function emptyItem(sort: number): InvoiceItem {
  return {
    item_date: todayIso(),
    description: "",
    icd10_code: "",
    quantity: 1,
    unit_price: 0,
    amount: 0,
    sort_order: sort,
  };
}

export function blankDraft(): InvoiceDraft {
  const today = todayIso();
  return {
    invoice_type: "payment_due",
    status: "draft",
    patient_id: null,
    patient_name: "",
    patient_email: "",
    patient_phone: "",
    patient_address: "",
    medical_aid_name: "",
    medical_aid_plan: "",
    medical_aid_member_number: "",
    dependant_code: "",
    date_issued: today,
    due_date: addDaysIso(today, 14),
    date_paid: today,
    admin_note: "",
    items: [emptyItem(0)],
  };
}

export function draftFromInvoice(invoice: Invoice, items: InvoiceItem[]): InvoiceDraft {
  return {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    invoice_type: invoice.invoice_type,
    status: invoice.status,
    patient_id: invoice.patient_id,
    patient_name: invoice.patient_name,
    patient_email: invoice.patient_email ?? "",
    patient_phone: invoice.patient_phone ?? "",
    patient_address: invoice.patient_address ?? "",
    medical_aid_name: invoice.medical_aid_name ?? "",
    medical_aid_plan: invoice.medical_aid_plan ?? "",
    medical_aid_member_number: invoice.medical_aid_member_number ?? "",
    dependant_code: invoice.dependant_code ?? "",
    date_issued: invoice.date_issued,
    due_date: invoice.due_date ?? addDaysIso(invoice.date_issued, 14),
    date_paid: invoice.date_paid ?? invoice.date_issued,
    admin_note: invoice.admin_note ?? "",
    items: items.length > 0 ? items : [emptyItem(0)],
  };
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function InvoiceForm({
  draft,
  setDraft,
  patients,
  settings,
  onClose,
  onSaved,
}: {
  draft: InvoiceDraft;
  setDraft: (next: InvoiceDraft) => void;
  patients: Patient[];
  settings: PracticeSettings;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const logoSrc = useMemo(() => {
    const src = settings.logo_url ?? brandLogo.url;
    if (src.startsWith("/") && typeof window !== "undefined") return `${window.location.origin}${src}`;
    return src;
  }, [settings.logo_url]);

  const subtotal = useMemo(
    () => draft.items.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.unit_price), 0),
    [draft.items],
  );
  const isDue = draft.invoice_type === "payment_due";
  const paidAmount = isDue ? 0 : subtotal;
  const totalDue = isDue ? subtotal : 0;

  const docData: InvoiceDocData = {
    invoice_number: draft.invoice_number ?? "INV-preview",
    invoice_type: draft.invoice_type,
    patient_name: draft.patient_name || "Patient name",
    patient_email: nullable(draft.patient_email),
    patient_phone: nullable(draft.patient_phone),
    patient_address: nullable(draft.patient_address),
    medical_aid_name: nullable(draft.medical_aid_name),
    medical_aid_plan: nullable(draft.medical_aid_plan),
    medical_aid_member_number: nullable(draft.medical_aid_member_number),
    dependant_code: nullable(draft.dependant_code),
    date_issued: draft.date_issued,
    due_date: draft.due_date,
    date_paid: draft.date_paid,
    items: draft.items.map((item) => ({
      ...item,
      quantity: toNumber(item.quantity),
      unit_price: toNumber(item.unit_price),
      amount: toNumber(item.quantity) * toNumber(item.unit_price),
    })),
    subtotal,
    paid_amount: paidAmount,
    total_due: totalDue,
  };

  const [instance, updateInstance] = usePDF({
    document: <InvoiceDocument data={docData} settings={settings} logoSrc={logoSrc} />,
  });

  const previewKey = JSON.stringify(docData);
  useEffect(() => {
    const timer = setTimeout(() => {
      updateInstance(<InvoiceDocument data={docData} settings={settings} logoSrc={logoSrc} />);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey]);

  const filteredPatients = patients.filter((p) =>
    p.full_name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const applyPatient = (patient: Patient) => {
    setDraft({
      ...draft,
      patient_id: patient.id,
      patient_name: patient.full_name,
      patient_email: patient.email ?? "",
      patient_phone: patient.phone ?? "",
      patient_address: patient.address ?? "",
      medical_aid_name: patient.medical_aid_name ?? "",
      medical_aid_plan: patient.medical_aid_plan ?? "",
      medical_aid_member_number: patient.medical_aid_member_number ?? "",
      dependant_code: patient.dependant_code ?? "",
    });
    setSearch("");
  };

  const savePatient = async () => {
    if (!draft.patient_name.trim()) {
      toast.error("Enter a patient name first.");
      return;
    }
    const payload = {
      full_name: draft.patient_name.trim(),
      email: nullable(draft.patient_email),
      phone: nullable(draft.patient_phone),
      address: nullable(draft.patient_address),
      medical_aid_name: nullable(draft.medical_aid_name),
      medical_aid_plan: nullable(draft.medical_aid_plan),
      medical_aid_member_number: nullable(draft.medical_aid_member_number),
      dependant_code: nullable(draft.dependant_code),
    };
    if (payload.email) {
      const { data: existing } = await supabase
        .from("patients")
        .select("*")
        .ilike("email", payload.email)
        .maybeSingle();
      if (existing) {
        applyPatient(existing as Patient);
        toast.error(`${existing.full_name} already uses this email - the existing patient has been selected instead.`);
        return;
      }
    }
    const { data, error } = await supabase.from("patients").insert(payload).select("id").single();
    if (error) {
      const duplicate = error.code === "23505";
      toast.error(
        duplicate
          ? "A patient with this email address already exists."
          : error.message,
      );
      return;
    }
    setDraft({ ...draft, patient_id: data.id });
    toast.success("Patient saved to your patient list.");
    onSaved();
  };

  const setItem = (index: number, patch: Partial<InvoiceItem>) => {
    const items = draft.items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    setDraft({ ...draft, items });
  };

  const save = async (status: InvoiceStatus) => {
    if (!draft.patient_name.trim()) {
      toast.error("A patient name is required.");
      return;
    }
    if (draft.items.every((item) => !item.description.trim())) {
      toast.error("Add at least one line item.");
      return;
    }
    setSaving(true);
    try {
      const base = {
        invoice_type: draft.invoice_type,
        status,
        patient_id: draft.patient_id,
        patient_name: draft.patient_name.trim(),
        patient_email: nullable(draft.patient_email),
        patient_phone: nullable(draft.patient_phone),
        patient_address: nullable(draft.patient_address),
        medical_aid_name: nullable(draft.medical_aid_name),
        medical_aid_plan: nullable(draft.medical_aid_plan),
        medical_aid_member_number: nullable(draft.medical_aid_member_number),
        dependant_code: nullable(draft.dependant_code),
        date_issued: draft.date_issued,
        due_date: isDue ? draft.due_date : null,
        date_paid: isDue ? null : draft.date_paid,
        subtotal,
        paid_amount: paidAmount,
        total_due: totalDue,
        admin_note: nullable(draft.admin_note),
      };

      let invoiceId = draft.id;
      let invoiceNumber = draft.invoice_number;

      if (invoiceId) {
        const { data, error } = await supabase
          .from("invoices")
          .update(base)
          .eq("id", invoiceId)
          .select("id, invoice_number")
          .single();
        if (error) throw error;
        invoiceNumber = data.invoice_number;
        await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);
      } else {
        const { data, error } = await supabase
          .from("invoices")
          // invoice_number is assigned server-side by the database sequence
          .insert({ ...base, invoice_number: "" })
          .select("id, invoice_number")
          .single();
        if (error) throw error;
        invoiceId = data.id;
        invoiceNumber = data.invoice_number;
      }

      const rows = draft.items
        .filter((item) => item.description.trim())
        .map((item, index) => ({
          invoice_id: invoiceId!,
          item_date: item.item_date,
          description: item.description.trim(),
          icd10_code: nullable(item.icd10_code ?? ""),
          quantity: Math.max(1, Math.round(toNumber(item.quantity))),
          unit_price: toNumber(item.unit_price),
          amount: Math.max(1, Math.round(toNumber(item.quantity))) * toNumber(item.unit_price),
          sort_order: index,
        }));
      const { error: itemsError } = await supabase.from("invoice_items").insert(rows);
      if (itemsError) throw itemsError;

      // Generate and store the final PDF
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(
        <InvoiceDocument
          data={{ ...docData, invoice_number: invoiceNumber ?? "", items: rows }}
          settings={settings}
          logoSrc={logoSrc}
        />,
      ).toBlob();
      const path = `${invoiceNumber}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("invoices")
        .upload(path, blob, { contentType: "application/pdf", upsert: true });
      if (uploadError) throw uploadError;
      await supabase.from("invoices").update({ pdf_url: path }).eq("id", invoiceId!);

      toast.success(`${invoiceNumber} saved as ${status}.`);
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this document.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full w-full max-w-6xl flex-col bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-navy-deep">
              {draft.id ? `Edit ${draft.invoice_number}` : "New billing document"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Practice details, numbers and banking are filled in automatically.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <div className="min-h-0 overflow-y-auto px-5 py-5">
            <div className="inline-flex rounded-md border border-border p-1">
              {(
                [
                  ["payment_due", "Payment due"],
                  ["paid_receipt", "Paid - medical aid receipt"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDraft({ ...draft, invoice_type: value })}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                    draft.invoice_type === value
                      ? "bg-navy text-cream"
                      : "text-muted-foreground hover:text-navy-deep",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <section className="mt-6">
              <h3 className="text-sm font-semibold text-navy-deep">Patient</h3>
              <Input
                className="mt-2 h-9"
                placeholder="Search existing patients…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search.trim() ? (
                <ul className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border">
                  {filteredPatients.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-muted-foreground">No match - fill the fields below and save as a new patient.</li>
                  ) : null}
                  {filteredPatients.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-secondary"
                        onClick={() => applyPatient(p)}
                      >
                        {p.full_name}
                        {p.medical_aid_name ? (
                          <span className="text-muted-foreground"> · {p.medical_aid_name}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Full name" value={draft.patient_name} onChange={(v) => setDraft({ ...draft, patient_name: v })} />
                <Field label="Email" value={draft.patient_email} onChange={(v) => setDraft({ ...draft, patient_email: v })} />
                <Field label="Phone" value={draft.patient_phone} onChange={(v) => setDraft({ ...draft, patient_phone: v })} />
                <Field label="Address" value={draft.patient_address} onChange={(v) => setDraft({ ...draft, patient_address: v })} />
                <Field label="Medical aid" value={draft.medical_aid_name} onChange={(v) => setDraft({ ...draft, medical_aid_name: v })} />
                <Field label="Plan" value={draft.medical_aid_plan} onChange={(v) => setDraft({ ...draft, medical_aid_plan: v })} />
                <Field label="Member number" value={draft.medical_aid_member_number} onChange={(v) => setDraft({ ...draft, medical_aid_member_number: v })} />
                <Field label="Dependant code" value={draft.dependant_code} onChange={(v) => setDraft({ ...draft, dependant_code: v })} />
              </div>
              <Button variant="outline" size="sm" className="mt-3" onClick={savePatient}>
                <Plus className="h-4 w-4" /> Save as new patient
              </Button>
            </section>

            <section className="mt-7">
              <h3 className="text-sm font-semibold text-navy-deep">Dates</h3>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Field
                  label="Date issued"
                  type="date"
                  value={draft.date_issued}
                  onChange={(v) => setDraft({ ...draft, date_issued: v })}
                />
                {isDue ? (
                  <Field
                    label="Payment due"
                    type="date"
                    value={draft.due_date}
                    onChange={(v) => setDraft({ ...draft, due_date: v })}
                  />
                ) : (
                  <Field
                    label="Date paid"
                    type="date"
                    value={draft.date_paid}
                    onChange={(v) => setDraft({ ...draft, date_paid: v })}
                  />
                )}
              </div>
            </section>

            <section className="mt-7">
              <h3 className="text-sm font-semibold text-navy-deep">Line items</h3>
              <div className="mt-2 space-y-3">
                {draft.items.map((item, index) => (
                  <div key={index} className="rounded-md border border-border p-3">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,140px)_minmax(0,1fr)]">
                      <Field
                        label="Date"
                        type="date"
                        value={item.item_date}
                        onChange={(v) => setItem(index, { item_date: v })}
                      />
                      <Field
                        label="Description"
                        value={item.description}
                        onChange={(v) => setItem(index, { description: v })}
                      />
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-4">
                      <Field
                        label="ICD-10 (optional)"
                        value={item.icd10_code ?? ""}
                        onChange={(v) => setItem(index, { icd10_code: v })}
                      />
                      <Field
                        label="Qty"
                        type="number"
                        value={String(item.quantity)}
                        onChange={(v) => setItem(index, { quantity: toNumber(v) })}
                      />
                      <Field
                        label="Unit price"
                        type="number"
                        value={String(item.unit_price)}
                        onChange={(v) => setItem(index, { unit_price: toNumber(v) })}
                      />
                      <div>
                        <Label className="text-xs">Amount</Label>
                        <p className="mt-2 h-9 rounded-md border border-dashed border-border px-3 py-2 text-sm font-medium text-navy-deep">
                          {money(toNumber(item.quantity) * toNumber(item.unit_price))}
                        </p>
                      </div>
                    </div>
                    {draft.items.length > 1 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-destructive"
                        onClick={() =>
                          setDraft({ ...draft, items: draft.items.filter((_, i) => i !== index) })
                        }
                      >
                        <Trash2 className="h-4 w-4" /> Remove line
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setDraft({ ...draft, items: [...draft.items, emptyItem(draft.items.length)] })}
              >
                <Plus className="h-4 w-4" /> Add another line
              </Button>

              <div className="mt-4 flex justify-end gap-8 border-t border-border pt-4 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-navy-deep">{money(subtotal)}</span>
              </div>
              <div className="mt-1 flex justify-end gap-8 text-sm">
                <span className="text-muted-foreground">{isDue ? "Amount due" : "Balance"}</span>
                <span className="font-semibold text-navy-deep">{money(totalDue)}</span>
              </div>
            </section>

            <section className="mt-7">
              <Label htmlFor="adminNote" className="text-xs">
                Internal note (not shown on the document)
              </Label>
              <Textarea
                id="adminNote"
                className="mt-2"
                rows={2}
                value={draft.admin_note}
                onChange={(e) => setDraft({ ...draft, admin_note: e.target.value })}
              />
            </section>
          </div>

          <aside className="hidden min-h-0 flex-col border-l border-border bg-secondary/40 lg:flex">
            <p className="border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
              Live preview
            </p>
            <div className="min-h-0 flex-1">
              {instance.url ? (
                <iframe title="Invoice preview" src={instance.url} className="h-full w-full" />
              ) : (
                <p className="p-4 text-sm text-muted-foreground">Building preview…</p>
              )}
            </div>
          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-border px-5 py-4">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => save("draft")} disabled={saving}>
            Save as draft
          </Button>
          <Button variant="navy" onClick={() => save(isDue ? "sent" : "paid")} disabled={saving}>
            {saving ? "Generating…" : isDue ? "Generate invoice" : "Generate receipt"}
          </Button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  const uid = useId();
  const id = `${uid}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div>
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        className="mt-2 h-9"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
