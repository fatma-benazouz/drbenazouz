import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  normaliseExpense,
  normalisePayment,
  normaliseRecurring,
  type DateRange,
  type ExpenseCategory,
} from "@/lib/accounting";
import { normaliseAsset } from "@/lib/assets";
import { toNumber, type Invoice, type Patient } from "@/lib/invoices";

/*
 * Data access for the accounting pages. Every key starts with "accounting" so
 * one invalidation refreshes all figures after a change.
 */

export const accountingKeys = {
  all: ["accounting"] as const,
  categories: ["accounting", "categories"] as const,
  recurring: ["accounting", "recurring"] as const,
  assets: ["accounting", "assets"] as const,
  expenses: (range: DateRange) => ["accounting", "expenses", range.from, range.to] as const,
  payments: (range: DateRange) => ["accounting", "payments", range.from, range.to] as const,
};

export function useRefreshAccounting() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: accountingKeys.all });
    // Payments can change invoice status, so refresh invoices too.
    void qc.invalidateQueries({ queryKey: ["admin-invoices"] });
  };
}

export function useCategories() {
  return useQuery({
    queryKey: accountingKeys.categories,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_categories")
        .select("*")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data as ExpenseCategory[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useExpenses(range: DateRange) {
  return useQuery({
    queryKey: accountingKeys.expenses(range),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .gte("expense_date", range.from)
        .lte("expense_date", range.to)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(normaliseExpense);
    },
  });
}

export function usePayments(range: DateRange) {
  return useQuery({
    queryKey: accountingKeys.payments(range),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .gte("payment_date", range.from)
        .lte("payment_date", range.to)
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(normalisePayment);
    },
  });
}

export function useRecurring() {
  return useQuery({
    queryKey: accountingKeys.recurring,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_expenses")
        .select("*")
        .order("active", { ascending: false })
        .order("next_due_date");
      if (error) throw error;
      return (data ?? []).map(normaliseRecurring);
    },
  });
}

/** The whole equipment register (small list; filtered in the page). */
export function useAssets() {
  return useQuery({
    queryKey: accountingKeys.assets,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .order("purchase_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(normaliseAsset);
    },
  });
}

/** Newest number first; numeric-aware so INV-0100 sorts above INV-0099. */
export function compareInvoiceNumbersDesc(
  a: Pick<Invoice, "invoice_number">,
  b: Pick<Invoice, "invoice_number">,
) {
  return b.invoice_number.localeCompare(a.invoice_number, undefined, { numeric: true });
}

/** All invoices, highest invoice number first. Shared by Invoices and Accounting. */
export function useInvoices() {
  return useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*");
      if (error) throw error;
      return (data ?? [])
        .map((row) => ({
          ...row,
          subtotal: toNumber(row.subtotal),
          paid_amount: toNumber(row.paid_amount),
          total_due: toNumber(row.total_due),
        }))
        .sort(compareInvoiceNumbersDesc) as Invoice[];
    },
  });
}

/** Same query key and shape as the Patients page. */
export function usePatients() {
  return useQuery({
    queryKey: ["admin-patients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*").order("full_name");
      if (error) throw error;
      return (data ?? []) as Patient[];
    },
  });
}

// ---------------------------------------------------------------------------
// Invoices <-> payments
// ---------------------------------------------------------------------------

type InvoiceForSync = Pick<
  Invoice,
  | "id"
  | "invoice_type"
  | "status"
  | "subtotal"
  | "date_paid"
  | "date_issued"
  | "patient_id"
  | "patient_name"
>;

/**
 * Keep a saved invoice and its payments consistent:
 * - a paid receipt always has a matching payment (created, or kept in step
 *   with the receipt's total/date when it was created automatically);
 * - the invoice's paid amount/status is then recomputed from its payments by
 *   the database (sync_invoice_from_payments), undoing any stale values the
 *   invoice form wrote.
 */
export async function syncInvoicePayments(invoice: InvoiceForSync): Promise<void> {
  if (
    invoice.invoice_type === "paid_receipt" &&
    invoice.status === "paid" &&
    invoice.subtotal > 0
  ) {
    const { data, error } = await supabase
      .from("payments")
      .select("id, source, status")
      .eq("invoice_id", invoice.id);
    if (error) throw error;
    const rows = data ?? [];
    const auto = rows.filter((p) => p.source === "invoice");
    const values = {
      amount: invoice.subtotal,
      payment_date: invoice.date_paid ?? invoice.date_issued,
      patient_id: invoice.patient_id,
      patient_name: invoice.patient_name,
    };
    if (rows.length === 0) {
      const { error: insertError } = await supabase.from("payments").insert({
        ...values,
        payer_type: "patient",
        payer_name: invoice.patient_name,
        status: "received",
        source: "invoice",
      });
      if (insertError) throw insertError;
    } else if (rows.length === 1 && auto.length === 1) {
      const { error: updateError } = await supabase
        .from("payments")
        .update(values)
        .eq("id", auto[0]!.id);
      if (updateError) throw updateError;
    }
  }
  const { error: rpcError } = await supabase.rpc("sync_invoice_from_payments", {
    _invoice_id: invoice.id,
  });
  if (rpcError) throw rpcError;
}

/** Received payments linked to an invoice (used to guard manual status changes). */
export async function receivedPaymentsFor(invoiceId: string): Promise<number> {
  const { count, error } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("invoice_id", invoiceId)
    .eq("status", "received");
  if (error) throw error;
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Receipts (private "receipts" storage bucket)
// ---------------------------------------------------------------------------

export async function uploadReceipt(file: File, date: string): Promise<string> {
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const [year, month] = date.split("-");
  const path = `${year}/${month}/${crypto.randomUUID()}.${ext || "bin"}`;
  const { error } = await supabase.storage
    .from("receipts")
    .upload(path, file, { upsert: false, ...(file.type ? { contentType: file.type } : {}) });
  if (error) throw error;
  return path;
}

/** Copy a stored receipt so two records never share (and delete) one file. */
export async function copyReceipt(path: string): Promise<string> {
  const ext = path.split(".").pop() ?? "bin";
  const [year, month] = path.split("/");
  const target = `${year}/${month}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("receipts").copy(path, target);
  if (error) throw error;
  return target;
}

export async function removeReceipt(path: string | null | undefined): Promise<void> {
  if (!path) return;
  await supabase.storage.from("receipts").remove([path]);
}

/**
 * Open a receipt in a new tab via a short-lived signed link. The tab is opened
 * synchronously (inside the click) so browsers don't block it as a pop-up.
 */
export async function openReceipt(path: string): Promise<void> {
  const tab = window.open("", "_blank");
  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 120);
  if (error || !data) {
    tab?.close();
    throw error ?? new Error("Could not open the receipt.");
  }
  if (tab) tab.location.href = data.signedUrl;
  else window.location.href = data.signedUrl;
}
