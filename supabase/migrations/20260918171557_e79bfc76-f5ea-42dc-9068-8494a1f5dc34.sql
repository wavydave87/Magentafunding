-- =====================================================================
-- Magenta Referral Partner Portal — Phase 1 schema
-- =====================================================================

-- ---------- 1. Enums -------------------------------------------------
create type public.partner_facing_status as enum (
  'referred','application_started','application_incomplete','application_submitted',
  'under_review','additional_information_needed','approved','declined','funded','closed_withdrawn'
);

create type public.merchant_application_state as enum (
  'draft','in_progress','incomplete','submitted','withdrawn'
);

create type public.partner_funding_state as enum (
  'not_funded','scheduled','funded','cancelled'
);

create type public.integration_event_status as enum (
  'pending','processing','succeeded','failed','dead_letter'
);

create type public.merchant_token_kind as enum ('start','resume');

alter type public.partner_commission_status add value if not exists 'scheduled';
alter type public.partner_commission_status add value if not exists 'held';
alter type public.partner_commission_status add value if not exists 'adjusted';

-- ---------- 2. Permanent short codes ---------------------------------
alter table public.partner_organizations
  add column if not exists code text;

alter table public.partner_members
  add column if not exists code text,
  add column if not exists commission_rate_percent numeric;

create unique index if not exists partner_organizations_code_uidx
  on public.partner_organizations (upper(code)) where code is not null;
create unique index if not exists partner_members_code_uidx
  on public.partner_members (upper(code)) where code is not null;

-- Deterministic code convention:
--   organisation: up to 3 letters from the name's initials + 3-digit sequence (SFB001)
--   member:       2 letters from the person's initials + 3-digit sequence from 101 (MR102)
create or replace function public.code_initials(_name text, _len integer)
returns text language sql immutable set search_path to 'public' as $$
  select coalesce(
    nullif(
      upper(substr(regexp_replace(
        (select string_agg(left(w, 1), '') from unnest(regexp_split_to_array(btrim(coalesce(_name,'')), '\s+')) w),
        '[^A-Za-z]', '', 'g'), 1, _len)),
      ''),
    upper(substr(regexp_replace(coalesce(_name,'X'), '[^A-Za-z]', '', 'g') || 'XXX', 1, _len))
  )
$$;

create or replace function public.next_org_code(_name text)
returns text language plpgsql security definer set search_path to 'public' as $$
declare _base text; _n integer := 1; _candidate text;
begin
  _base := public.code_initials(_name, 3);
  loop
    _candidate := _base || lpad(_n::text, 3, '0');
    exit when not exists (
      select 1 from public.partner_organizations o where upper(o.code) = _candidate
    );
    _n := _n + 1;
    if _n > 999 then raise exception 'unable to allocate organization code'; end if;
  end loop;
  return _candidate;
end $$;

create or replace function public.next_member_code(_organization_id uuid, _full_name text)
returns text language plpgsql security definer set search_path to 'public' as $$
declare _base text; _n integer := 101; _candidate text;
begin
  _base := public.code_initials(_full_name, 2);
  loop
    _candidate := _base || lpad(_n::text, 3, '0');
    exit when not exists (
      select 1 from public.partner_members m where upper(m.code) = _candidate
    );
    _n := _n + 1;
    if _n > 999 then raise exception 'unable to allocate member code'; end if;
  end loop;
  return _candidate;
end $$;

create or replace function public.assign_org_code()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.code is null or btrim(new.code) = '' then
    new.code := public.next_org_code(new.name);
  else
    new.code := upper(btrim(new.code));
  end if;
  return new;
end $$;

create or replace function public.assign_member_code()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.code is null or btrim(new.code) = '' then
    new.code := public.next_member_code(new.organization_id, new.full_name);
  else
    new.code := upper(btrim(new.code));
  end if;
  return new;
end $$;

