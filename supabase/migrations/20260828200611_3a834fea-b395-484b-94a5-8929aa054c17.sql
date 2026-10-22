create type public.app_role as enum ('admin','rep');

create table public.rep_profiles (
  id uuid primary key,
  full_name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.rep_profiles to authenticated;
grant all on public.rep_profiles to service_role;
alter table public.rep_profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "reps read own profile" on public.rep_profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "reps update own profile" on public.rep_profiles for update to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.rep_profiles(id) on delete cascade,
  merchant_name text not null,
  expiration_date date not null,
  buy_rate numeric not null,
  upsell_points numeric not null default 0,
  sell_rate numeric generated always as (buy_rate + upsell_points / 100.0) stored,
  min_funded numeric not null,
  max_funded numeric not null,
  term_days integer not null,
  allow_weekly boolean not null default true,
  weekly_rate_increase_points numeric not null default 2,
  origination_fee_percent numeric not null default 5,
  other_fees numeric not null default 0,
  pif_enabled boolean not null default true,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.deals to authenticated;
grant all on public.deals to service_role;
alter table public.deals enable row level security;
create policy "reps manage own deals" on public.deals for all to authenticated
  using (rep_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (rep_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.deal_presets (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  label text not null,
  amount numeric not null,
  sort_order integer not null default 0
);
create table public.pif_tiers (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  label text not null,
  discount_percent numeric not null,
  sort_order integer not null default 0
);
create table public.closing_document_items (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0
);
create table public.deal_acceptances (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  accepted_amount numeric not null,
  frequency text not null,
  computed_payment numeric not null,
  computed_payback numeric not null,
  accepted_at timestamptz not null default now()
);
create table public.uploaded_documents (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_size bigint,
  synced_to_hubspot boolean not null default false,
  uploaded_at timestamptz not null default now()
);

grant select, insert, update, delete on public.deal_presets, public.pif_tiers, public.closing_document_items to authenticated;
grant select, insert, update, delete on public.deal_acceptances, public.uploaded_documents to authenticated;
grant select on public.deal_presets, public.pif_tiers, public.closing_document_items to anon;
grant insert on public.deal_acceptances, public.uploaded_documents to anon;
grant all on public.deal_presets, public.pif_tiers, public.closing_document_items to service_role;
grant all on public.deal_acceptances, public.uploaded_documents to service_role;

alter table public.deal_presets enable row level security;
alter table public.pif_tiers enable row level security;
alter table public.closing_document_items enable row level security;
alter table public.deal_acceptances enable row level security;
alter table public.uploaded_documents enable row level security;

create or replace function public.owns_deal(_deal_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.deals d
    where d.id = _deal_id and (d.rep_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  )
$$;

create or replace function public.deal_is_open(_deal_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.deals d
    where d.id = _deal_id and d.expiration_date >= current_date
  )
$$;

create policy "reps manage own presets" on public.deal_presets for all to authenticated
  using (public.owns_deal(deal_id)) with check (public.owns_deal(deal_id));
create policy "public read presets" on public.deal_presets for select to anon using (true);

create policy "reps manage own tiers" on public.pif_tiers for all to authenticated
  using (public.owns_deal(deal_id)) with check (public.owns_deal(deal_id));
create policy "public read tiers" on public.pif_tiers for select to anon using (true);

create policy "reps manage own checklist" on public.closing_document_items for all to authenticated
  using (public.owns_deal(deal_id)) with check (public.owns_deal(deal_id));
create policy "public read checklist" on public.closing_document_items for select to anon using (true);

create policy "reps read own acceptances" on public.deal_acceptances for select to authenticated
  using (public.owns_deal(deal_id));
create policy "clients record acceptance" on public.deal_acceptances for insert to anon
  with check (public.deal_is_open(deal_id));

create policy "reps read own documents" on public.uploaded_documents for select to authenticated
  using (public.owns_deal(deal_id));
create policy "reps update own documents" on public.uploaded_documents for update to authenticated
  using (public.owns_deal(deal_id)) with check (public.owns_deal(deal_id));
create policy "clients record upload" on public.uploaded_documents for insert to anon
  with check (public.deal_is_open(deal_id));

create view public.public_deal_view as
select
  d.id, d.merchant_name, d.expiration_date, d.sell_rate,
  d.min_funded, d.max_funded, d.term_days,
  d.allow_weekly, d.weekly_rate_increase_points,
  d.origination_fee_percent, d.other_fees, d.pif_enabled, d.status,
  r.full_name as rep_name, r.email as rep_email, r.phone as rep_phone
from public.deals d
join public.rep_profiles r on r.id = d.rep_id;

grant select on public.public_deal_view to anon, authenticated;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
create trigger deals_touch_updated_at before update on public.deals
for each row execute function public.touch_updated_at();