-- Private storage buckets the app uploads to. On the original Lovable
-- projects these were created outside migrations, so a fresh database
-- lacked them. Access is governed by the storage.objects policies above.
insert into storage.buckets (id, name, public)
values
  ('closing-documents', 'closing-documents', false),
  ('partner-documents', 'partner-documents', false),
  ('partner-resources', 'partner-resources', false)
on conflict (id) do nothing;
