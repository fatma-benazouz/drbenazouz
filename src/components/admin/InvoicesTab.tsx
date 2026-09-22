import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  InvoiceForm,
  blankDraft,
  draftFromInvoice,
  type InvoiceDraft,
} from "@/components/admin/InvoiceForm";
import { PracticeSettingsPanel } from "@/components/admin/PracticeSettingsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  draft: "border-border bg-muted text-muted-foreground",
  sent: "border-navy/25 bg-navy/10 text-navy-deep",
  paid: "border-sage/50 bg-sage/25 text-navy-deep",
  overdue: "border-destructive/30 bg-destructive/10 text-destructive",
  void: "border-border bg-secondary text-muted-foreground",
};

export function InvoicesTab() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | InvoiceStatus>("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<InvoiceDraft | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ number: string; url: string } | null>(null);

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
      const { data, error } = await supabase.from("practice_settings").select("*").limit(1).maybeSingle();
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

  const invoices = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        subtotal: toNumber(row.subtotal),
        paid_amount: toNumber(row.paid_amount),
        total_due: toNumber(row.total_due),
      })) as Invoice[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-invoices"] });
    qc.invalidateQueries({ queryKey: ["admin-patients"] });
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

  const rows = invoices.data ?? [];
  const counts = useMemo(() => {
    const base: Record<string, number> = { all: rows.length };
    for (const status of INVOICE_STATUSES) base[status] = rows.filter((r) => r.status === status).length;
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
        setStatus.mutate({ id: invoice.id, status: "void" });
        return;
      }
      if (!window.confirm(`Permanently delete ${invoice.invoice_number}? This removes the financial record.`))
        return;
      if (!window.confirm("Final confirmation: delete this document for good?")) return;
    }
    if (invoice.pdf_url) await supabase.storage.from("invoices").remove([invoice.pdf_url]);
    const { error } = await supabase.from("invoices").delete().eq("id", invoice.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${invoice.invoice_number} deleted.`);
    refresh();
  };

  if (settings.isLoading) return <p className="text-sm text-muted-foreground">Loading invoices…</p>;
  if (!settings.data)
    return <p className="text-sm text-muted-foreground">Practice details are not set up yet.</p>;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-navy-deep">Invoices</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {rows.length} shown
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
            Practice details
          </Button>
          <Button variant="navy" size="sm" onClick={() => setDraft(blankDraft())}>
            <Plus className="h-4 w-4" /> New invoice
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(["all", ...INVOICE_STATUSES] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm capitalize transition-colors",
              tab === id
                ? "border-navy bg-navy text-cream"
                : "border-border bg-card text-muted-foreground hover:text-navy-deep",
            )}
          >
            {id} <span className="ml-1 text-xs opacity-70">{counts[id] ?? 0}</span>
          </button>
        ))}
        <Input
          className="ml-auto h-9 w-full sm:w-64"
          placeholder="Search # or patient…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Patient</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Issued</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Due / Paid</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  No documents match these filters.
                </td>
              </tr>
            ) : null}
            {filtered.map((invoice) => (
              <tr key={invoice.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-navy-deep">{invoice.invoice_number}</td>
                <td className="px-4 py-3">{invoice.patient_name}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs",
                      invoice.invoice_type === "payment_due"
                        ? "border-navy/25 bg-navy/5 text-navy-deep"
                        : "border-sage/50 bg-sage/20 text-navy-deep",
                    )}
                  >
                    {invoiceTypeLabel(invoice.invoice_type)}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDocDate(invoice.date_issued)}</td>
                <td className="px-4 py-3 text-right">{money(invoice.subtotal)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {invoice.invoice_type === "payment_due"
                    ? formatDocDate(invoice.due_date)
                    : formatDocDate(invoice.date_paid)}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={invoice.status}
                    onChange={(e) =>
                      setStatus.mutate({ id: invoice.id, status: e.target.value as InvoiceStatus })
                    }
                    className={cn(
                      "h-8 rounded-full border px-2 text-xs capitalize",
                      STATUS_STYLES[invoice.status],
                    )}
                  >
                    {INVOICE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <IconButton
                      label="Preview"
                      disabled={busyId === invoice.id}
                      onClick={() => previewPdf(invoice)}
                    >
                      <Eye className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label="Download"
                      disabled={busyId === invoice.id}
                      onClick={() => downloadPdf(invoice)}
                    >
                      <Download className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="Edit" onClick={() => edit(invoice)}>
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="Delete" onClick={() => remove(invoice)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

      {preview ? (
        <div
          className="fixed inset-0 z-50 flex bg-black/50 p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
          onClick={closePreview}
        >
          <div
            className="m-auto flex h-full max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-none bg-background shadow-2xl sm:h-[90vh] sm:rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
              <h2 className="text-base font-semibold text-navy-deep">{preview.number}</h2>
              <div className="flex items-center gap-2">
                <a
                  href={preview.url}
                  download={`${preview.number}.pdf`}
                  className="rounded-md border border-border px-3 py-1.5 text-sm text-navy-deep hover:bg-secondary"
                >
                  Download
                </a>
                <Button variant="ghost" size="sm" onClick={closePreview} aria-label="Close preview">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </header>
            <iframe title={`${preview.number} preview`} src={preview.url} className="min-h-0 flex-1 w-full" />
          </div>
        </div>
      ) : null}

      {showSettings ? (
        <PracticeSettingsPanel
          settings={settings.data}
          onClose={() => setShowSettings(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["practice-settings"] })}
        />
      ) : null}
    </section>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-navy-deep disabled:opacity-40"
    >
      {children}
    </button>
  );
}
