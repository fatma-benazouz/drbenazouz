CREATE POLICY "Admins read invoice pdfs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'invoices' AND exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

CREATE POLICY "Admins upload invoice pdfs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'invoices' AND exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

CREATE POLICY "Admins update invoice pdfs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'invoices' AND exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
  WITH CHECK (bucket_id = 'invoices' AND exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

CREATE POLICY "Admins delete invoice pdfs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'invoices' AND exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));