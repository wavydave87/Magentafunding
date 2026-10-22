-- File type / size enforcement for partner documents (server side)
create or replace function public.partner_documents_validate()
returns trigger language plpgsql set search_path = public as $$
begin
  if lower(new.file_name) !~ '\.(pdf|jpe?g|png)$' then
    raise exception 'Only PDF, JPG and PNG files are accepted.' using errcode = '22023';
  end if;
  if coalesce(new.file_size, 0) > 26214400 then
    raise exception 'Files must be 25MB or smaller.' using errcode = '22023';
  end if;
  return new;
end $$;

drop trigger if exists partner_documents_validate_trg on public.partner_documents;
create trigger partner_documents_validate_trg
  before insert or update on public.partner_documents
  for each row execute function public.partner_documents_validate();

-- Storage: same rules at the object layer, plus organization folder isolation.
drop policy if exists "partners upload own org documents" on storage.objects;
create policy "partners upload own org documents" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'partner-documents'
    and (storage.foldername(name))[1] = public.current_partner_org()::text
    and lower(name) ~ '\.(pdf|jpe?g|png)$'
  );

-- Partners may replace/remove only their own organization's objects.
drop policy if exists "partners update own org documents" on storage.objects;
create policy "partners update own org documents" on storage.objects
  for update to authenticated
  using (bucket_id = 'partner-documents'
         and (storage.foldername(name))[1] = public.current_partner_org()::text)
  with check (bucket_id = 'partner-documents'
              and (storage.foldername(name))[1] = public.current_partner_org()::text
              and lower(name) ~ '\.(pdf|jpe?g|png)$');