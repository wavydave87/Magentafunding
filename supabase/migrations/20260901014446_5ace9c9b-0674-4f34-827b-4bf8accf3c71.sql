-- ============ enums ============
create type public.partner_commission_status as enum ('pending','approved','paid','void');
create type public.partner_ticket_status as enum ('open','awaiting_partner','awaiting_magenta','resolved','closed');
create type public.partner_resource_kind as enum ('file','link');
create type public.partner_module_kind as enum ('video','document','link');

-- ============ org + application additions ============
alter table public.partner_organizations
  add column if not exists commission_rate_percent numeric not null default 0,
  add column if not exists referral_link_enabled boolean not null default true;

alter table public.partner_applications
  add column if not exists referred_by_member_id uuid references public.partner_members(id) on delete set null;

-- ============ helpers ============
create or replace function public.current_partner_member_id()
returns uuid language sql stable security definer set search_path to 'public' as $$
  select m.id from public.partner_members m
  where m.user_id = auth.uid() and m.status = 'active' limit 1
$$;

create or replace function public.is_partner_member()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.current_partner_org() is not null
$$;

-- ============ notifications ============
create table public.partner_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  organization_id uuid references public.partner_organizations(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index partner_notifications_user_idx on public.partner_notifications (user_id, created_at desc);
grant select, update on public.partner_notifications to authenticated;
grant all on public.partner_notifications to service_role;
alter table public.partner_notifications enable row level security;
create policy "read own notifications" on public.partner_notifications
  for select to authenticated using (user_id = auth.uid());
create policy "mark own notifications read" on public.partner_notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.partner_notify(
  _user_id uuid, _kind text, _title text, _body text, _link_path text,
  _organization_id uuid default null
) returns void language sql security definer set search_path to 'public' as $$
  insert into public.partner_notifications (user_id, organization_id, kind, title, body, link_path)
  values (_user_id, _organization_id, _kind, _title, _body, _link_path)
$$;

-- ============ commissions ============
create table public.partner_commissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.partner_organizations(id) on delete cascade,
  application_id uuid not null references public.partner_applications(id) on delete cascade,
  funded_amount numeric not null default 0,
  rate_percent numeric not null default 0,
  amount numeric not null default 0,
  status public.partner_commission_status not null default 'pending',
  paid_at date,
  payment_reference text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id)
);
create index partner_commissions_org_idx on public.partner_commissions (organization_id, created_at desc);
grant select on public.partner_commissions to authenticated;
grant insert, update, delete on public.partner_commissions to authenticated;
grant all on public.partner_commissions to service_role;
alter table public.partner_commissions enable row level security;
create policy "partners read own commissions" on public.partner_commissions
  for select to authenticated using (organization_id = public.current_partner_org());
create policy "internal read commissions" on public.partner_commissions
  for select to authenticated using (public.is_internal_user());
create policy "internal write commissions" on public.partner_commissions
  for insert to authenticated with check (public.is_internal_user());
create policy "internal update commissions" on public.partner_commissions
  for update to authenticated using (public.is_internal_user()) with check (public.is_internal_user());
create trigger partner_commissions_touch_updated_at before update on public.partner_commissions
  for each row execute function public.touch_updated_at();

-- auto-create the commission record when an application is funded
create or replace function public.partner_commission_on_funded()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  _rate numeric;
  _amount numeric;
begin
  if new.status = 'funded' and coalesce(new.funded_amount,0) > 0
     and (tg_op = 'INSERT' or old.status is distinct from 'funded') then
    select commission_rate_percent into _rate from public.partner_organizations where id = new.organization_id;
    _amount := round(coalesce(new.funded_amount,0) * coalesce(_rate,0) / 100.0, 2);
    insert into public.partner_commissions (organization_id, application_id, funded_amount, rate_percent, amount)
    values (new.organization_id, new.id, new.funded_amount, coalesce(_rate,0), _amount)
    on conflict (application_id) do update
      set funded_amount = excluded.funded_amount,
          rate_percent = excluded.rate_percent,
          amount = excluded.amount
      where public.partner_commissions.status = 'pending';
  end if;
  return new;
end $$;
create trigger partner_commission_on_funded_trg after insert or update on public.partner_applications
  for each row execute function public.partner_commission_on_funded();

