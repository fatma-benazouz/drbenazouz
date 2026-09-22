CREATE UNIQUE INDEX IF NOT EXISTS patients_unique_email_idx
  ON public.patients (lower(email))
  WHERE email IS NOT NULL AND email <> '';