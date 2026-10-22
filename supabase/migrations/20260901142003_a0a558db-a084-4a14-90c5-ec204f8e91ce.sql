create table public.partner_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  organization_id uuid references public.partner_organizations(id) on delete cascade,
  application_updates boolean not null default true,
  commission_updates boolean not null default true,
  missing_information boolean not null default true,
  training_updates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

grant select, insert, update, delete on public.partner_notification_preferences to authenticated;
grant all on public.partner_notification_preferences to service_role;

alter table public.partner_notification_preferences enable row level security;

create policy "Members manage their own notification preferences"
on public.partner_notification_preferences
for all
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (organization_id is null or organization_id = public.current_partner_org())
);

create policy "Magenta staff can read notification preferences"
on public.partner_notification_preferences
for select
to authenticated
using (public.is_internal_user());

create trigger partner_notification_preferences_touch_updated_at
before update on public.partner_notification_preferences
for each row execute function public.touch_updated_at();