-- notify partners on status change
create or replace function public.partner_application_notify()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare m record;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;
  for m in select user_id from public.partner_members
            where organization_id = new.organization_id and status = 'active' loop
    perform public.partner_notify(
      m.user_id, 'application',
      new.legal_business_name || ' — ' || replace(initcap(replace(new.status::text,'_',' ')),'  ',' '),
      'Application ' || new.reference || ' is now ' || replace(new.status::text,'_',' ') || '.',
      '/partner/applications/' || new.id::text, new.organization_id);
  end loop;
  return new;
end $$;
create trigger partner_application_notify_trg after insert or update on public.partner_applications
  for each row execute function public.partner_application_notify();

-- ============ referral visits ============
create table public.partner_referral_visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.partner_organizations(id) on delete cascade,
  member_id uuid references public.partner_members(id) on delete set null,
  visitor_id text,
  created_at timestamptz not null default now()
);
create index partner_referral_visits_org_idx on public.partner_referral_visits (organization_id, created_at desc);
grant select on public.partner_referral_visits to authenticated;
grant all on public.partner_referral_visits to service_role;
alter table public.partner_referral_visits enable row level security;
create policy "partners read own visits" on public.partner_referral_visits
  for select to authenticated using (organization_id = public.current_partner_org());
create policy "internal read visits" on public.partner_referral_visits
  for select to authenticated using (public.is_internal_user());

create or replace function public.record_referral_visit(_slug text, _member_ref text default null, _visitor_id text default null)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare _org uuid; _member uuid;
begin
  select id into _org from public.partner_organizations
   where slug = _slug and status = 'active' and referral_link_enabled;
  if _org is null then return false; end if;
  if _member_ref is not null then
    select id into _member from public.partner_members
     where organization_id = _org and id::text = _member_ref and status = 'active';
  end if;
  if _visitor_id is not null and exists (
    select 1 from public.partner_referral_visits v
    where v.organization_id = _org and v.visitor_id = _visitor_id
      and v.created_at > now() - interval '30 minutes') then
    return false;
  end if;
  insert into public.partner_referral_visits (organization_id, member_id, visitor_id)
  values (_org, _member, left(coalesce(_visitor_id,''), 100));
  return true;
end $$;

create or replace function public.submit_referral_application(
  _slug text, _member_ref text, _legal_business_name text, _contact_first_name text,
  _contact_last_name text, _contact_email text, _contact_phone text,
  _requested_amount numeric, _use_of_funds text, _average_monthly_revenue numeric default null
) returns text language plpgsql security definer set search_path to 'public' as $$
declare _org uuid; _member uuid; _ref text; _id uuid;
begin
  select id into _org from public.partner_organizations
   where slug = _slug and status = 'active' and referral_link_enabled;
  if _org is null then raise exception 'This referral link is not active.' using errcode = '42501'; end if;

  if coalesce(btrim(_legal_business_name),'') = '' then raise exception 'Business name is required.' using errcode='22023'; end if;
  if coalesce(_contact_email,'') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid email is required.' using errcode='22023'; end if;
  if length(regexp_replace(coalesce(_contact_phone,''),'[^0-9]','','g')) < 10 then
    raise exception 'A valid phone number is required.' using errcode='22023'; end if;

  if (select count(*) from public.partner_applications
      where organization_id = _org and source = 'referral_link'
        and created_at > now() - interval '1 hour') >= 25 then
    raise exception 'Too many submissions right now. Please try again later.' using errcode='42501';
  end if;

  if _member_ref is not null then
    select id into _member from public.partner_members
     where organization_id = _org and id::text = _member_ref and status = 'active';
  end if;

  _ref := 'MP-' || upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 8));

  perform set_config('magenta.trusted_partner_op','1', true);
  insert into public.partner_applications (
    organization_id, reference, status, source, legal_business_name,
    contact_first_name, contact_last_name, contact_email, contact_phone,
    requested_amount, use_of_funds, average_monthly_revenue, referred_by_member_id,
    submitted_at, wizard_step
  ) values (
    _org, _ref, 'submitted', 'referral_link', btrim(_legal_business_name),
    nullif(btrim(coalesce(_contact_first_name,'')),''), nullif(btrim(coalesce(_contact_last_name,'')),''),
    lower(btrim(_contact_email)), _contact_phone,
    _requested_amount, nullif(btrim(coalesce(_use_of_funds,'')),''), _average_monthly_revenue, _member,
    now(), 6
  ) returning id into _id;

  insert into public.partner_application_events (application_id, event_type, title, description, visibility)
  values (_id, 'submitted', 'Submitted Through Referral Link',
          'A merchant submitted this application through the partner referral link.', 'partner');
  perform set_config('magenta.trusted_partner_op','0', true);

  return _ref;
