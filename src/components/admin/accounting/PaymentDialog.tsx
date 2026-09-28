import { CheckCircle2 } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";

import { useInvoices, usePatients, useRefreshAccounting } from "@/components/admin/accounting/data";
import {
  Field,
  inputClass,
  Modal,
  MoneyInput,
  Segmented,
  SelectInput,
} from "@/components/admin/form";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  METHOD_LABELS,
  PAYER_LABELS,
  PAYER_TYPES,
  PAYMENT_METHODS,
  parseAmount,
  roundMoney,
  type Payment,
  type PayerType,
  type PaymentMethod,
} from "@/lib/accounting";
import { money, todayIso, type Invoice } from "@/lib/invoices";

/** Typical Yoco local-card rate (2.95% + 15% VAT). Only a starting estimate. */
const CARD_FEE_ESTIMATE = 0.0295 * 1.15;

type Draft = {
  payment_date: string;
  amount: string;
  fee_amount: string;
  payer_type: PayerType;
  payer_name: string;
  patient_name: string;
  invoice_id: string;
  service: string;
  payment_method: PaymentMethod | "";
  status: "received" | "pending";
  reference: string;
  notes: string;
};

export type PaymentPrefill = Partial<
  Pick<Draft, "invoice_id" | "patient_name" | "amount" | "payment_date">
>;

function toDraft(payment: Payment | null, prefill: PaymentPrefill): Draft {
  if (!payment) {
    return {
      payment_date: todayIso(),
      amount: "",
      fee_amount: "",
      payer_type: "patient",
      payer_name: "",
      patient_name: "",
      invoice_id: "",
      service: "",
      payment_method: "",
      status: "received",
      reference: "",
      notes: "",
      ...prefill,
    };
  }
  return {
    payment_date: payment.payment_date,
    amount: payment.amount.toFixed(2),
    fee_amount: payment.fee_amount ? payment.fee_amount.toFixed(2) : "",
    payer_type: payment.payer_type,
    payer_name: payment.payer_name ?? "",
    patient_name: payment.patient_name ?? "",
    invoice_id: payment.invoice_id ?? "",
    service: payment.service ?? "",
    payment_method: payment.payment_method ?? "",
    status: payment.status === "pending" ? "pending" : "received",
    reference: payment.reference ?? "",
    notes: payment.notes ?? "",
  };
}

