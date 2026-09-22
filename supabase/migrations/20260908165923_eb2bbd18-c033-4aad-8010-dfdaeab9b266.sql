CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration_minutes integer NOT NULL DEFAULT 30,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.availability_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_rules TO authenticated;
GRANT ALL ON public.availability_rules TO service_role;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view availability" ON public.availability_rules FOR SELECT USING (true);
CREATE POLICY "Admins manage availability" ON public.availability_rules FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.availability_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.availability_exceptions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_exceptions TO authenticated;
GRANT ALL ON public.availability_exceptions TO service_role;
ALTER TABLE public.availability_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view exceptions" ON public.availability_exceptions FOR SELECT USING (true);
CREATE POLICY "Admins manage exceptions" ON public.availability_exceptions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','declined','rescheduled','completed','cancelled');

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  service_type text NOT NULL,
  requested_date date NOT NULL,
  requested_time time NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'pending',
  reason_for_visit text,
  new_patient boolean NOT NULL DEFAULT true,
  preferred_language text NOT NULL DEFAULT 'English',
  admin_note text,
  consent_popia boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bookings_date_idx ON public.bookings (requested_date);

GRANT INSERT ON public.bookings TO anon;
GRANT SELECT (requested_date, requested_time, status) ON public.bookings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can request a booking" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can see taken slots" ON public.bookings FOR SELECT TO anon USING (true);
CREATE POLICY "Admins read bookings" ON public.bookings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update bookings" ON public.bookings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete bookings" ON public.bookings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.availability_rules (day_of_week, start_time, end_time, slot_duration_minutes, active) VALUES
 (1,'08:00','13:00',30,true),(1,'14:00','17:00',30,true),
 (2,'08:00','13:00',30,true),(2,'14:00','17:00',30,true),
 (3,'08:00','13:00',30,true),(3,'14:00','17:00',30,true),
 (4,'08:00','13:00',30,true),(4,'14:00','17:00',30,true),
 (5,'08:00','13:00',30,true),(5,'14:00','16:00',30,true);