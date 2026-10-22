create policy "partners upload own org documents" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'partner-documents'
              and (storage.foldername(name))[1] = public.current_partner_org()::text);

create policy "partners read own org documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'partner-documents'
         and (storage.foldername(name))[1] = public.current_partner_org()::text);

create policy "internal read partner documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'partner-documents' and public.is_internal_user());