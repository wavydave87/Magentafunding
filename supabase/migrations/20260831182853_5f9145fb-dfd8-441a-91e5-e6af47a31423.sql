-- =====================================================================
-- Phase 1 hardening: partner application privilege-escalation fixes
-- =====================================================================

-- ---------- 1. Trusted-operation flag helper ----------
create or replace function public.is_trusted_partner_op()
returns boolean language sql stable set search_path = public as $$
  select coalesce(current_setting('magenta.trusted_partner_op', true), '') = '1'
$$;

revoke all on function public.is_trusted_partner_op() from public, anon;
grant execute on function public.is_trusted_partner_op() to authenticated, service_role;

-- ---------- 2. Application write guard ----------
create or replace function public.partner_applications_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Internal staff and trusted RPCs are unrestricted.
  if public.is_internal_user() or public.is_trusted_partner_op() then
    return new;
  end if;

  -- Everything below only applies to external partner users.
  if old.status not in ('started', 'missing_information') then
    raise exception 'This application can no longer be edited.' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    raise exception 'Partners cannot set application status directly.' using errcode = '42501';
  end if;

  -- Underwriting / funding / routing fields are Magenta-owned.
  new.organization_id  := old.organization_id;
  new.reference        := old.reference;
  new.created_by       := old.created_by;
  new.source           := old.source;
  new.assigned_rep_id  := old.assigned_rep_id;
  new.approved_amount  := old.approved_amount;
  new.funded_amount    := old.funded_amount;
  new.funded_at        := old.funded_at;
  new.commission_amount := old.commission_amount;
  new.missing_items    := old.missing_items;
  new.linked_deal_id   := old.linked_deal_id;
  new.submitted_at     := old.submitted_at;

  return new;
end $$;

drop trigger if exists partner_applications_guard_trg on public.partner_applications;
create trigger partner_applications_guard_trg
  before update on public.partner_applications
  for each row execute function public.partner_applications_guard();

-- Insert guard: partners may only ever create a draft.
create or replace function public.partner_applications_insert_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_internal_user() or public.is_trusted_partner_op() then
    return new;
  end if;
  if new.status <> 'started' then
    raise exception 'New applications must start as a draft.' using errcode = '42501';
  end if;
  new.submitted_at := null;
  new.approved_amount := null;
  new.funded_amount := null;
  new.funded_at := null;
  new.commission_amount := null;
  new.missing_items := null;
  new.linked_deal_id := null;
  new.assigned_rep_id := null;
  return new;
end $$;

drop trigger if exists partner_applications_insert_guard_trg on public.partner_applications;
create trigger partner_applications_insert_guard_trg
  before insert on public.partner_applications
  for each row execute function public.partner_applications_insert_guard();

-- ---------- 3. Tighten application policies ----------
drop policy if exists "partners update own applications" on public.partner_applications;
create policy "partners update editable applications" on public.partner_applications
  for update to authenticated
  using (
    organization_id = public.current_partner_org()
    and status in ('started', 'missing_information')
  )
  with check (
    organization_id = public.current_partner_org()
    and status in ('started', 'missing_information')
  );

drop policy if exists "partners create applications" on public.partner_applications;
create policy "partners create draft applications" on public.partner_applications
  for insert to authenticated
  with check (
    organization_id = public.current_partner_org()
    and created_by = auth.uid()
    and status = 'started'
  );

-- ---------- 4. Owners: only editable during draft / missing info ----------
drop policy if exists "partners manage own owners" on public.partner_application_owners;

create policy "partners read own owners" on public.partner_application_owners
  for select to authenticated
  using (public.partner_app_org(application_id) = public.current_partner_org());

create or replace function public.partner_app_editable(_application_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.partner_applications a
    where a.id = _application_id
      and a.organization_id = public.current_partner_org()
      and a.status in ('started', 'missing_information')
  )
$$;
revoke all on function public.partner_app_editable(uuid) from public, anon;
grant execute on function public.partner_app_editable(uuid) to authenticated, service_role;

create policy "partners add owners while editable" on public.partner_application_owners
  for insert to authenticated
  with check (public.partner_app_editable(application_id));
create policy "partners update owners while editable" on public.partner_application_owners
  for update to authenticated
  using (public.partner_app_editable(application_id))
  with check (public.partner_app_editable(application_id));
create policy "partners remove owners while editable" on public.partner_application_owners
  for delete to authenticated
  using (public.partner_app_editable(application_id));

create policy "internal manage owners" on public.partner_application_owners
  for all to authenticated
  using (public.is_internal_user())
  with check (public.is_internal_user());

-- ---------- 5. Events: partners may never write ----------
drop policy if exists "partners add partner events" on public.partner_application_events;

-- ---------- 6. Documents: only attachable while editable ----------
drop policy if exists "partners add own documents" on public.partner_documents;
create policy "partners add documents while editable" on public.partner_documents
  for insert to authenticated
  with check (
    organization_id = public.current_partner_org()
    and public.partner_app_editable(application_id)
  );

