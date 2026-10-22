create or replace function public.ensure_master_admins()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  u record;
  n integer := 0;
begin
  for u in
    select id, email from auth.users
    where lower(email) in (
      'dave@magentafunding.com',
      'tiffanni@magentafunding.com',
      'dario@magentafunding.com'
    )
  loop
    insert into public.rep_profiles (id, full_name, email)
    values (u.id, initcap(split_part(u.email, '@', 1)), u.email)
    on conflict (id) do update set email = excluded.email;

    insert into public.user_roles (user_id, role)
    values (u.id, 'admin'), (u.id, 'rep')
    on conflict (user_id, role) do nothing;

    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.ensure_master_admins() from public, anon, authenticated;

select public.ensure_master_admins();