create or replace function public.freeze_referral_code()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if old.code is not null and new.code is distinct from old.code then
    raise exception 'Referral codes are permanent and cannot be changed.' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger partner_organizations_assign_code
  before insert on public.partner_organizations
  for each row execute function public.assign_org_code();
create trigger partner_organizations_freeze_code
  before update on public.partner_organizations
  for each row execute function public.freeze_referral_code();

create trigger partner_members_assign_code
  before insert on public.partner_members
  for each row execute function public.assign_member_code();
create trigger partner_members_freeze_code
  before update on public.partner_members
  for each row execute function public.freeze_referral_code();

-- Backfill existing rows.
do $$
declare r record;
begin
  perform set_config('magenta.trusted_partner_op', '1', true);
  for r in select id, name from public.partner_organizations where code is null order by created_at loop
    update public.partner_organizations set code = public.next_org_code(r.name) where id = r.id;
  end loop;
  alter table public.partner_members disable trigger partner_members_self_update_guard_trg;
  for r in select id, organization_id, full_name from public.partner_members where code is null order by created_at loop
    update public.partner_members set code = public.next_member_code(r.organization_id, r.full_name) where id = r.id;
  end loop;
  alter table public.partner_members enable trigger partner_members_self_update_guard_trg;
  perform set_config('magenta.trusted_partner_op', '0', true);
end $$;

-- ---------- 3. Referral visits (anonymous) ---------------------------
alter table public.partner_referral_visits
  add column if not exists referral_code_used text,
  add column if not exists member_code_used text,
  add column if not exists landed_at timestamptz not null default now(),
  add column if not exists source text,
  add column if not exists campaign text,
  add column if not exists converted_application_id uuid references public.partner_applications(id) on delete set null;

-- ---------- 4. Identified referrals ----------------------------------
create table public.partner_referrals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.partner_organizations(id) on delete cascade,
  member_id uuid references public.partner_members(id) on delete set null,
  visit_id uuid references public.partner_referral_visits(id) on delete set null,
  application_id uuid references public.partner_applications(id) on delete set null,
  merchant_business_name text not null,
  merchant_contact_name text,
  merchant_email text,
  merchant_phone text,
  referral_code_used text,
  member_code_used text,
  origin text not null default 'referral_link',
  note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert on public.partner_referrals to authenticated;
grant all on public.partner_referrals to service_role;
alter table public.partner_referrals enable row level security;

create policy "Internal staff manage referrals" on public.partner_referrals
  for all to authenticated using (public.is_internal_user()) with check (public.is_internal_user());
create policy "Partners read their organization referrals" on public.partner_referrals
  for select to authenticated using (organization_id = public.current_partner_org());
create policy "Partners create referrals for their organization" on public.partner_referrals
  for insert to authenticated with check (organization_id = public.current_partner_org());

create trigger partner_referrals_touch_updated_at
  before update on public.partner_referrals
  for each row execute function public.touch_updated_at();

-- ---------- 5. Application lifecycle states --------------------------
alter table public.partner_applications
  add column if not exists partner_status public.partner_facing_status not null default 'referred',
  add column if not exists application_state public.merchant_application_state not null default 'draft',
  add column if not exists funding_state public.partner_funding_state not null default 'not_funded',
  add column if not exists completion_percent integer not null default 0,
  add column if not exists last_completed_step integer not null default 0,
  add column if not exists started_at timestamptz,
  add column if not exists last_activity_at timestamptz not null default now(),
  add column if not exists abandoned_at timestamptz,
  add column if not exists attributed_organization_id uuid references public.partner_organizations(id) on delete set null,
  add column if not exists attributed_member_id uuid references public.partner_members(id) on delete set null,
  add column if not exists referral_id uuid references public.partner_referrals(id) on delete set null,
  add column if not exists visit_id uuid references public.partner_referral_visits(id) on delete set null;

