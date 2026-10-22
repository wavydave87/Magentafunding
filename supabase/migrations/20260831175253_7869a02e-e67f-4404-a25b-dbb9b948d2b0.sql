-- ============ ENUMS ============
create type public.partner_type as enum ('iso','referral_partner','strategic_partner');
create type public.partner_org_status as enum ('pending','active','restricted','suspended','inactive');
create type public.partner_member_role as enum ('organization_admin','manager','broker','referral_rep','viewer');
create type public.partner_member_status as enum ('pending','active','inactive');
create type public.partner_application_status as enum (
  'started','submitted','missing_information','under_review','offer_available',
  'approved','contract_requested','contract_sent','contract_signed','funded',
  'declined','duplicate','offer_expired'
);
create type public.partner_event_visibility as enum ('partner','internal');
create type public.partner_document_status as enum ('received','processing','approved','needs_attention');

-- ============ ORGANIZATIONS ============
create table public.partner_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  slug text not null unique,
  partner_type public.partner_type not null default 'iso',
  status public.partner_org_status not null default 'pending',
  primary_contact_name text,
  primary_contact_email text,
  phone text,
  website text,
  assigned_rep_id uuid references public.rep_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.partner_organizations to authenticated;
grant all on public.partner_organizations to service_role;
alter table public.partner_organizations enable row level security;

-- ============ MEMBERS ============
create table public.partner_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.partner_organizations(id) on delete cascade,
  user_id uuid not null,
  full_name text not null,
  email text not null,
  role public.partner_member_role not null default 'broker',
  status public.partner_member_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

grant select, insert, update, delete on public.partner_members to authenticated;
grant all on public.partner_members to service_role;
alter table public.partner_members enable row level security;

-- ============ HELPERS (security definer, avoid RLS recursion) ============
create or replace function public.is_internal_user()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'rep')
$$;

create or replace function public.current_partner_org()
returns uuid language sql stable security definer set search_path = public as $$
  select m.organization_id from public.partner_members m
  where m.user_id = auth.uid() and m.status = 'active'
  limit 1
$$;

create or replace function public.is_partner_org_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.partner_members m
    where m.user_id = auth.uid() and m.status = 'active' and m.role = 'organization_admin'
  )
$$;

