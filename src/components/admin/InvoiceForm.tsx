import { usePDF } from "@react-pdf/renderer";
import { CheckCircle2, Plus, Trash2, UserPlus, X } from "lucide-react";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import brandLogo from "@/assets/dr-ben-azouz-dark-brand.png";
import { syncInvoicePayments } from "@/components/admin/accounting/data";
import { inputClass, Segmented } from "@/components/admin/form";
import { usePriceList } from "@/components/admin/price-list/data";
import { PriceItemDialog } from "@/components/admin/price-list/PriceItemDialog";
import { ServiceCombobox } from "@/components/admin/price-list/ServiceCombobox";
import { parseAmount } from "@/lib/accounting";
import { RATE_LABELS, defaultRate, priceFor, type PriceItem, type Rate } from "@/lib/priceList";
import { InvoiceDocument, type InvoiceDocData } from "@/components/admin/InvoiceDocument";
import { IconButton, SearchField } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
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

/** An invoice line while editing; the price-list link is form state only (never saved). */
export type DraftItem = InvoiceItem & {
  price_item_id?: string | undefined;
  rate?: Rate | undefined;
};

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
  items: DraftItem[];
};

export function emptyItem(sort: number): DraftItem {
  return {
    item_date: todayIso(),
    description: "",
    tariff_code: "",
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
  const priceList = usePriceList();
  const priceItems = priceList.data ?? [];
  const preferredRate = defaultRate(draft.medical_aid_name);
  /** Index of the line being saved to the price list, if any. */
  const [savingLineToList, setSavingLineToList] = useState<number | null>(null);
  const logoSrc = useMemo(() => {
    const src = settings.logo_url ?? brandLogo;
    if (src.startsWith("/") && typeof window !== "undefined")
      return `${window.location.origin}${src}`;
    return src;
  }, [settings.logo_url]);

  const subtotal = useMemo(
    () =>
      draft.items.reduce(
        (sum, item) => sum + toNumber(item.quantity) * toNumber(item.unit_price),
        0,
      ),
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
        toast.error(
          `${existing.full_name} already uses this email - the existing patient has been selected instead.`,
        );
        return;
      }
    }
    const { data, error } = await supabase.from("patients").insert(payload).select("id").single();
    if (error) {
      const duplicate = error.code === "23505";
      toast.error(duplicate ? "A patient with this email address already exists." : error.message);
      return;
    }
    setDraft({ ...draft, patient_id: data.id });
    toast.success("Patient saved to your patient list.");
    onSaved();
  };

  const setItem = (index: number, patch: Partial<DraftItem>) => {
    const items = draft.items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    setDraft({ ...draft, items });
  };

  /** Fill a line from a price-list service, at the given (or default) rate. */
  const applyService = (index: number, service: PriceItem, rate: Rate = preferredRate) => {
    const chosen = priceFor(service, rate);
    setItem(index, {
      description: service.name,
      tariff_code: chosen.tariffCode ?? "",
      unit_price: chosen.price,
      price_item_id: service.id,
      rate: chosen.rate,
    });
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
          tariff_code: nullable(item.tariff_code ?? ""),
          icd10_code: nullable(item.icd10_code ?? ""),
          quantity: Math.max(1, Math.round(toNumber(item.quantity))),
          unit_price: toNumber(item.unit_price),
          amount: Math.max(1, Math.round(toNumber(item.quantity))) * toNumber(item.unit_price),
          sort_order: index,
        }));
      const { error: itemsError } = await supabase.from("invoice_items").insert(rows);
      if (itemsError) throw itemsError;

      // Record the receipt's payment / restore paid status from recorded payments.
      await syncInvoicePayments({
        id: invoiceId!,
        invoice_type: draft.invoice_type,
        status,
        subtotal,
        date_paid: base.date_paid,
        date_issued: draft.date_issued,
        patient_id: draft.patient_id,
        patient_name: base.patient_name,
      });

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

  const linkedPatient = draft.patient_id
    ? (patients.find((p) => p.id === draft.patient_id) ?? null)
    : null;
  const set = (patch: Partial<InvoiceDraft>) => setDraft({ ...draft, ...patch });

  return (
    <div
      className="fixed inset-0 z-50 flex bg-ink/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-form-title"
    >
      <div className="ml-auto flex h-full w-full max-w-7xl flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-hairline px-6 py-4">
          <div className="min-w-0">
            <h2 id="invoice-form-title" className="font-display text-xl text-ink">
              {draft.id ? `Edit ${draft.invoice_number}` : "New billing document"}
            </h2>
            <p className="mt-0.5 text-sm text-grey">
              Practice details, document number and banking are filled in automatically.
            </p>
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div className="min-h-0 overflow-y-auto px-6">
            {/* 1. Document type */}
            <FormSection title="Document type">
              <Segmented
                label="Document type"
                value={draft.invoice_type}
                onChange={(v) => set({ invoice_type: v })}
                options={[
                  { value: "payment_due", label: "Invoice · payment due" },
                  { value: "paid_receipt", label: "Receipt · already paid" },
                ]}
              />
              <p className="mt-2 text-xs text-grey">
                {isDue
                  ? "For consultations still to be paid. Includes the practice's banking details."
                  : "For consultations paid in full, so the patient can claim back from their medical aid."}
              </p>
            </FormSection>

            {/* 2. Patient */}
            <FormSection
              title="Patient"
              action={
                linkedPatient ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Linked to patient record
                  </span>
                ) : null
              }
            >
              <div className="relative">
                <SearchField
                  value={search}
                  onChange={setSearch}
                  placeholder="Find an existing patient by name"
                />
                {search.trim() ? (
                  <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-60 overflow-y-auto border border-hairline bg-white shadow-lg">
                    {filteredPatients.length === 0 ? (
                      <li className="px-4 py-3 text-sm text-grey">
                        No match. Fill in the details below and save them as a new patient.
                      </li>
                    ) : null}
                    {filteredPatients.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-canvas"
                          onClick={() => applyPatient(p)}
                        >
                          <span className="font-medium text-ink">{p.full_name}</span>
                          <span className="truncate text-xs text-grey">
                            {p.medical_aid_name ?? p.email ?? ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Full name"
                  value={draft.patient_name}
                  onChange={(v) => set({ patient_name: v })}
                  className="sm:col-span-2"
                />
                <Field
                  label="Email"
                  type="email"
                  value={draft.patient_email}
                  onChange={(v) => set({ patient_email: v })}
                />
                <Field
                  label="Phone"
                  type="tel"
                  value={draft.patient_phone}
                  onChange={(v) => set({ patient_phone: v })}
                />
                <Field
                  label="Address"
                  value={draft.patient_address}
                  onChange={(v) => set({ patient_address: v })}
                  className="sm:col-span-2"
                />
              </div>

              <p className="mt-6 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-grey">
                Medical aid
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Scheme"
                  placeholder="e.g. Discovery Health"
                  value={draft.medical_aid_name}
                  onChange={(v) => set({ medical_aid_name: v })}
                />
                <Field
                  label="Plan"
                  value={draft.medical_aid_plan}
                  onChange={(v) => set({ medical_aid_plan: v })}
                />
                <Field
                  label="Member number"
                  value={draft.medical_aid_member_number}
                  onChange={(v) => set({ medical_aid_member_number: v })}
                />
                <Field
                  label="Dependant code"
                  value={draft.dependant_code}
                  onChange={(v) => set({ dependant_code: v })}
                />
              </div>

              {!linkedPatient ? (
                <Button variant="outline" size="sm" className="mt-4" onClick={savePatient}>
                  <UserPlus /> Save as new patient
                </Button>
              ) : null}
            </FormSection>

            {/* 3. Dates */}
            <FormSection title="Dates">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Date issued"
                  type="date"
                  value={draft.date_issued}
                  onChange={(v) => set({ date_issued: v })}
                />
                {isDue ? (
                  <Field
                    label="Payment due"
                    type="date"
                    value={draft.due_date}
                    onChange={(v) => set({ due_date: v })}
                  />
                ) : (
                  <Field
                    label="Date paid"
                    type="date"
                    value={draft.date_paid}
                    onChange={(v) => set({ date_paid: v })}
                  />
                )}
              </div>
            </FormSection>

            {/* 4. Line items */}
            <FormSection
              title="Line items"
              description="Medical aids need the tariff code (the service) and the ICD-10 code (the diagnosis)."
            >
              <ol className="space-y-3">
                {draft.items.map((item, index) => {
                  const lineAmount = toNumber(item.quantity) * toNumber(item.unit_price);
                  const linkedService = item.price_item_id
                    ? priceItems.find((p) => p.id === item.price_item_id)
                    : undefined;
                  return (
                    <li key={index} className="border border-hairline bg-white">
                      <div className="flex items-center justify-between border-b border-hairline bg-canvas px-4 py-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-grey">
                          Line {index + 1}
                        </span>
                        {draft.items.length > 1 ? (
                          <IconButton
                            label={`Remove line ${index + 1}`}
                            tone="danger"
                            onClick={() =>
                              set({ items: draft.items.filter((_, i) => i !== index) })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        ) : null}
                      </div>
                      <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
                        <div className="min-w-0">
                          <label
                            htmlFor={`line-${index}-description`}
                            className="block text-xs font-semibold text-ink"
                          >
                            Description
                          </label>
                          <div className="mt-2">
                            <ServiceCombobox
                              id={`line-${index}-description`}
                              value={item.description}
                              placeholder={
                                priceItems.length
                                  ? "Type to search your price list"
                                  : "e.g. In-person GP consultation"
                              }
                              items={priceItems}
                              preferredRate={preferredRate}
                              onChange={(v) =>
                                setItem(index, {
                                  description: v,
                                  price_item_id: undefined,
                                  rate: undefined,
                                })
                              }
                              onPick={(service) => applyService(index, service)}
                            />
                          </div>
                          {linkedService &&
                          linkedService.private_price != null &&
                          linkedService.medical_aid_price != null ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="text-xs text-grey">Rate</span>
                              <div
                                className="flex border border-hairline"
                                role="radiogroup"
                                aria-label={`Rate for line ${index + 1}`}
                              >
                                {(["private", "medical_aid"] as const).map((rate) => {
                                  const option = priceFor(linkedService, rate);
                                  return (
                                    <button
                                      key={rate}
                                      type="button"
                                      role="radio"
                                      aria-checked={item.rate === rate}
                                      onClick={() => applyService(index, linkedService, rate)}
                                      className={cn(
                                        "h-8 border-r border-hairline px-3 text-xs transition-colors last:border-r-0",
                                        item.rate === rate
                                          ? "bg-ink text-white"
                                          : "text-grey hover:bg-canvas hover:text-ink",
                                      )}
                                    >
                                      {RATE_LABELS[rate]} · {option.tariffCode ?? "no code"} ·{" "}
                                      {money(option.price)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                          {!item.price_item_id &&
                          item.description.trim() &&
                          toNumber(item.unit_price) > 0 ? (
                            <button
                              type="button"
                              onClick={() => setSavingLineToList(index)}
                              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue hover:underline"
                            >
                              <Plus className="h-3.5 w-3.5" /> Save to price list
                            </button>
                          ) : null}
                        </div>
                        <Field
                          label="Date of service"
                          type="date"
                          value={item.item_date}
                          onChange={(v) => setItem(index, { item_date: v })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 px-4 pb-4 sm:grid-cols-[repeat(2,minmax(0,1fr))_4.5rem_minmax(0,1.2fr)]">
                        <Field
                          label="Tariff code"
                          placeholder="e.g. 0190"
                          value={item.tariff_code ?? ""}
                          onChange={(v) => setItem(index, { tariff_code: v })}
                        />
                        <Field
                          label="ICD-10"
                          placeholder="e.g. I10"
                          value={item.icd10_code ?? ""}
                          onChange={(v) => setItem(index, { icd10_code: v.toUpperCase() })}
                        />
                        <Field
                          label="Qty"
                          type="number"
                          min={1}
                          value={item.quantity ? String(item.quantity) : ""}
                          onChange={(v) => setItem(index, { quantity: toNumber(v) })}
                        />
                        <PriceField
                          label="Unit price"
                          value={toNumber(item.unit_price)}
                          onChange={(v) => setItem(index, { unit_price: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between border-t border-hairline px-4 py-2.5 text-sm">
                        <span className="text-grey">Line total</span>
                        <span className="font-semibold tabular-nums text-ink">
                          {money(lineAmount)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <button
                type="button"
                onClick={() => set({ items: [...draft.items, emptyItem(draft.items.length)] })}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 border border-dashed border-hairline text-sm font-semibold text-blue transition-colors hover:border-blue hover:bg-blue/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
              >
                <Plus className="h-4 w-4" /> Add another line
              </button>

              <dl className="mt-5 ml-auto w-full max-w-xs border border-hairline bg-canvas px-4 py-3 text-sm">
                <div className="flex justify-between py-1">
                  <dt className="text-grey">Subtotal</dt>
                  <dd className="tabular-nums text-ink">{money(subtotal)}</dd>
                </div>
                {!isDue ? (
                  <div className="flex justify-between py-1">
                    <dt className="text-grey">Paid by patient</dt>
                    <dd className="tabular-nums text-ink">{money(paidAmount)}</dd>
                  </div>
                ) : null}
                <div className="mt-1 flex justify-between border-t border-hairline pt-2 font-semibold text-ink">
                  <dt>{isDue ? "Amount due" : "Balance"}</dt>
                  <dd className="tabular-nums">{money(totalDue)}</dd>
                </div>
              </dl>
            </FormSection>

            {/* 5. Internal note */}
            <FormSection
              title="Internal note"
              description="Only visible to the practice. Not printed on the document."
            >
              <textarea
                aria-label="Internal note"
                rows={3}
                value={draft.admin_note}
                onChange={(e) => set({ admin_note: e.target.value })}
                className={cn(inputClass, "h-auto py-2.5")}
              />
            </FormSection>
          </div>

          <aside className="hidden min-h-0 flex-col border-l border-hairline bg-canvas lg:flex">
            <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-grey">
                Live preview
              </p>
              <p className="text-xs text-grey">Updates as you type</p>
            </div>
            <div className="min-h-0 flex-1">
              {instance.url ? (
                <iframe title="Invoice preview" src={instance.url} className="h-full w-full" />
              ) : (
                <p className="p-5 text-sm text-grey">Building preview…</p>
              )}
            </div>
          </aside>
        </div>

        {savingLineToList != null && draft.items[savingLineToList] ? (
          <PriceItemDialog
            item={null}
            prefill={(() => {
              const line = draft.items[savingLineToList]!;
              const code = line.tariff_code ?? "";
              const price = toNumber(line.unit_price).toFixed(2);
              return preferredRate === "medical_aid"
                ? {
                    name: line.description.trim(),
                    medical_aid_tariff_code: code,
                    medical_aid_price: price,
                  }
                : {
                    name: line.description.trim(),
                    private_tariff_code: code,
                    private_price: price,
                  };
            })()}
            onClose={() => setSavingLineToList(null)}
            onSaved={(saved) =>
              setItem(savingLineToList, { price_item_id: saved.id, rate: preferredRate })
            }
          />
        ) : null}

        <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-hairline bg-canvas px-6 py-4">
          <Button variant="outline" className="mr-auto" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => save("draft")} disabled={saving}>
            Save as draft
          </Button>
          <Button onClick={() => save(isDue ? "sent" : "paid")} disabled={saving}>
            {saving ? "Generating…" : isDue ? "Generate invoice" : "Generate receipt"}
          </Button>
        </footer>
      </div>
    </div>
  );
}

function FormSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string | undefined;
  action?: ReactNode | undefined;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-hairline py-6 last:border-b-0">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base text-ink">{title}</h3>
          {description ? <p className="mt-0.5 text-xs text-grey">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  prefix,
  className,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string | undefined;
  placeholder?: string | undefined;
  /** Short text shown inside the input, e.g. "R". */
  prefix?: string | undefined;
  className?: string | undefined;
  min?: number | undefined;
  step?: string | undefined;
}) {
  const uid = useId();
  const id = `${uid}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="block text-xs font-semibold text-ink">
        {label}
      </label>
      <div className="relative mt-2">
        {prefix ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-grey">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          min={min}
          step={step}
          inputMode={type === "number" ? "decimal" : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClass, prefix && "pl-7", type === "number" && "tabular-nums")}
        />
      </div>
    </div>
  );
}

/**
 * Rand amount input. Keeps what's typed (so "620,30" or "620.3" both work) and
 * tidies it to two decimals, e.g. "620.30", when the field loses focus.
 */
function PriceField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const uid = useId();
  const id = `${uid}-price`;
  const [text, setText] = useState(value ? value.toFixed(2) : "");
  const [focused, setFocused] = useState(false);
  const shown = focused ? text : value ? value.toFixed(2) : "";
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-xs font-semibold text-ink">
        {label}
      </label>
      <div className="relative mt-2">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-grey">
          R
        </span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={shown}
          onFocus={() => {
            setText(value ? value.toFixed(2) : "");
            setFocused(true);
          }}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            setText(e.target.value);
            onChange(parseAmount(e.target.value) ?? 0);
          }}
          className={cn(inputClass, "pl-7 tabular-nums")}
        />
      </div>
    </div>
  );
}
