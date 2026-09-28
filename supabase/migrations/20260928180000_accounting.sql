-- =============================================================================
-- Accounting: income, expenses, recurring costs, equipment register, receipts.
--
-- Additive only: creates new tables, a storage bucket and one trigger that keeps
-- invoices in step with their payments. Existing tables are not altered.
-- Runs as a single transaction, so it either applies completely or not at all.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Expense categories
--    affects_profit = false marks money that leaves the account but isn't a
--    running cost (equipment purchases, instalment repayments). Equipment is
--    expensed through the assets register's SARS write-off instead.
-- -----------------------------------------------------------------------------
CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  affects_profit boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.expense_categories (name, description, affects_profit, sort_order) VALUES
  ('Rent & premises',              'Rent, rates, cleaning, security',                        true,  10),
  ('Utilities & internet',         'Electricity, water, office wifi',                        true,  20),
  ('Telephone',                    'Practice phone and data',                                true,  30),
  ('Practice software',            'GoodX, Medprax, booking and billing systems',            true,  40),
  ('Medical supplies',             'Consumables, medication stock, disposables',             true,  50),
  ('Professional fees',            'HPCSA, BHF practice number, professional bodies',        true,  60),
  ('Indemnity & insurance',        'Malpractice cover, practice and equipment insurance',    true,  70),
  ('Marketing & website',          'Google Ads, website hosting, domain names',              true,  80),
  ('Bank & card fees',             'Bank charges, Yoco connectivity and transaction fees',   true,  90),
  ('Referral & booking fees',      'Per-booking platform fees such as Recomed',              true, 100),
  ('Accounting & legal',           'Accountant, legal and advisory fees',                    true, 110),
  ('Office & stationery',          'Printing, paper, ink, small office items',               true, 120),
  ('Staff & locums',               'Salaries, locum fees',                                   true, 130),
  ('Training & CPD',               'Courses, conferences, journals',                         true, 140),
  ('Travel',                       'Business travel and parking',                            true, 150),
  ('Repairs & maintenance',        'Repairs to equipment and premises',                      true, 160),
  ('Other expenses',               'Anything that fits no other category',                   true, 900),
  ('Equipment purchases',          'Recorded in the equipment register; written off per SARS rules', false, 950),
  ('Instalment repayments',        'Repayments on equipment bought on credit',               false, 960);

-- -----------------------------------------------------------------------------
-- 2. Recurring expenses (templates: rent, subscriptions, insurance)
--    A cost can have a fixed part, a per-unit part, or both
--    (e.g. GoodX: R1,782.50 + R10.50 per item).
-- -----------------------------------------------------------------------------
CREATE TABLE public.recurring_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  supplier text,
  category_id uuid NOT NULL REFERENCES public.expense_categories(id),
  fixed_amount numeric(12,2) CHECK (fixed_amount IS NULL OR fixed_amount >= 0),
  unit_amount numeric(12,2) CHECK (unit_amount IS NULL OR unit_amount >= 0),
  unit_label text,
  frequency text NOT NULL DEFAULT 'monthly'
    CONSTRAINT recurring_expenses_frequency_check
    CHECK (frequency IN ('monthly', 'quarterly', 'annually')),
  next_due_date date NOT NULL,
  payment_method text
    CONSTRAINT recurring_expenses_method_check
    CHECK (payment_method IS NULL OR payment_method IN ('eft', 'card', 'cash', 'debit_order', 'online', 'other')),
  paid_from text NOT NULL DEFAULT 'personal'
    CONSTRAINT recurring_expenses_paid_from_check
    CHECK (paid_from IN ('personal', 'practice')),
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX recurring_expenses_due_idx ON public.recurring_expenses (active, next_due_date);

-- -----------------------------------------------------------------------------
-- 3. Expenses (every rand going out)
-- -----------------------------------------------------------------------------
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL DEFAULT current_date,
  supplier text NOT NULL,
  description text,
  category_id uuid NOT NULL REFERENCES public.expense_categories(id),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  vat_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
  payment_method text
    CONSTRAINT expenses_method_check
    CHECK (payment_method IS NULL OR payment_method IN ('eft', 'card', 'cash', 'debit_order', 'online', 'other')),
  paid_from text NOT NULL DEFAULT 'personal'
    CONSTRAINT expenses_paid_from_check
    CHECK (paid_from IN ('personal', 'practice')),
  status text NOT NULL DEFAULT 'paid'
    CONSTRAINT expenses_status_check
    CHECK (status IN ('paid', 'unpaid', 'void')),
  due_date date,
  reference text,
  receipt_path text,
  recurring_expense_id uuid REFERENCES public.recurring_expenses(id) ON DELETE SET NULL,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX expenses_date_idx ON public.expenses (expense_date);
CREATE INDEX expenses_category_idx ON public.expenses (category_id);
CREATE INDEX expenses_recurring_idx ON public.expenses (recurring_expense_id);

-- -----------------------------------------------------------------------------
-- 4. Payments (every rand coming in)
--    Linked to a patient and/or invoice when known. Only 'received' payments
--    count towards an invoice being paid.
-- -----------------------------------------------------------------------------
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_date date NOT NULL DEFAULT current_date,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  fee_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  payer_type text NOT NULL DEFAULT 'patient'
    CONSTRAINT payments_payer_type_check
    CHECK (payer_type IN ('patient', 'medical_aid', 'insurer', 'other')),
  payer_name text,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name text,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  service text,
  payment_method text
    CONSTRAINT payments_method_check
    CHECK (payment_method IS NULL OR payment_method IN ('eft', 'card', 'cash', 'online', 'other')),
  status text NOT NULL DEFAULT 'received'
    CONSTRAINT payments_status_check
    CHECK (status IN ('received', 'pending', 'void')),
  reference text,
  source text NOT NULL DEFAULT 'manual'
    CONSTRAINT payments_source_check
    CHECK (source IN ('manual', 'invoice', 'import')),
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_fee_not_above_amount CHECK (fee_amount <= amount)
);
CREATE INDEX payments_date_idx ON public.payments (payment_date);
CREATE INDEX payments_invoice_idx ON public.payments (invoice_id);
CREATE INDEX payments_patient_idx ON public.payments (patient_id);

