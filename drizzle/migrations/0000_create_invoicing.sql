CREATE TABLE public.practice_settings (
  id uuid primary key default gen_random_uuid(),
  practice_name text not null default 'Dr Ben Azouz',
  provider_name text not null default 'Dr M H Ben Azouz',
  role_line text not null default 'General Practitioner - Corporate Metabolic Clinic',
  address_line1 text not null default '135 Daisy Street',
  address_line2 text not null default 'Sandton Central',
  city text not null default 'Johannesburg',
  postal_code text not null default '2196',
  country text not null default 'South Africa',
  contact_email text not null default 'drbenazouz.practice@outlook.com',
  contact_phone text not null default '+27 63 662 9349',
  practice_number text not null default '1126172',
  mp_number text not null default '0655864',
  bank_account_holder text,
  bank_name text,
  bank_account_number text,
  bank_branch_code text,
  proof_of_payment_email text,
  logo_url text,
  vat_exempt_note text not null default 'This practice is VAT exempt in terms of Section 12(a) of the VAT Act.',
  updated_at timestamptz not null default now()
);

CREATE TABLE public.patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  address text,
  date_of_birth date,
  medical_aid_name text,
  medical_aid_plan text,
  medical_aid_member_number text,
  dependant_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TYPE public.invoice_type AS ENUM ('payment_due', 'paid_receipt');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'void');
CREATE SEQUENCE public.invoice_number_seq START 1;

CREATE TABLE public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  invoice_type public.invoice_type not null,
  status public.invoice_status not null default 'draft',
  patient_id uuid references public.patients(id),
  patient_name text not null,
  patient_email text,
  patient_phone text,
  patient_address text,
  medical_aid_name text,
  medical_aid_plan text,
  medical_aid_member_number text,
  dependant_code text,
  date_issued date not null default current_date,
  due_date date,
  date_paid date,
  subtotal numeric(10,2) not null default 0,
  paid_amount numeric(10,2) not null default 0,
  total_due numeric(10,2) not null default 0,
  pdf_url text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX invoices_status_idx ON public.invoices (status);
CREATE INDEX invoices_number_idx ON public.invoices (invoice_number);

CREATE TABLE public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  item_date date not null,
  description text not null,
  icd10_code text,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null,
  amount numeric(10,2) not null,
  sort_order integer not null default 0
);
CREATE INDEX invoice_items_invoice_idx ON public.invoice_items (invoice_id);

CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER invoices_set_number
BEFORE INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.set_invoice_number();

CREATE OR REPLACE FUNCTION public.lock_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.invoice_number := OLD.invoice_number;
  RETURN NEW;
END;
$$;

CREATE TRIGGER invoices_lock_number
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.lock_invoice_number();

CREATE TRIGGER invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER practice_settings_updated_at
BEFORE UPDATE ON public.practice_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT USAGE ON SEQUENCE public.invoice_number_seq TO authenticated;
GRANT ALL ON public.practice_settings TO service_role;
GRANT ALL ON public.patients TO service_role;
GRANT ALL ON public.invoices TO service_role;
GRANT ALL ON public.invoice_items TO service_role;
GRANT ALL ON SEQUENCE public.invoice_number_seq TO service_role;

ALTER TABLE public.practice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage practice settings" ON public.practice_settings FOR ALL TO authenticated
  USING (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
  WITH CHECK (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

CREATE POLICY "Admins manage patients" ON public.patients FOR ALL TO authenticated
  USING (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
  WITH CHECK (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

CREATE POLICY "Admins manage invoices" ON public.invoices FOR ALL TO authenticated
  USING (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
  WITH CHECK (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

CREATE POLICY "Admins manage invoice items" ON public.invoice_items FOR ALL TO authenticated
  USING (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
  WITH CHECK (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

REVOKE ALL ON public.practice_settings FROM anon;
REVOKE ALL ON public.patients FROM anon;
REVOKE ALL ON public.invoices FROM anon;
REVOKE ALL ON public.invoice_items FROM anon;