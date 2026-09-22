REVOKE ALL ON public.bookings FROM anon;
GRANT INSERT ON public.bookings TO anon;
GRANT SELECT (requested_date, requested_time, status) ON public.bookings TO anon;

REVOKE ALL ON public.user_roles FROM anon;

REVOKE ALL ON public.availability_rules FROM anon;
GRANT SELECT ON public.availability_rules TO anon;
REVOKE ALL ON public.availability_exceptions FROM anon;
GRANT SELECT ON public.availability_exceptions TO anon;

REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.user_roles FROM authenticated;
REVOKE INSERT ON public.user_roles FROM authenticated;