-- ---------- 7. Trusted submission RPC ----------
create or replace function public.submit_partner_application(_application_id uuid)
returns public.partner_applications
language plpgsql security definer set search_path = public as $$
declare
  app public.partner_applications;
  owner_count int;
  total_ownership numeric;
  problems text[] := '{}';
begin
  select * into app from public.partner_applications where id = _application_id;
  if not found then
    raise exception 'Application not found.' using errcode = '42501';
  end if;

  if not public.is_internal_user()
     and app.organization_id is distinct from public.current_partner_org() then
    raise exception 'You do not have access to this application.' using errcode = '42501';
  end if;

  if app.status <> 'started' then
    raise exception 'Only a draft application can be submitted.' using errcode = '42501';
  end if;

  if coalesce(btrim(app.legal_business_name), '') = '' then problems := problems || 'Legal business name'; end if;
  if coalesce(btrim(app.business_address), '') = '' then problems := problems || 'Business address'; end if;
  if coalesce(btrim(app.city), '') = '' then problems := problems || 'City'; end if;
  if coalesce(btrim(app.state), '') = '' then problems := problems || 'State'; end if;
  if coalesce(app.zip, '') !~ '^[0-9]{5}(-[0-9]{4})?$' then problems := problems || 'ZIP code'; end if;
  if coalesce(btrim(app.legal_entity), '') = '' then problems := problems || 'Legal entity'; end if;
  if coalesce(app.ein, '') !~ '^[0-9]{2}-?[0-9]{7}$' then problems := problems || 'EIN'; end if;
  if app.date_business_started is null then problems := problems || 'Business start date'; end if;
  if coalesce(btrim(app.industry), '') = '' then problems := problems || 'Industry'; end if;
  if coalesce(app.requested_amount, 0) <= 0 then problems := problems || 'Requested amount'; end if;
  if coalesce(app.average_monthly_revenue, 0) <= 0 then problems := problems || 'Average monthly revenue'; end if;
  if coalesce(btrim(app.use_of_funds), '') = '' then problems := problems || 'Use of funds'; end if;

  select count(*), coalesce(sum(coalesce(ownership_percent, 0)), 0)
    into owner_count, total_ownership
    from public.partner_application_owners o
   where o.application_id = _application_id;

  if owner_count = 0 then
    problems := problems || 'At least one owner';
  else
    if exists (
      select 1 from public.partner_application_owners o
      where o.application_id = _application_id
        and o.sort_order = (
          select min(sort_order) from public.partner_application_owners
          where application_id = _application_id
        )
        and (
          coalesce(btrim(o.first_name), '') = ''
          or coalesce(btrim(o.last_name), '') = ''
          or coalesce(o.email, '') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
          or coalesce(length(regexp_replace(coalesce(o.phone, ''), '[^0-9]', '', 'g')), 0) < 10
          or coalesce(o.ownership_percent, 0) <= 0
        )
    ) then
      problems := problems || 'Primary owner details';
    end if;
    if total_ownership > 100 then
      problems := problems || 'Total ownership above 100%';
    end if;
  end if;

  if array_length(problems, 1) is not null then
    raise exception 'Application is incomplete: %', array_to_string(problems, ', ')
      using errcode = '22023';
  end if;

  perform set_config('magenta.trusted_partner_op', '1', true);

  update public.partner_applications
     set status = 'submitted',
         submitted_at = now(),
         wizard_step = 6
   where id = _application_id
  returning * into app;

  insert into public.partner_application_events
    (application_id, event_type, title, description, visibility, created_by)
  values
    (_application_id, 'submitted', 'Application Submitted',
     'The application was submitted to Magenta for review.', 'partner', auth.uid());

  perform set_config('magenta.trusted_partner_op', '0', true);

  return app;
end $$;

revoke all on function public.submit_partner_application(uuid) from public, anon;
grant execute on function public.submit_partner_application(uuid) to authenticated, service_role;

-- ---------- 8. Trusted "requested information supplied" RPC ----------
create or replace function public.partner_information_provided(_application_id uuid, _note text default null)
returns public.partner_applications
language plpgsql security definer set search_path = public as $$
declare
  app public.partner_applications;
begin
  select * into app from public.partner_applications where id = _application_id;
  if not found then
    raise exception 'Application not found.' using errcode = '42501';
  end if;

  if not public.is_internal_user()
     and app.organization_id is distinct from public.current_partner_org() then
    raise exception 'You do not have access to this application.' using errcode = '42501';
  end if;

  if app.status <> 'missing_information' then
    raise exception 'This application is not awaiting information.' using errcode = '42501';
  end if;

  perform set_config('magenta.trusted_partner_op', '1', true);

  update public.partner_applications
     set status = 'under_review'
   where id = _application_id
  returning * into app;

  insert into public.partner_application_events
    (application_id, event_type, title, description, visibility, created_by)
  values
    (_application_id, 'information_provided', 'Requested Information Provided',
     coalesce(nullif(btrim(_note), ''), 'The partner supplied the requested information.'),
     'partner', auth.uid());

  perform set_config('magenta.trusted_partner_op', '0', true);

  return app;
end $$;

revoke all on function public.partner_information_provided(uuid, text) from public, anon;
grant execute on function public.partner_information_provided(uuid, text) to authenticated, service_role;