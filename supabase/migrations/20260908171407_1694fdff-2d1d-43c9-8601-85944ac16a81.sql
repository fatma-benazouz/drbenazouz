DROP POLICY IF EXISTS "Admins manage exceptions" ON public.availability_exceptions;
DROP POLICY IF EXISTS "Admins manage availability" ON public.availability_rules;
DROP POLICY IF EXISTS "Admins read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins delete bookings" ON public.bookings;

CREATE POLICY "Admins manage exceptions" ON public.availability_exceptions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "Admins manage availability" ON public.availability_rules
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "Admins read bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "Admins update bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "Admins delete bookings" ON public.bookings
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);