-- ============ APPLICATIONS ============
create table public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.partner_organizations(id) on delete cascade,
  created_by uuid,
  assigned_rep_id uuid references public.rep_profiles(id) on delete set null,
  reference text not null unique default 'MP-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  status public.partner_application_status not null default 'started',
  source text not null default 'portal',

  legal_business_name text not null default '',
  dba text,
  business_address text,
  address_2 text,
  city text,
  state text,
  zip text,
  legal_entity text,
  state_incorporated text,
  ein text,
  date_business_started date,
  industry text,
  naics_code text,
  business_description text,
  website text,
  home_based_business boolean not null default false,

  contact_first_name text,
  contact_last_name text,
  contact_email text,
  contact_phone text,

  requested_amount numeric,
  use_of_funds text,
  average_monthly_revenue numeric,
  existing_positions text,
  existing_balances numeric,
  funding_history text,

  banking_connected boolean not null default false,
  banking_provider text,
  banking_reference text,

  approved_amount numeric,
  funded_amount numeric,
  funded_at date,
  commission_amount numeric,
  missing_items text[],
  wizard_step integer not null default 1,

  submitted_at timestamptz,
  linked_deal_id uuid references public.deals(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partner_applications_org_idx on public.partner_applications(organization_id);
create index partner_applications_status_idx on public.partner_applications(status);

grant select, insert, update, delete on public.partner_applications to authenticated;
grant all on public.partner_applications to service_role;
alter table public.partner_applications enable row level security;

create or replace function public.partner_app_org(_application_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select a.organization_id from public.partner_applications a where a.id = _application_id
$$;

-- ============ OWNERS ============
create table public.partner_application_owners (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.partner_applications(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  title text,
  ownership_percent numeric,
  email text,
  phone text,
  date_of_birth date,
  home_address text,
  city text,
  state text,
  zip text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index partner_application_owners_app_idx on public.partner_application_owners(application_id);

grant select, insert, update, delete on public.partner_application_owners to authenticated;
grant all on public.partner_application_owners to service_role;
alter table public.partner_application_owners enable row level security;

-- ============ EVENTS ============
create table public.partner_application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.partner_applications(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  visibility public.partner_event_visibility not null default 'partner',
  created_by uuid,
  created_at timestamptz not null default now()
);
create index partner_application_events_app_idx on public.partner_application_events(application_id);

grant select, insert, update, delete on public.partner_application_events to authenticated;
grant all on public.partner_application_events to service_role;
alter table public.partner_application_events enable row level security;

-- ============ DOCUMENTS ============
create table public.partner_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.partner_applications(id) on delete cascade,
  organization_id uuid not null references public.partner_organizations(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_size bigint,
  document_type text not null default 'other',
  status public.partner_document_status not null default 'received',
  uploaded_by uuid,
  uploaded_at timestamptz not null default now()
);
create index partner_documents_app_idx on public.partner_documents(application_id);

grant select, insert, update, delete on public.partner_documents to authenticated;
grant all on public.partner_documents to service_role;
alter table public.partner_documents enable row level security;

-- ============ POLICIES ============
-- Organizations
create policy "internal read organizations" on public.partner_organizations
  for select to authenticated using (public.is_internal_user());
create policy "admins manage organizations" on public.partner_organizations
  for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "partners read own organization" on public.partner_organizations
  for select to authenticated using (id = public.current_partner_org());

-- Members
create policy "internal read members" on public.partner_members
  for select to authenticated using (public.is_internal_user());
create policy "admins manage members" on public.partner_members
  for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "partners read own org members" on public.partner_members
  for select to authenticated using (organization_id = public.current_partner_org());
create policy "org admins add members" on public.partner_members
  for insert to authenticated
  with check (public.is_partner_org_admin() and organization_id = public.current_partner_org());
create policy "org admins update members" on public.partner_members
  for update to authenticated
  using (public.is_partner_org_admin() and organization_id = public.current_partner_org())
  with check (public.is_partner_org_admin() and organization_id = public.current_partner_org());

-- Applications
create policy "internal read applications" on public.partner_applications
  for select to authenticated using (public.is_internal_user());
create policy "internal update applications" on public.partner_applications
  for update to authenticated using (public.is_internal_user()) with check (public.is_internal_user());
create policy "partners read own applications" on public.partner_applications
  for select to authenticated using (organization_id = public.current_partner_org());
create policy "partners create applications" on public.partner_applications
  for insert to authenticated
  with check (organization_id = public.current_partner_org() and created_by = auth.uid());
create policy "partners update own applications" on public.partner_applications
  for update to authenticated
  using (organization_id = public.current_partner_org() and status in ('started','missing_information'))
  with check (organization_id = public.current_partner_org());

-- Owners
create policy "internal read owners" on public.partner_application_owners
  for select to authenticated using (public.is_internal_user());
create policy "partners manage own owners" on public.partner_application_owners
  for all to authenticated
  using (public.partner_app_org(application_id) = public.current_partner_org())
  with check (public.partner_app_org(application_id) = public.current_partner_org());

-- Events
create policy "internal read events" on public.partner_application_events
  for select to authenticated using (public.is_internal_user());
create policy "internal write events" on public.partner_application_events
  for insert to authenticated with check (public.is_internal_user());
create policy "partners read partner events" on public.partner_application_events
  for select to authenticated
  using (visibility = 'partner' and public.partner_app_org(application_id) = public.current_partner_org());
create policy "partners add partner events" on public.partner_application_events
  for insert to authenticated
  with check (visibility = 'partner' and public.partner_app_org(application_id) = public.current_partner_org());

-- Documents
create policy "internal read documents" on public.partner_documents
  for select to authenticated using (public.is_internal_user());
create policy "internal update documents" on public.partner_documents
  for update to authenticated using (public.is_internal_user()) with check (public.is_internal_user());
create policy "partners read own documents" on public.partner_documents
  for select to authenticated using (organization_id = public.current_partner_org());
create policy "partners add own documents" on public.partner_documents
  for insert to authenticated
  with check (organization_id = public.current_partner_org()
              and public.partner_app_org(application_id) = public.current_partner_org());

-- ============ UPDATED_AT TRIGGERS ============
create trigger partner_organizations_touch_updated_at before update on public.partner_organizations
  for each row execute function public.touch_updated_at();
create trigger partner_members_touch_updated_at before update on public.partner_members
  for each row execute function public.touch_updated_at();
create trigger partner_applications_touch_updated_at before update on public.partner_applications
  for each row execute function public.touch_updated_at();

-- ============ DEMO DATA ============
insert into public.partner_organizations
  (name, legal_name, slug, partner_type, status, primary_contact_name, primary_contact_email, phone, website)
values
  ('Northgate Capital Partners','Northgate Capital Partners LLC','northgate','iso','active','Dana Whitfield','dana@northgatecap.example','(212) 555-0184','https://northgatecap.example'),
  ('Bluestone Referral Group','Bluestone Referral Group Inc.','bluestone','referral_partner','active','Marcus Reyes','marcus@bluestonerg.example','(305) 555-0142','https://bluestonerg.example'),
  ('Harbor Line Advisors','Harbor Line Advisors LLC','harbor-line','strategic_partner','pending','Priya Nandini','priya@harborline.example','(415) 555-0119','https://harborline.example');

do $$
declare
  st public.partner_application_status;
  orgs uuid[];
  i int;
  app_id uuid;
  biz text;
  names text[] := array['Sunrise Auto Care','Copperfield Bakery','Lakeside Dental Group','Ironworks Fitness','Verde Landscaping','Palmetto Freight','Bright Path Learning','Cedar & Co Interiors','Riverstone Plumbing','Blue Harbor Seafood','Tempo Print House','Summit Ridge Roofing','Nova Pet Clinic','Golden Fork Catering','Atlas Auto Body','Willow Creek Florist','Pinnacle IT Services','Coastal Tile Works','Maple Street Diner','Onyx Barber Studio','Radiant Cleaning Co','Trailhead Outfitters','Fern Hollow Nursery','Bayside Marine Repair','Stonebridge Hardware','Lumen Photography','Everlast Sign Shop','Clearwater Pools','Highland Coffee Roasters','Vista Glass Works','Redwood Cabinetry','Silver Line Logistics','Juniper Day Spa','Anchor Point Security','Meridian Staffing','Wildflower Bakery Co','Crescent Tool & Die','Bramble Books','Northside Tire Center'];
  idx int := 1;
begin
  select array_agg(id order by created_at) into orgs from public.partner_organizations;

  foreach st in array enum_range(null::public.partner_application_status) loop
    for i in 1..3 loop
      biz := names[idx];
      idx := idx + 1;
      insert into public.partner_applications (
        organization_id, status, legal_business_name, dba, business_address, city, state, zip,
        legal_entity, state_incorporated, ein, date_business_started, industry, naics_code,
        business_description, website, contact_first_name, contact_last_name, contact_email, contact_phone,
        requested_amount, use_of_funds, average_monthly_revenue, existing_positions, existing_balances,
        approved_amount, funded_amount, funded_at, commission_amount, missing_items,
        submitted_at, wizard_step, created_at
      ) values (
        orgs[((idx + i) % 3) + 1],
        st,
        biz,
        biz,
        (1000 + idx * 7)::text || ' Commerce Way',
        (array['Austin','Tampa','Denver','Columbus','Charlotte','Portland'])[(idx % 6) + 1],
        (array['TX','FL','CO','OH','NC','OR'])[(idx % 6) + 1],
        lpad(((idx * 811) % 89999 + 10000)::text, 5, '0'),
        (array['LLC','S-Corp','C-Corp','Sole Proprietor'])[(idx % 4) + 1],
        (array['TX','FL','CO','OH','NC','OR'])[(idx % 6) + 1],
        '88-' || lpad(((idx * 137) % 9999999)::text, 7, '0'),
        (current_date - ((idx * 97) || ' days')::interval)::date,
        (array['Automotive','Food & Beverage','Healthcare','Fitness','Construction','Professional Services'])[(idx % 6) + 1],
        (array['811111','722511','621210','713940','238220','541611'])[(idx % 6) + 1],
        'Established small business seeking working capital to expand operations.',
        'https://' || lower(replace(replace(biz,' ','-'),'&','and')) || '.example',
        (array['Alex','Jordan','Sam','Taylor','Casey','Morgan'])[(idx % 6) + 1],
        (array['Rivera','Chen','Patel','Okafor','Nguyen','Brooks'])[(idx % 6) + 1],
        'owner' || idx || '@' || lower(replace(replace(biz,' ','-'),'&','and')) || '.example',
        '(555) 01' || lpad((idx % 100)::text, 2, '0') || '-' || lpad((idx * 3 % 10000)::text, 4, '0'),
        (25000 + (idx % 8) * 15000)::numeric,
        (array['Equipment purchase','Inventory','Payroll','Expansion','Marketing','Renovation'])[(idx % 6) + 1],
        (40000 + (idx % 10) * 9000)::numeric,
        case when idx % 3 = 0 then 'One position — Rapid Advance' else 'None' end,
        case when idx % 3 = 0 then (12000 + idx * 250)::numeric else 0 end,
        case when st in ('approved','contract_requested','contract_sent','contract_signed','funded')
             then (20000 + (idx % 6) * 12000)::numeric else null end,
        case when st = 'funded' then (20000 + (idx % 6) * 12000)::numeric else null end,
        case when st = 'funded' then (current_date - ((idx % 21) || ' days')::interval)::date else null end,
        case when st = 'funded' then round((20000 + (idx % 6) * 12000) * 0.06, 2) else null end,
        case when st = 'missing_information'
             then array['Three most recent bank statements','Signed driver''s license','Voided business check']
             else null end,
        case when st = 'started' then null else now() - ((idx % 30) || ' days')::interval end,
        case when st = 'started' then (idx % 5) + 1 else 6 end,
        now() - ((idx % 45) || ' days')::interval
      ) returning id into app_id;

      insert into public.partner_application_owners
        (application_id, first_name, last_name, title, ownership_percent, email, phone, city, state)
      values (
        app_id,
        (array['Alex','Jordan','Sam','Taylor','Casey','Morgan'])[(idx % 6) + 1],
        (array['Rivera','Chen','Patel','Okafor','Nguyen','Brooks'])[(idx % 6) + 1],
        'Owner', 100,
        'owner' || idx || '@' || lower(replace(replace(biz,' ','-'),'&','and')) || '.example',
        '(555) 01' || lpad((idx % 100)::text, 2, '0') || '-' || lpad((idx * 3 % 10000)::text, 4, '0'),
        (array['Austin','Tampa','Denver','Columbus','Charlotte','Portland'])[(idx % 6) + 1],
        (array['TX','FL','CO','OH','NC','OR'])[(idx % 6) + 1]
      );

      if st <> 'started' then
        insert into public.partner_application_events (application_id, event_type, title, description, visibility, created_at)
        values
          (app_id,'submitted','Application Submitted','The application was submitted to Magenta.','partner', now() - ((idx % 30) || ' days')::interval),
          (app_id,'received','Application Received','Magenta received the application and began intake.','partner', now() - ((idx % 30) || ' days')::interval + interval '2 hours'),
          (app_id,'internal_note','Intake Review','Internal underwriting scratch notes.','internal', now() - ((idx % 30) || ' days')::interval + interval '3 hours');
      end if;

      if st = 'missing_information' then
        insert into public.partner_application_events (application_id, event_type, title, description, visibility)
        values (app_id,'missing_information','Additional Information Requested','We need a few more items before underwriting can continue.','partner');
      end if;

      if st in ('under_review','offer_available','approved','contract_requested','contract_sent','contract_signed','funded') then
        insert into public.partner_application_events (application_id, event_type, title, description, visibility)
        values (app_id,'under_review','Application Under Review','Underwriting is reviewing the submitted file.','partner');
      end if;

      if st = 'funded' then
        insert into public.partner_application_events (application_id, event_type, title, description, visibility)
        values (app_id,'funded','Funded','Funds were disbursed to the merchant.','partner');
      end if;
    end loop;
  end loop;
end $$;