end $$;

revoke execute on function public.partner_notify(uuid,text,text,text,text,uuid) from public, anon, authenticated;
grant execute on function public.record_referral_visit(text,text,text) to anon, authenticated;
grant execute on function public.submit_referral_application(text,text,text,text,text,text,text,numeric,text,numeric) to anon, authenticated;

-- ============ resources ============
create table public.partner_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'General',
  kind public.partner_resource_kind not null default 'link',
  link_url text,
  storage_path text,
  file_name text,
  file_size bigint,
  audience public.partner_type,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.partner_resources to authenticated;
grant insert, update, delete on public.partner_resources to authenticated;
grant all on public.partner_resources to service_role;
alter table public.partner_resources enable row level security;
create policy "partners read published resources" on public.partner_resources
  for select to authenticated using (
    published and public.is_partner_member() and (
      audience is null or audience = (select o.partner_type from public.partner_organizations o where o.id = public.current_partner_org())
    ));
create policy "internal read resources" on public.partner_resources
  for select to authenticated using (public.is_internal_user());
create policy "admins manage resources" on public.partner_resources
  for all to authenticated using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
create trigger partner_resources_touch before update on public.partner_resources
  for each row execute function public.touch_updated_at();

-- ============ training ============
create table public.partner_trainings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'General',
  audience public.partner_type,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.partner_trainings to authenticated;
grant insert, update, delete on public.partner_trainings to authenticated;
grant all on public.partner_trainings to service_role;
alter table public.partner_trainings enable row level security;
create policy "partners read published trainings" on public.partner_trainings
  for select to authenticated using (
    published and public.is_partner_member() and (
      audience is null or audience = (select o.partner_type from public.partner_organizations o where o.id = public.current_partner_org())
    ));
create policy "internal read trainings" on public.partner_trainings
  for select to authenticated using (public.is_internal_user());
create policy "admins manage trainings" on public.partner_trainings
  for all to authenticated using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
create trigger partner_trainings_touch before update on public.partner_trainings
  for each row execute function public.touch_updated_at();

