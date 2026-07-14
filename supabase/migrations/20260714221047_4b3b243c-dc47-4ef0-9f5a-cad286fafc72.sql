
DROP POLICY IF EXISTS "documents read authenticated" ON storage.objects;
CREATE POLICY "documents read authenticated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');
DROP POLICY IF EXISTS "documents admin write" ON storage.objects;
CREATE POLICY "documents admin write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "documents admin update" ON storage.objects;
CREATE POLICY "documents admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "documents admin delete" ON storage.objects;
CREATE POLICY "documents admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND public.has_role(auth.uid(),'admin'));