export function PaymentDialog({
  payment,
  prefill = {},
  onClose,
}: {
  payment: Payment | null;
  prefill?: PaymentPrefill | undefined;
  onClose: () => void;
}) {
  const uid = useId();
  const refresh = useRefreshAccounting();
  const patients = usePatients();
  const invoices = useInvoices();
  const [draft, setDraft] = useState<Draft>(() => toDraft(payment, prefill));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const matchedPatient = useMemo(() => {
    const name = draft.patient_name.trim().toLowerCase();
    if (!name) return null;
    return (patients.data ?? []).find((p) => p.full_name.trim().toLowerCase() === name) ?? null;
  }, [draft.patient_name, patients.data]);

  // Invoices this payment could settle: open ones for the patient (or all open
  // ones when no patient is chosen), plus whichever is already linked.
  const invoiceOptions = useMemo(() => {
    const name = draft.patient_name.trim().toLowerCase();
    const open = (invoices.data ?? []).filter((inv) => {
      if (inv.id === draft.invoice_id) return true;
      if (inv.status === "void" || inv.status === "paid" || inv.total_due <= 0) return false;
      if (!name) return true;
      return (
        (matchedPatient && inv.patient_id === matchedPatient.id) ||
        inv.patient_name.trim().toLowerCase() === name
      );
    });
    return open.map((inv) => ({
      value: inv.id,
      label: `${inv.invoice_number} · ${inv.patient_name} · ${inv.status === "paid" ? "paid" : `${money(inv.total_due)} due`}`,
    }));
  }, [invoices.data, draft.patient_name, draft.invoice_id, matchedPatient]);

  const selectInvoice = (id: string) => {
    const invoice = (invoices.data ?? []).find((inv) => inv.id === id) as Invoice | undefined;
    setDraft((d) => ({
      ...d,
      invoice_id: id,
      patient_name: d.patient_name || invoice?.patient_name || "",
      amount:
        d.amount || (invoice && invoice.total_due > 0 ? invoice.total_due.toFixed(2) : d.amount),
    }));
  };

  const estimateFee = () => {
    const amount = parseAmount(draft.amount);
    if (amount == null) return;
    set("fee_amount", roundMoney(amount * CARD_FEE_ESTIMATE).toFixed(2));
  };

  const save = async () => {
    const amount = parseAmount(draft.amount);
    const fee = draft.fee_amount.trim() ? parseAmount(draft.fee_amount) : 0;
    const next: typeof errors = {};
    if (amount == null || amount <= 0) next.amount = "Enter an amount above R0.";
    if (fee == null || fee < 0) next.fee_amount = "Enter a valid fee, or leave it empty.";
    else if (amount != null && fee > amount)
      next.fee_amount = "The fee can't be more than the payment.";
    if (!draft.payment_date) next.payment_date = "Choose a date.";
    if (!draft.patient_name.trim() && !draft.payer_name.trim())
      next.patient_name = "Add the patient or who paid.";
    setErrors(next);
    if (Object.keys(next).length > 0 || amount == null || fee == null) return;

    setSaving(true);
    const payload = {
      payment_date: draft.payment_date,
      amount,
      fee_amount: fee,
      payer_type: draft.payer_type,
      payer_name: draft.payer_name.trim() || null,
      patient_id: matchedPatient?.id ?? null,
      patient_name: draft.patient_name.trim() || null,
      invoice_id: draft.invoice_id || null,
      service: draft.service.trim() || null,
      payment_method: draft.payment_method || null,
      status: draft.status,
      reference: draft.reference.trim() || null,
      notes: draft.notes.trim() || null,
    };
    const { error } = payment
      ? await supabase.from("payments").update(payload).eq("id", payment.id)
      : await supabase.from("payments").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(payment ? "Payment updated." : "Payment recorded.");
    refresh();
    onClose();
  };

  const amountNumber = parseAmount(draft.amount);
  const feeNumber = draft.fee_amount.trim() ? parseAmount(draft.fee_amount) : 0;
  const net =
    amountNumber != null && feeNumber != null ? roundMoney(amountNumber - feeNumber) : null;

  return (
    <Modal
      title={payment ? "Edit payment" : "Record payment"}
      description="Money received from a patient, medical aid or insurer."
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : payment ? "Save changes" : "Record payment"}
          </Button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Patient"
          htmlFor={`${uid}-patient`}
          error={errors.patient_name}
          className="sm:col-span-2"
          hint={
            matchedPatient ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Linked to the patient record
              </span>
            ) : draft.patient_name.trim() ? (
              "Not in your patient list — saved as a name only."
            ) : (
              "Start typing to pick from your patients."
            )
          }
        >
          <input
            id={`${uid}-patient`}
            className={inputClass}
            list={`${uid}-patients`}
            placeholder="Who was treated"
            value={draft.patient_name}
            onChange={(e) => set("patient_name", e.target.value)}
            autoFocus={!payment && !prefill.patient_name}
          />
          <datalist id={`${uid}-patients`}>
            {(patients.data ?? []).map((p) => (
              <option key={p.id} value={p.full_name} />
            ))}
          </datalist>
        </Field>

        <Field
          label="Invoice"
          htmlFor={`${uid}-invoice`}
          className="sm:col-span-2"
          hint="Optional. When a payment covers an invoice in full, it's marked Paid automatically."
        >
          <SelectInput
            id={`${uid}-invoice`}
            value={draft.invoice_id}
            onChange={selectInvoice}
            options={[{ value: "", label: "Not linked to an invoice" }, ...invoiceOptions]}
          />
        </Field>

        <Field label="Amount received" htmlFor={`${uid}-amount`} error={errors.amount}>
          <MoneyInput
            id={`${uid}-amount`}
            value={draft.amount}
            onChange={(v) => set("amount", v)}
          />
        </Field>

        <Field label="Date" htmlFor={`${uid}-date`} error={errors.payment_date}>
          <input
            id={`${uid}-date`}
            type="date"
            className={inputClass}
            value={draft.payment_date}
            onChange={(e) => set("payment_date", e.target.value)}
          />
        </Field>

        <Field label="Status" className="sm:col-span-2">
          <Segmented
            label="Status"
            value={draft.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "received", label: "Received" },
              { value: "pending", label: "Pending" },
            ]}
          />
        </Field>

        <Field label="Paid by" htmlFor={`${uid}-payer-type`}>
          <SelectInput
            id={`${uid}-payer-type`}
            value={draft.payer_type}
            onChange={(v) => set("payer_type", v)}
            options={PAYER_TYPES.map((t) => ({ value: t, label: PAYER_LABELS[t] }))}
          />
        </Field>

        <Field
          label={
            draft.payer_type === "patient" ? "Payer name (if someone else paid)" : "Payer name"
          }
          htmlFor={`${uid}-payer`}
        >
          <input
            id={`${uid}-payer`}
            className={inputClass}
            placeholder={
              draft.payer_type === "patient" ? "e.g. a parent or partner" : "e.g. Sanlam, Discovery"
            }
            value={draft.payer_name}
            onChange={(e) => set("payer_name", e.target.value)}
          />
        </Field>

        <Field label="Payment method" htmlFor={`${uid}-method`}>
          <SelectInput
            id={`${uid}-method`}
            value={draft.payment_method}
            onChange={(v) => set("payment_method", v)}
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: METHOD_LABELS[m] }))}
            placeholder="Not recorded"
          />
        </Field>

        <Field
          label="Card / bank fee"
          htmlFor={`${uid}-fee`}
          error={errors.fee_amount}
          hint={
            draft.payment_method === "card" ? (
              <button type="button" className="text-blue hover:underline" onClick={estimateFee}>
                Estimate Yoco fee (≈3.4%)
              </button>
            ) : net != null && feeNumber ? (
              `${money(net)} reaches the bank.`
            ) : undefined
          }
        >
          <MoneyInput
            id={`${uid}-fee`}
            value={draft.fee_amount}
            onChange={(v) => set("fee_amount", v)}
          />
        </Field>

        <Field label="Service" htmlFor={`${uid}-service`}>
          <input
            id={`${uid}-service`}
            className={inputClass}
            placeholder="e.g. Consultation, Online consultation"
            value={draft.service}
            onChange={(e) => set("service", e.target.value)}
          />
        </Field>

        <Field label="Reference" htmlFor={`${uid}-ref`} hint="EFT reference or slip number.">
          <input
            id={`${uid}-ref`}
            className={inputClass}
            value={draft.reference}
            onChange={(e) => set("reference", e.target.value)}
          />
        </Field>

        <Field label="Notes" htmlFor={`${uid}-notes`} className="sm:col-span-2">
          <input
            id={`${uid}-notes`}
            className={inputClass}
            placeholder="e.g. Paid for Michelle, rate to be confirmed"
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