create table public.partner_training_modules (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.partner_trainings(id) on delete cascade,
  title text not null,
  description text,
  kind public.partner_module_kind not null default 'document',
  content_url text,
  duration_minutes integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index partner_training_modules_training_idx on public.partner_training_modules (training_id, sort_order);
grant select on public.partner_training_modules to authenticated;
grant insert, update, delete on public.partner_training_modules to authenticated;
grant all on public.partner_training_modules to service_role;
alter table public.partner_training_modules enable row level security;
create policy "read modules of readable trainings" on public.partner_training_modules
  for select to authenticated using (
    exists (select 1 from public.partner_trainings t where t.id = training_id));
create policy "admins manage modules" on public.partner_training_modules
  for all to authenticated using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

create table public.partner_training_progress (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.partner_training_modules(id) on delete cascade,
  member_id uuid not null references public.partner_members(id) on delete cascade,
  organization_id uuid not null references public.partner_organizations(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (module_id, member_id)
);
grant select, insert, delete on public.partner_training_progress to authenticated;
grant all on public.partner_training_progress to service_role;
alter table public.partner_training_progress enable row level security;
create policy "partners read org progress" on public.partner_training_progress
  for select to authenticated using (organization_id = public.current_partner_org());
create policy "internal read progress" on public.partner_training_progress
  for select to authenticated using (public.is_internal_user());
create policy "members record own progress" on public.partner_training_progress
  for insert to authenticated with check (
    member_id = public.current_partner_member_id() and organization_id = public.current_partner_org());
create policy "members clear own progress" on public.partner_training_progress
  for delete to authenticated using (member_id = public.current_partner_member_id());

-- ============ support ============
create table public.partner_support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.partner_organizations(id) on delete cascade,
  created_by_member_id uuid references public.partner_members(id) on delete set null,
  created_by uuid,
  reference text not null default ('TKT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  subject text not null,
  category text not null default 'General',
  status public.partner_ticket_status not null default 'open',
  assigned_rep_id uuid references public.rep_profiles(id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index partner_support_tickets_org_idx on public.partner_support_tickets (organization_id, last_message_at desc);
grant select, insert on public.partner_support_tickets to authenticated;
grant update on public.partner_support_tickets to authenticated;
grant all on public.partner_support_tickets to service_role;
alter table public.partner_support_tickets enable row level security;
create policy "partners read own tickets" on public.partner_support_tickets
  for select to authenticated using (organization_id = public.current_partner_org());
create policy "internal read tickets" on public.partner_support_tickets
  for select to authenticated using (public.is_internal_user());
create policy "partners open tickets" on public.partner_support_tickets
  for insert to authenticated with check (
    organization_id = public.current_partner_org() and created_by = auth.uid() and status = 'open');
create policy "internal update tickets" on public.partner_support_tickets
  for update to authenticated using (public.is_internal_user()) with check (public.is_internal_user());
create trigger partner_support_tickets_touch before update on public.partner_support_tickets
  for each row execute function public.touch_updated_at();

create table public.partner_support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.partner_support_tickets(id) on delete cascade,
  organization_id uuid not null references public.partner_organizations(id) on delete cascade,
  author_user_id uuid,
  author_name text not null,
  author_kind text not null check (author_kind in ('partner','internal')),
  body text not null,
  created_at timestamptz not null default now()
);
create index partner_support_messages_ticket_idx on public.partner_support_messages (ticket_id, created_at);
grant select, insert on public.partner_support_messages to authenticated;
grant all on public.partner_support_messages to service_role;
alter table public.partner_support_messages enable row level security;
create policy "partners read own ticket messages" on public.partner_support_messages
  for select to authenticated using (organization_id = public.current_partner_org());
create policy "internal read ticket messages" on public.partner_support_messages
  for select to authenticated using (public.is_internal_user());
create policy "partners post messages" on public.partner_support_messages
  for insert to authenticated with check (
    organization_id = public.current_partner_org() and author_user_id = auth.uid() and author_kind = 'partner');
create policy "internal post messages" on public.partner_support_messages
  for insert to authenticated with check (public.is_internal_user() and author_user_id = auth.uid() and author_kind = 'internal');

create or replace function public.partner_ticket_message_after()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare t record; m record;
begin
  select * into t from public.partner_support_tickets where id = new.ticket_id;
  update public.partner_support_tickets
     set last_message_at = now(),
         status = case when new.author_kind = 'partner' then 'awaiting_magenta'::public.partner_ticket_status
                       else 'awaiting_partner'::public.partner_ticket_status end
   where id = new.ticket_id and status not in ('resolved','closed');

  if new.author_kind = 'internal' then
    for m in select user_id from public.partner_members
              where organization_id = t.organization_id and status = 'active' loop
      perform public.partner_notify(m.user_id, 'support', 'Magenta Replied To Your Ticket',
        t.subject, '/partner/support/' || t.id::text, t.organization_id);
    end loop;
  else
    for m in select user_id from public.user_roles where role in ('admin','rep') loop
      perform public.partner_notify(m.user_id, 'support', 'New Partner Support Message',
        t.subject, '/support/' || t.id::text, t.organization_id);
    end loop;
  end if;
  return new;
end $$;
create trigger partner_ticket_message_after_trg after insert on public.partner_support_messages
  for each row execute function public.partner_ticket_message_after();

create table public.partner_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null default 'General',
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.partner_faqs to authenticated;
grant insert, update, delete on public.partner_faqs to authenticated;
grant all on public.partner_faqs to service_role;
alter table public.partner_faqs enable row level security;
create policy "authenticated read published faqs" on public.partner_faqs
  for select to authenticated using (published or has_role(auth.uid(),'admin'));
create policy "admins manage faqs" on public.partner_faqs
  for all to authenticated using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
create trigger partner_faqs_touch before update on public.partner_faqs
  for each row execute function public.touch_updated_at();

-- commission paid notification
create or replace function public.partner_commission_notify()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare m record;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    for m in select user_id from public.partner_members
              where organization_id = new.organization_id and status = 'active'
                and role in ('organization_admin','manager') loop
      perform public.partner_notify(m.user_id, 'commission', 'Commission Paid',
        'A commission payment of $' || to_char(new.amount,'FM999999990.00') || ' was recorded.',
        '/partner/commissions', new.organization_id);
    end loop;
  end if;
  return new;
end $$;
create trigger partner_commission_notify_trg after update on public.partner_commissions
  for each row execute function public.partner_commission_notify();