alter table public.partner_applications disable trigger partner_applications_guard_trg;
update public.partner_applications
   set attributed_organization_id = coalesce(attributed_organization_id, organization_id),
       attributed_member_id = coalesce(attributed_member_id, referred_by_member_id)
 where attributed_organization_id is null or (attributed_member_id is null and referred_by_member_id is not null);
alter table public.partner_applications enable trigger partner_applications_guard_trg;

-- Attribution is immutable once recorded; internal reassignment must not touch it.
create or replace function public.freeze_application_attribution()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if old.attributed_organization_id is not null then
    new.attributed_organization_id := old.attributed_organization_id;
  end if;
  if old.attributed_member_id is not null then
    new.attributed_member_id := old.attributed_member_id;
  end if;
  if old.referral_id is not null then new.referral_id := old.referral_id; end if;
  if old.visit_id is not null then new.visit_id := old.visit_id; end if;
  return new;
end $$;

create trigger partner_applications_freeze_attribution
  before update on public.partner_applications
  for each row execute function public.freeze_application_attribution();

-- ---------- 6. Merchant drafts + opaque access tokens ----------------
create table public.merchant_application_drafts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.partner_applications(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  current_step integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deliberately NO grants to anon or authenticated: merchant drafts are reached
-- only through security-definer token functions and service_role.
grant all on public.merchant_application_drafts to service_role;
alter table public.merchant_application_drafts enable row level security;

create trigger merchant_application_drafts_touch_updated_at
  before update on public.merchant_application_drafts
  for each row execute function public.touch_updated_at();

create table public.merchant_application_tokens (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.partner_applications(id) on delete cascade,
  token_hash text not null unique,
  kind public.merchant_token_kind not null default 'start',
  expires_at timestamptz not null,
  revoked_at timestamptz,
  consumed_at timestamptz,
  rotation_count integer not null default 0,
  rotated_from uuid references public.merchant_application_tokens(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

grant all on public.merchant_application_tokens to service_role;
alter table public.merchant_application_tokens enable row level security;

create index merchant_application_tokens_application_idx
  on public.merchant_application_tokens (application_id, kind);

-- ---------- 7. Status history ----------------------------------------
create table public.partner_application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.partner_applications(id) on delete cascade,
  state_kind text not null check (state_kind in ('application','partner','internal','funding')),
  previous_value text,
  new_value text not null,
  source text not null default 'system'
    check (source in ('merchant','partner','admin','hubspot','system')),
  actor_user_id uuid,
  reason text,
  partner_visible boolean not null default false,
  occurred_at timestamptz not null default now()
);

grant select on public.partner_application_status_history to authenticated;
grant all on public.partner_application_status_history to service_role;
alter table public.partner_application_status_history enable row level security;

create index partner_application_status_history_app_idx
  on public.partner_application_status_history (application_id, occurred_at desc);

create policy "Internal staff read all status history" on public.partner_application_status_history
  for select to authenticated using (public.is_internal_user());
create policy "Partners read partner-visible history" on public.partner_application_status_history
  for select to authenticated using (
    partner_visible
    and public.partner_app_org(application_id) = public.current_partner_org()
  );

-- ---------- 8. Commission rates, overrides, adjustments --------------
alter table public.partner_commissions
  add column if not exists deal_id uuid references public.deals(id) on delete set null,
  add column if not exists rate_source text,
  add column if not exists scheduled_payment_date date,
  add column if not exists funding_event_key text;

update public.partner_commissions c
   set deal_id = a.linked_deal_id
  from public.partner_applications a
 where a.id = c.application_id and c.deal_id is null and a.linked_deal_id is not null;

update public.partner_commissions
   set funding_event_key = coalesce(funding_event_key, application_id::text)
 where funding_event_key is null;

-- Renewals and second fundings must remain possible: uniqueness keys on the
-- funded deal (or the deterministic funding event), never on the application.
alter table public.partner_commissions drop constraint if exists partner_commissions_application_id_key;
create unique index partner_commissions_deal_uidx
  on public.partner_commissions (deal_id) where deal_id is not null;
create unique index partner_commissions_funding_event_uidx
  on public.partner_commissions (application_id, funding_event_key) where deal_id is null;

create table public.partner_deal_commission_overrides (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete cascade,
  application_id uuid references public.partner_applications(id) on delete cascade,
  override_rate_percent numeric not null check (override_rate_percent >= 0 and override_rate_percent <= 25),
  reason text not null check (btrim(reason) <> ''),
  created_by uuid,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid,
  -- An override targets exactly one entity: a deal OR an application, never both.
  constraint partner_commission_override_target_ck check (num_nonnulls(deal_id, application_id) = 1)
);

grant select on public.partner_deal_commission_overrides to authenticated;
grant all on public.partner_deal_commission_overrides to service_role;
alter table public.partner_deal_commission_overrides enable row level security;

create unique index partner_commission_override_active_deal_uidx
  on public.partner_deal_commission_overrides (deal_id) where deal_id is not null and revoked_at is null;
create unique index partner_commission_override_active_app_uidx
  on public.partner_deal_commission_overrides (application_id) where application_id is not null and revoked_at is null;

create policy "Internal staff read commission overrides" on public.partner_deal_commission_overrides
  for select to authenticated using (public.is_internal_user());

create table public.partner_commission_adjustments (
  id uuid primary key default gen_random_uuid(),
  commission_id uuid not null references public.partner_commissions(id) on delete cascade,
  previous_amount numeric,
  previous_rate_percent numeric,
  previous_status public.partner_commission_status,
  new_amount numeric,
  new_rate_percent numeric,
  new_status public.partner_commission_status,
  reason text not null check (btrim(reason) <> ''),
  actor_user_id uuid,
  created_at timestamptz not null default now()
);

grant select on public.partner_commission_adjustments to authenticated;
grant all on public.partner_commission_adjustments to service_role;
alter table public.partner_commission_adjustments enable row level security;

create policy "Internal staff read commission adjustments" on public.partner_commission_adjustments
  for select to authenticated using (public.is_internal_user());
create policy "Partners read adjustments on their commissions" on public.partner_commission_adjustments
  for select to authenticated using (
    exists (
      select 1 from public.partner_commissions c
      where c.id = commission_id and c.organization_id = public.current_partner_org()
    )
  );

-- Deal override -> member rate -> organization rate -> Magenta default (2%).
create or replace function public.resolve_commission_rate(
  _organization_id uuid, _member_id uuid default null, _deal_id uuid default null, _application_id uuid default null
) returns table(rate_percent numeric, rate_source text)
language plpgsql stable security definer set search_path to 'public' as $$
declare _rate numeric;
begin
  select o.override_rate_percent into _rate
    from public.partner_deal_commission_overrides o
   where o.revoked_at is null
     and ((_deal_id is not null and o.deal_id = _deal_id)
       or (_application_id is not null and o.application_id = _application_id))
   order by (o.deal_id is not null) desc, o.created_at desc
   limit 1;
  if _rate is not null then return query select _rate, 'deal_override'::text; return; end if;

  if _member_id is not null then
    select m.commission_rate_percent into _rate from public.partner_members m where m.id = _member_id;
    if _rate is not null then return query select _rate, 'member'::text; return; end if;
  end if;

  select nullif(o.commission_rate_percent, 0) into _rate
    from public.partner_organizations o where o.id = _organization_id;
  if _rate is not null then return query select _rate, 'organization'::text; return; end if;

  return query select 2.0::numeric, 'magenta_default'::text;
end $$;

-- Idempotent commission creation keyed on the funded deal.
create or replace function public.partner_commission_on_funded()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare _rate numeric; _source text; _amount numeric; _deal uuid; _key text;
begin
  if new.status = 'funded' and coalesce(new.funded_amount, 0) > 0
     and (tg_op = 'INSERT' or old.status is distinct from 'funded') then
    _deal := new.linked_deal_id;
    _key := coalesce(_deal::text, new.id::text);

    if exists (
      select 1 from public.partner_commissions c
      where (_deal is not null and c.deal_id = _deal)
         or (_deal is null and c.application_id = new.id and c.funding_event_key = _key)
    ) then
      return new;
    end if;

    select r.rate_percent, r.rate_source into _rate, _source
      from public.resolve_commission_rate(
        new.organization_id, new.attributed_member_id, _deal, new.id) r;

    _amount := round(coalesce(new.funded_amount, 0) * coalesce(_rate, 0) / 100.0, 2);

    insert into public.partner_commissions
      (organization_id, application_id, deal_id, funding_event_key,
       funded_amount, rate_percent, rate_source, amount)
    values (new.organization_id, new.id, _deal, _key,
            new.funded_amount, coalesce(_rate, 0), _source, _amount);
  end if;
  return new;
end $$;

-- ---------- 9. Integration events ------------------------------------
create table public.integration_events (
  id uuid primary key default gen_random_uuid(),
  source_system text not null default 'hubspot',
  direction text not null check (direction in ('inbound','outbound')),
  event_type text not null,
  idempotency_key text not null,
  external_id text,
  application_id uuid references public.partner_applications(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  status public.integration_event_status not null default 'pending',
  attempts integer not null default 0,
  next_retry_at timestamptz,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_events_idempotency_uk unique (source_system, direction, idempotency_key)
);

grant select on public.integration_events to authenticated;
grant all on public.integration_events to service_role;
alter table public.integration_events enable row level security;

create index integration_events_retry_idx
  on public.integration_events (status, next_retry_at) where status in ('pending','failed');

create policy "Admins read integration events" on public.integration_events
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger integration_events_touch_updated_at
  before update on public.integration_events
  for each row execute function public.touch_updated_at();

-- ---------- 10. Admin audit log --------------------------------------
create table public.partner_admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);

grant select on public.partner_admin_audit_log to authenticated;
grant all on public.partner_admin_audit_log to service_role;
alter table public.partner_admin_audit_log enable row level security;

create index partner_admin_audit_log_entity_idx
  on public.partner_admin_audit_log (entity_type, entity_id, created_at desc);

create policy "Admins read the audit log" on public.partner_admin_audit_log
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ---------- 11. Server-side referral code resolution -----------------
create or replace function public.resolve_referral_codes(_org_code text, _user_code text default null)
returns table(organization_id uuid, member_id uuid, organization_name text,
              organization_code text, member_code text, member_name text)
language plpgsql stable security definer set search_path to 'public' as $$
declare _org public.partner_organizations; _member public.partner_members;
begin
  select * into _org from public.partner_organizations o
   where upper(o.code) = upper(btrim(coalesce(_org_code, '')))
     and o.status = 'active' and o.referral_link_enabled;

  if _org.id is null and _user_code is not null then
    -- Derive the organization from the member when only a user code resolves.
    select * into _member from public.partner_members m
     where upper(m.code) = upper(btrim(_user_code));
    if _member.id is not null then
      select * into _org from public.partner_organizations o where o.id = _member.organization_id;
    end if;
  end if;

  if _org.id is null then return; end if;

  if _user_code is not null and _member.id is null then
    select * into _member from public.partner_members m
     where upper(m.code) = upper(btrim(_user_code)) and m.organization_id = _org.id;
  end if;

  -- A user code belonging to a different organization is rejected outright.
  if _user_code is not null and (_member.id is null or _member.organization_id <> _org.id) then
    return;
  end if;

  return query select _org.id, _member.id, _org.name, _org.code, _member.code, _member.full_name;
end $$;

revoke all on function public.next_org_code(text) from public, anon, authenticated;
revoke all on function public.next_member_code(uuid, text) from public, anon, authenticated;
revoke all on function public.resolve_commission_rate(uuid, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.resolve_referral_codes(text, text) to anon, authenticated, service_role;