-- -----------------------------------------------------------------------------
-- 5. Equipment register (assets)
--    write_off_years follows SARS Interpretation Note 47; items under R7,000
--    are written off in the year of purchase (write_off_years = 1).
-- -----------------------------------------------------------------------------
CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  asset_type text NOT NULL DEFAULT 'other'
    CONSTRAINT assets_type_check
    CHECK (asset_type IN ('computer', 'phone', 'medical_equipment', 'office_equipment', 'furniture', 'other')),
  supplier text,
  purchase_date date NOT NULL,
  cost numeric(12,2) NOT NULL CHECK (cost > 0),
  write_off_years numeric(4,1) NOT NULL DEFAULT 1 CHECK (write_off_years >= 1),
  serial_number text,
  warranty_until date,
  paid_from text NOT NULL DEFAULT 'personal'
    CONSTRAINT assets_paid_from_check
    CHECK (paid_from IN ('personal', 'practice')),
  financed boolean NOT NULL DEFAULT false,
  receipt_path text,
  disposed_date date,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assets_disposed_after_purchase CHECK (disposed_date IS NULL OR disposed_date >= purchase_date)
);
CREATE INDEX assets_purchase_idx ON public.assets (purchase_date);

-- -----------------------------------------------------------------------------
-- 6. updated_at triggers (reuses the existing public.set_updated_at function)
-- -----------------------------------------------------------------------------
CREATE TRIGGER recurring_expenses_updated_at BEFORE UPDATE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER assets_updated_at BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. Keep invoices in step with their payments
--    When payments linked to an invoice change, recompute what's been paid.
--    Fully paid -> status 'paid' and date_paid set. If a payment is removed and
--    a payment-due invoice is no longer covered, it returns to 'sent'.
--    Void invoices are never changed.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_invoice_from_payments(_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  _paid numeric(12,2);
  _last_paid date;
BEGIN
  IF _invoice_id IS NULL THEN
    RETURN;
  END IF;

  SELECT coalesce(sum(amount), 0), max(payment_date)
    INTO _paid, _last_paid
    FROM public.payments
   WHERE invoice_id = _invoice_id AND status = 'received';

  UPDATE public.invoices i
     SET paid_amount = _paid,
         total_due   = greatest(i.subtotal - _paid, 0),
         status = CASE
           WHEN i.subtotal > 0 AND _paid >= i.subtotal THEN 'paid'::public.invoice_status
           WHEN i.status = 'paid' AND i.invoice_type = 'payment_due' THEN 'sent'::public.invoice_status
           ELSE i.status
         END,
         date_paid = CASE
           WHEN i.subtotal > 0 AND _paid >= i.subtotal THEN coalesce(i.date_paid, _last_paid)
           WHEN i.invoice_type = 'payment_due' THEN NULL
           ELSE i.date_paid
         END
   WHERE i.id = _invoice_id
     AND i.status <> 'void';
END;
$$;

CREATE OR REPLACE FUNCTION public.payments_sync_invoice()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.sync_invoice_from_payments(NEW.invoice_id);
  END IF;
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.invoice_id IS DISTINCT FROM NEW.invoice_id) THEN
    PERFORM public.sync_invoice_from_payments(OLD.invoice_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER payments_sync_invoice
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.payments_sync_invoice();

-- -----------------------------------------------------------------------------
-- 8. Access: admins only, using the same user_roles check as the invoicing
--    tables (the old has_role() helper was dropped in an earlier migration)
-- -----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.expense_categories, public.recurring_expenses, public.expenses,
  public.payments, public.assets
  TO authenticated;
GRANT ALL ON
  public.expense_categories, public.recurring_expenses, public.expenses,
  public.payments, public.assets
  TO service_role;

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets             ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage expense categories" ON public.expense_categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Admins manage recurring expenses" ON public.recurring_expenses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Admins manage expenses" ON public.expenses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Admins manage assets" ON public.assets FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- -----------------------------------------------------------------------------
-- 9. Private storage bucket for receipt photos and PDFs (10 MB each)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts', 'receipts', false, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read receipts" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Admins upload receipts" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Admins update receipts" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'receipts' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (bucket_id = 'receipts' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Admins delete receipts" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'receipts' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- -----------------------------------------------------------------------------
-- 10. Backfill: one received payment for every invoice already marked paid,
--     so income is complete from day one. Amounts equal each invoice total,
--     so the sync trigger leaves those invoices exactly as they are.
-- -----------------------------------------------------------------------------
INSERT INTO public.payments
  (payment_date, amount, payer_type, payer_name, patient_id, patient_name,
   invoice_id, status, source, notes)
SELECT
  coalesce(i.date_paid, (i.updated_at AT TIME ZONE 'Africa/Johannesburg')::date),
  i.subtotal,
  'patient',
  i.patient_name,
  i.patient_id,
  i.patient_name,
  i.id,
  'received',
  'invoice',
  'Created from ' || i.invoice_number || ' when accounting was set up; payment method not recorded.'
FROM public.invoices i
WHERE i.status = 'paid'
  AND i.subtotal > 0
  AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.invoice_id = i.id);

COMMIT;
