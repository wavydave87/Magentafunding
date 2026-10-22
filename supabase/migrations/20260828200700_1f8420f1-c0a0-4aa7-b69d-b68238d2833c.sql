create policy "clients upload closing docs" on storage.objects for insert to anon
  with check (
    bucket_id = 'closing-documents'
    and public.deal_is_open(((storage.foldername(name))[1])::uuid)
  );

create policy "reps read own closing docs" on storage.objects for select to authenticated
  using (
    bucket_id = 'closing-documents'
    and public.owns_deal(((storage.foldername(name))[1])::uuid)
  );