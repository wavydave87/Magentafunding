alter table public.partner_members add column if not exists phone text;

create or replace function public.partner_members_self_update_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if public.is_internal_user() or public.is_partner_org_admin() then
    return new;
  end if;
  if new.user_id is distinct from auth.uid() or old.user_id is distinct from auth.uid() then
    raise exception 'You can only update your own profile.' using errcode = '42501';
  end if;
  new.user_id := old.user_id;
  new.organization_id := old.organization_id;
  new.role := old.role;
  new.status := old.status;
  new.email := old.email;
  return new;
end $$;

create trigger partner_members_self_update_guard_trg
before update on public.partner_members
for each row execute function public.partner_members_self_update_guard();

create policy "members update their own profile"
on public.partner_members
for update
to authenticated
using (user_id = auth.uid() and status = 'active')
with check (user_id = auth.uid());