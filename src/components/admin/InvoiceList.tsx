import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Download, Eye, FileText, Pencil, Plus, Settings, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useInvoices } from "@/components/admin/accounting/data";
import { PaymentDialog } from "@/components/admin/accounting/PaymentDialog";
import {
  InvoiceForm,
  blankDraft,
  draftFromInvoice,
  type InvoiceDraft,
} from "@/components/admin/InvoiceForm";
import {
  EmptyState,
  IconButton,
  LoadingRows,
  PageHeader,
  Panel,
  SearchField,
  tableHeadClass,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  INVOICE_STATUSES,
  formatDocDate,
  invoiceTypeLabel,
  money,
  toNumber,
  type Invoice,
  type InvoiceItem,
  type InvoiceStatus,
  type Patient,
  type PracticeSettings,
} from "@/lib/invoices";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: "border-hairline bg-canvas text-grey",
  sent: "border-blue/25 bg-blue/[0.07] text-blue",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-800",
  overdue: "border-red-200 bg-red-50 text-red-700",
  void: "border-hairline bg-white text-grey line-through",
};

export function InvoiceList() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | InvoiceStatus>("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<InvoiceDraft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ number: string; url: string } | null>(null);
  const [recording, setRecording] = useState<Invoice | null>(null);

  const previewUrlRef = useRef<string | null>(null);
  previewUrlRef.current = preview?.url ?? null;
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

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

  const patients = useQuery({
    queryKey: ["admin-patients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*").order("full_name");
      if (error) throw error;
      return (data ?? []) as Patient[];
    },
  });

  const invoices = useInvoices();

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-invoices"] });
    qc.invalidateQueries({ queryKey: ["admin-patients"] });
    qc.invalidateQueries({ queryKey: ["accounting"] });
  };

  /**
   * Received payments decide whether an invoice is paid. Payments created
   * automatically from the invoice can be voided along with it; payments that
   * were recorded by hand must be handled on the Income page first.
   */
  const releasePayments = async (invoice: Invoice, action: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("payments")
      .select("id, source")
      .eq("invoice_id", invoice.id)
      .eq("status", "received");
    if (error) {
      toast.error(error.message);
      return false;
    }
    const rows = data ?? [];
    if (rows.length === 0) return true;
    if (rows.some((r) => r.source !== "invoice")) {
      toast.error(
        `${invoice.invoice_number} has payments recorded against it. Void them on the Income page before you ${action} it.`,
      );
      return false;
    }
    if (
      !window.confirm(
        `${invoice.invoice_number}'s recorded payment will be voided too, so it no longer counts as income. Continue?`,
      )
    )
      return false;
    const { error: voidError } = await supabase
      .from("payments")
      .update({ status: "void" })
      .in(
        "id",
        rows.map((r) => r.id),
      );
    if (voidError) {
      toast.error(voidError.message);
      return false;
    }
    return true;
  };

  const changeStatus = async (invoice: Invoice, next: InvoiceStatus) => {
    if (next === invoice.status) return;
    // Paying an invoice means recording a payment; the invoice follows.
    if (next === "paid" && invoice.total_due > 0) {
      setRecording(invoice);
      return;
    }
    if (invoice.status === "paid" || next === "void") {
      const ok = await releasePayments(invoice, next === "void" ? "void" : "change");
      if (!ok) return;
    }
    setStatus.mutate({ id: invoice.id, status: next });
  };

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InvoiceStatus }) => {
      const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => invoices.data ?? [], [invoices.data]);
  const counts = useMemo(() => {
    const base: Record<string, number> = { all: rows.length };
    for (const status of INVOICE_STATUSES)
      base[status] = rows.filter((r) => r.status === status).length;
    return base;
  }, [rows]);

  const term = search.trim().toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (tab === "all" || r.status === tab) &&
      (!term ||
        r.patient_name.toLowerCase().includes(term) ||
        r.invoice_number.toLowerCase().includes(term)),
  );

  const fetchPdf = async (invoice: Invoice): Promise<Blob | null> => {
    if (!invoice.pdf_url) {
      toast.error("No PDF stored for this document yet - open it and save again.");
      return null;
    }
    const { data, error } = await supabase.storage.from("invoices").download(invoice.pdf_url);
    if (error || !data) {
      toast.error(error?.message ?? "Could not open the PDF.");
      return null;
    }
    return data;
  };

  const previewPdf = async (invoice: Invoice) => {
    setBusyId(invoice.id);
    const blob = await fetchPdf(invoice);
    setBusyId(null);
    if (!blob) return;
    setPreview({ number: invoice.invoice_number, url: URL.createObjectURL(blob) });
  };

  const downloadPdf = async (invoice: Invoice) => {
    setBusyId(invoice.id);
    const blob = await fetchPdf(invoice);
    setBusyId(null);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${invoice.invoice_number}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const closePreview = () => {
    setPreview((current: { number: string; url: string } | null) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const edit = async (invoice: Invoice) => {
    if (invoice.status !== "draft") {
      const ok = window.confirm(
        `${invoice.invoice_number} has already been issued. Editing it will regenerate the PDF. Continue?`,
      );
      if (!ok) return;
    }
    const { data, error } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("sort_order");
    if (error) {
      toast.error(error.message);
      return;
    }
    const items = (data ?? []).map((item) => ({
      ...item,
      quantity: toNumber(item.quantity),
      unit_price: toNumber(item.unit_price),
      amount: toNumber(item.amount),
    })) as InvoiceItem[];
    setDraft(draftFromInvoice(invoice, items));
  };

  const remove = async (invoice: Invoice) => {
    if (invoice.status === "draft") {
      if (!window.confirm(`Delete draft ${invoice.invoice_number}? This cannot be undone.`)) return;
    } else {
      const voidInstead = window.confirm(
        `${invoice.invoice_number} is a finalised document. We recommend voiding it instead, which keeps the record and its number. Press OK to void it, or Cancel to consider deleting it permanently.`,
      );
      if (voidInstead) {
        await changeStatus(invoice, "void");
        return;
      }
      if (
        !window.confirm(
          `Permanently delete ${invoice.invoice_number}? This removes the financial record.`,
        )
      )
        return;
      if (!window.confirm("Final confirmation: delete this document for good?")) return;
    }
    if (!(await releasePayments(invoice, "delete"))) return;
    // Automatic payments belong to the document; remove them with it.
    await supabase.from("payments").delete().eq("invoice_id", invoice.id).eq("source", "invoice");
    if (invoice.pdf_url) await supabase.storage.from("invoices").remove([invoice.pdf_url]);
    const { error } = await supabase.from("invoices").delete().eq("id", invoice.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${invoice.invoice_number} deleted.`);
    refresh();
  };

  const newInvoice = () => setDraft(blankDraft());

  if (settings.isLoading || invoices.isLoading) {
    return (
      <section>
        <PageHeader title="Invoices" description="Loading documents…" />
        <Panel className="mt-6">
          <LoadingRows />
        </Panel>
      </section>
    );
  }

  if (!settings.data) {
    return (
      <section>
        <PageHeader title="Invoices" />
        <Panel className="mt-6">
          <EmptyState
            icon={Settings}
            title="Practice details are not set up yet"
            description="Invoices print the practice's name, address and banking details. Add them first."
            action={
              <Button asChild>
                <Link to="/admin/settings">Open settings</Link>
              </Button>
            }
          />
        </Panel>
      </section>
    );
  }

  const outstanding = rows
    .filter((r) => r.status === "sent" || r.status === "overdue")
    .reduce((sum, r) => sum + r.total_due, 0);

  const statusSelect = (invoice: Invoice) => (
    <select
      value={invoice.status}
      aria-label={`Status of ${invoice.invoice_number}`}
      onChange={(e) => void changeStatus(invoice, e.target.value as InvoiceStatus)}
      className={cn(
        "h-7 cursor-pointer border px-2 text-xs font-semibold capitalize focus:outline-none focus:ring-2 focus:ring-blue/20",
        STATUS_STYLES[invoice.status],
      )}
    >
      {INVOICE_STATUSES.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );

  const actions = (invoice: Invoice) => (
    <>
      <IconButton
        label={`Preview ${invoice.invoice_number}`}
        disabled={busyId === invoice.id}
        onClick={() => previewPdf(invoice)}
      >
        <Eye className="h-4 w-4" />
      </IconButton>
      <IconButton
        label={`Download ${invoice.invoice_number}`}
        disabled={busyId === invoice.id}
        onClick={() => downloadPdf(invoice)}
      >
        <Download className="h-4 w-4" />
      </IconButton>
      <IconButton label={`Edit ${invoice.invoice_number}`} onClick={() => edit(invoice)}>
        <Pencil className="h-4 w-4" />
      </IconButton>
      <IconButton
        label={`Delete ${invoice.invoice_number}`}
        tone="danger"
        onClick={() => remove(invoice)}
      >
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </>
  );

  return (
    <section>
      <PageHeader
        title="Invoices"
        description={
          outstanding > 0
            ? `${rows.length} documents · ${money(outstanding)} outstanding`
            : `${rows.length} document${rows.length === 1 ? "" : "s"}`
        }
        actions={
          <Button onClick={newInvoice}>
            <Plus /> New invoice
          </Button>
        }
      />

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="-mx-4 flex overflow-x-auto px-4 sm:mx-0 sm:px-0"
          role="tablist"
          aria-label="Filter by status"
        >
          <div className="flex border border-hairline bg-white">
            {(["all", ...INVOICE_STATUSES] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 border-r border-hairline px-3.5 text-sm capitalize transition-colors last:border-r-0",
                  tab === id ? "bg-ink text-white" : "text-grey hover:bg-canvas hover:text-ink",
                )}
              >
                {id}
                <span className={cn("text-xs", tab === id ? "text-white/70" : "text-grey/70")}>
                  {counts[id] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>
        <SearchField
          className="lg:w-72"
          value={search}
          onChange={setSearch}
          placeholder="Search number or patient"
        />
      </div>

      <Panel className="mt-4">
        {filtered.length === 0 ? (
          rows.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No invoices yet"
              description="Create a payment request or a paid receipt for a patient."
              action={
                <Button onClick={newInvoice}>
                  <Plus /> New invoice
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No documents match"
              description="Try another status filter or search term."
            />
          )
        ) : (
          <>
            {/* Table on large screens */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className={tableHeadClass}>
                    <th className="px-4 py-3 font-semibold">Number</th>
                    <th className="px-4 py-3 font-semibold">Patient</th>
                    <th className="px-4 py-3 font-semibold">Issued</th>
                    <th className="px-4 py-3 font-semibold">Due / paid</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {filtered.map((invoice) => (
                    <tr key={invoice.id} className="transition-colors hover:bg-canvas/60">
                      <td className="px-4 py-3.5">
                        <p className="whitespace-nowrap font-semibold text-ink">
                          {invoice.invoice_number}
                        </p>
                        <p className="mt-0.5 whitespace-nowrap text-xs text-grey">
                          {invoiceTypeLabel(invoice.invoice_type)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-ink">{invoice.patient_name}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-grey">
                        {formatDocDate(invoice.date_issued)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-grey">
                        {invoice.invoice_type === "payment_due"
                          ? formatDocDate(invoice.due_date)
                          : formatDocDate(invoice.date_paid)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold tabular-nums text-ink">
                        {money(invoice.subtotal)}
                      </td>
                      <td className="px-4 py-3.5">{statusSelect(invoice)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-0.5">{actions(invoice)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards below large screens */}
            <ul className="divide-y divide-hairline lg:hidden">
              {filtered.map((invoice) => (
                <li key={invoice.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{invoice.invoice_number}</p>
                      <p className="mt-0.5 truncate text-sm text-ink">{invoice.patient_name}</p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums text-ink">
                      {money(invoice.subtotal)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-grey">
                    {invoiceTypeLabel(invoice.invoice_type)} · Issued{" "}
                    {formatDocDate(invoice.date_issued)}
                    {invoice.invoice_type === "payment_due"
                      ? ` · Due ${formatDocDate(invoice.due_date)}`
                      : ` · Paid ${formatDocDate(invoice.date_paid)}`}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    {statusSelect(invoice)}
                    <div className="-mr-2 flex gap-0.5">{actions(invoice)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      {draft ? (
        <InvoiceForm
          draft={draft}
          setDraft={setDraft}
          patients={patients.data ?? []}
          settings={settings.data}
          onClose={() => setDraft(null)}
          onSaved={refresh}
        />
      ) : null}

      {recording ? (
        <PaymentDialog
          payment={null}
          prefill={{
            invoice_id: recording.id,
            patient_name: recording.patient_name,
            amount: recording.total_due.toFixed(2),
          }}
          onClose={() => setRecording(null)}
        />
      ) : null}

      {preview ? (
        <div
          className="fixed inset-0 z-50 flex bg-ink/50 p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${preview.number} preview`}
          onClick={closePreview}
        >
          <div
            className="m-auto flex h-full max-h-full w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl sm:h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3">
              <h2 className="font-display text-lg text-ink">{preview.number}</h2>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={preview.url} download={`${preview.number}.pdf`}>
                    <Download /> Download
                  </a>
                </Button>
                <IconButton label="Close preview" onClick={closePreview}>
                  <X className="h-4 w-4" />
                </IconButton>
              </div>
            </header>
            <iframe
              title={`${preview.number} preview`}
              src={preview.url}
              className="min-h-0 w-full flex-1"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
