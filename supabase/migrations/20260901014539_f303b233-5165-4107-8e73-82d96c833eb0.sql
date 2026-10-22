create policy "read partner resources" on storage.objects
  for select to authenticated
  using (bucket_id = 'partner-resources' and (public.is_internal_user() or public.is_partner_member()));
create policy "admins write partner resources" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'partner-resources' and public.has_role(auth.uid(),'admin'));
create policy "admins update partner resources" on storage.objects
  for update to authenticated
  using (bucket_id = 'partner-resources' and public.has_role(auth.uid(),'admin'))
  with check (bucket_id = 'partner-resources' and public.has_role(auth.uid(),'admin'));
create policy "admins delete partner resources" on storage.objects
  for delete to authenticated
  using (bucket_id = 'partner-resources' and public.has_role(auth.uid(),'admin'));