-- =============================================================================
-- Price list: the services the practice charges for.
--
-- Each service has a private rate and/or a medical aid rate. The tariff code
-- can differ between the two (e.g. GP consultation: 0190 private, 0191 at the
-- medical aid rate), so each rate keeps its own code and price.
--
-- Invoices copy the description, code and price when a service is picked, so
-- changing the price list never alters invoices already issued.
--
-- Additive and safe to run more than once. Runs as one transaction.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.price_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'consultation'
    CONSTRAINT price_list_items_category_check
    CHECK (category IN ('consultation', 'procedure', 'test', 'medication', 'other')),
  private_tariff_code text,
  private_price numeric(12,2) CHECK (private_price IS NULL OR private_price >= 0),
  medical_aid_tariff_code text,
  medical_aid_price numeric(12,2) CHECK (medical_aid_price IS NULL OR medical_aid_price >= 0),
  notes text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT price_list_items_has_a_price CHECK (private_price IS NOT NULL OR medical_aid_price IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS price_list_items_order_idx ON public.price_list_items (active, category, sort_order);

DROP TRIGGER IF EXISTS price_list_items_updated_at ON public.price_list_items;
CREATE TRIGGER price_list_items_updated_at BEFORE UPDATE ON public.price_list_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_list_items TO authenticated;
GRANT ALL ON public.price_list_items TO service_role;
ALTER TABLE public.price_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage price list" ON public.price_list_items;
CREATE POLICY "Admins manage price list" ON public.price_list_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- Starting list.
INSERT INTO public.price_list_items
  (name, category, private_tariff_code, private_price, medical_aid_tariff_code, medical_aid_price, sort_order)
SELECT 'In-person GP consultation', 'consultation', '0190', 820.00, '0191', 620.20, 10
WHERE NOT EXISTS (
  SELECT 1 FROM public.price_list_items WHERE lower(name) = 'in-person gp consultation'
);

COMMIT;
