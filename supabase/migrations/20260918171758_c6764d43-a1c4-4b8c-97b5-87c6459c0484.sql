-- ---------------------------------------------------------------
-- Merchant application: opaque tokens, no application IDs in URLs
-- ---------------------------------------------------------------
create or replace function public.hash_merchant_token(_token text)
returns text language sql immutable set search_path to 'public' as $$
  select encode(extensions.digest(coalesce(_token,''), 'sha256'), 'hex')
$$;
revoke all on function public.hash_merchant_token(text) from public, anon, authenticated;

create or replace function public.issue_merchant_token(
  _application_id uuid, _kind public.merchant_token_kind, _ttl interval, _rotated_from uuid default null)
returns text language plpgsql security definer set search_path to 'public' as $$
declare _raw text;
begin
  _raw := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.merchant_application_tokens
    (application_id, token_hash, kind, expires_at, rotated_from,
     rotation_count)
  values (_application_id, public.hash_merchant_token(_raw), _kind, now() + _ttl, _rotated_from,
          coalesce((select t.rotation_count + 1 from public.merchant_application_tokens t where t.id = _rotated_from), 0));
  return _raw;
end $$;
revoke all on function public.issue_merchant_token(uuid, public.merchant_token_kind, interval, uuid) from public, anon, authenticated;

create or replace function public.merchant_token_application(_token text, _kind public.merchant_token_kind default 'start')
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare t public.merchant_application_tokens;
begin
  select * into t from public.merchant_application_tokens
   where token_hash = public.hash_merchant_token(_token) and kind = _kind;
  if t.id is null or t.revoked_at is not null or t.consumed_at is not null or t.expires_at < now() then
    return null;
  end if;
  -- Rolling expiry: an active merchant session is never cut off mid-application.
  if _kind = 'start' then
    update public.merchant_application_tokens
       set last_used_at = now(), expires_at = greatest(expires_at, now() + interval '7 days')
     where id = t.id;
  end if;
  return t.application_id;
end $$;
revoke all on function public.merchant_token_application(text, public.merchant_token_kind) from public, anon, authenticated;

-- ---------------------------------------------------------------
-- Landing: privacy-minimal visit record
-- ---------------------------------------------------------------
create or replace function public.record_referral_landing(
  _org_code text, _user_code text default null, _visitor_id text default null,
  _source text default null, _campaign text default null)
returns table(visit_id uuid, organization_name text, member_name text)
language plpgsql security definer set search_path to 'public' as $$
declare r record; _id uuid;
begin
  select * into r from public.resolve_referral_codes(_org_code, _user_code);
  if r.organization_id is null then return; end if;

  select v.id into _id from public.partner_referral_visits v
   where v.organization_id = r.organization_id
     and v.visitor_id is not distinct from nullif(left(coalesce(_visitor_id,''), 100), '')
     and v.created_at > now() - interval '30 minutes'
   limit 1;

  if _id is null then
    insert into public.partner_referral_visits
      (organization_id, member_id, visitor_id, referral_code_used, member_code_used, source, campaign)
    values (r.organization_id, r.member_id, nullif(left(coalesce(_visitor_id,''), 100), ''),
            r.organization_code, r.member_code,
            nullif(left(coalesce(_source,''), 60), ''), nullif(left(coalesce(_campaign,''), 60), ''))
    returning id into _id;
  end if;

  return query select _id, r.organization_name, r.member_name;
end $$;
grant execute on function public.record_referral_landing(text, text, text, text, text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------
-- Start an application
-- ---------------------------------------------------------------
create or replace function public.start_merchant_application(
  _org_code text, _user_code text, _visit_id uuid,
  _legal_business_name text, _contact_first_name text, _contact_last_name text,
  _contact_email text, _contact_phone text)
returns text language plpgsql security definer set search_path to 'public' as $$
declare r record; _app uuid; _ref text; _referral uuid;
begin
  select * into r from public.resolve_referral_codes(_org_code, _user_code);
  if r.organization_id is null then
    raise exception 'This referral link is not active.' using errcode = '42501';
  end if;
  if coalesce(btrim(_legal_business_name), '') = '' then
    raise exception 'Business name is required.' using errcode = '22023';
  end if;
  if coalesce(_contact_email, '') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid email is required.' using errcode = '22023';
  end if;

  if (select count(*) from public.partner_applications
       where organization_id = r.organization_id and source = 'referral_link'
         and created_at > now() - interval '1 hour') >= 40 then
    raise exception 'Too many submissions right now. Please try again later.' using errcode = '42501';
  end if;

  _ref := 'MP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  perform set_config('magenta.trusted_partner_op', '1', true);

  insert into public.partner_applications (
    organization_id, reference, status, source, legal_business_name,
    contact_first_name, contact_last_name, contact_email, contact_phone,
    referred_by_member_id, attributed_organization_id, attributed_member_id, visit_id,
    partner_status, application_state, completion_percent, last_completed_step,
    started_at, last_activity_at, wizard_step
  ) values (
    r.organization_id, _ref, 'started', 'referral_link', btrim(_legal_business_name),
    nullif(btrim(coalesce(_contact_first_name, '')), ''), nullif(btrim(coalesce(_contact_last_name, '')), ''),
    lower(btrim(_contact_email)), nullif(btrim(coalesce(_contact_phone, '')), ''),
    r.member_id, r.organization_id, r.member_id, _visit_id,
    'application_started', 'in_progress', 14, 1, now(), now(), 1
  ) returning id into _app;

  insert into public.partner_referrals (
    organization_id, member_id, visit_id, application_id, merchant_business_name,
    merchant_contact_name, merchant_email, merchant_phone,
    referral_code_used, member_code_used, origin)
  values (r.organization_id, r.member_id, _visit_id, _app, btrim(_legal_business_name),
    nullif(btrim(coalesce(_contact_first_name, '') || ' ' || coalesce(_contact_last_name, '')), ''),
    lower(btrim(_contact_email)), nullif(btrim(coalesce(_contact_phone, '')), ''),
    r.organization_code, r.member_code, 'referral_link')
  returning id into _referral;

  update public.partner_applications set referral_id = _referral where id = _app;
  update public.partner_referral_visits set converted_application_id = _app where id = _visit_id;

  insert into public.merchant_application_drafts (application_id, payload, current_step)
  values (_app, jsonb_build_object(
    'legal_business_name', btrim(_legal_business_name),
    'contact_first_name', _contact_first_name,
    'contact_last_name', _contact_last_name,
    'contact_email', lower(btrim(_contact_email)),
    'contact_phone', _contact_phone), 1);

  insert into public.partner_application_status_history
    (application_id, state_kind, new_value, source, partner_visible, reason)
  values (_app, 'partner', 'application_started', 'merchant', true, 'Merchant started the application.');

  perform set_config('magenta.trusted_partner_op', '0', true);

  return public.issue_merchant_token(_app, 'start', interval '7 days');
end $$;
grant execute on function public.start_merchant_application(text, text, uuid, text, text, text, text, text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------
-- Read / save / submit through the token only
-- ---------------------------------------------------------------
create or replace function public.merchant_get_application(_token text)
returns table(payload jsonb, current_step integer, completion_percent integer,
              reference text, application_state text, submitted boolean)
language plpgsql security definer set search_path to 'public' as $$
declare _app uuid;
begin
  _app := public.merchant_token_application(_token, 'start');
  if _app is null then return; end if;
  return query
    select d.payload, d.current_step, a.completion_percent, a.reference,
           a.application_state::text, a.application_state = 'submitted'
      from public.merchant_application_drafts d
      join public.partner_applications a on a.id = d.application_id
     where d.application_id = _app;
end $$;
grant execute on function public.merchant_get_application(text) to anon, authenticated, service_role;

create or replace function public.merchant_save_step(
  _token text, _step integer, _payload jsonb, _completion_percent integer)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare _app uuid;
begin
  _app := public.merchant_token_application(_token, 'start');
  if _app is null then return false; end if;
  if _step < 1 or _step > 7 then raise exception 'Invalid step.' using errcode = '22023'; end if;

  update public.merchant_application_drafts
     set payload = payload || coalesce(_payload, '{}'::jsonb),
         current_step = greatest(current_step, _step)
   where application_id = _app;

  perform set_config('magenta.trusted_partner_op', '1', true);
  update public.partner_applications
     set completion_percent = greatest(completion_percent, least(greatest(coalesce(_completion_percent, 0), 0), 100)),
         last_completed_step = greatest(last_completed_step, _step),
         last_activity_at = now(),
         abandoned_at = null,
         application_state = case when application_state = 'submitted' then application_state else 'in_progress' end,
         wizard_step = greatest(wizard_step, _step)
   where id = _app;
  perform set_config('magenta.trusted_partner_op', '0', true);
  return true;
end $$;
grant execute on function public.merchant_save_step(text, integer, jsonb, integer) to anon, authenticated, service_role;

create or replace function public.merchant_submit_application(_token text)
returns text language plpgsql security definer set search_path to 'public' as $$
declare _app uuid; _ref text; d public.merchant_application_drafts; p jsonb;
begin
  _app := public.merchant_token_application(_token, 'start');
  if _app is null then raise exception 'This application link has expired.' using errcode = '42501'; end if;

  select * into d from public.merchant_application_drafts where application_id = _app;
  p := coalesce(d.payload, '{}'::jsonb);

  perform set_config('magenta.trusted_partner_op', '1', true);

  update public.partner_applications a
     set legal_business_name = coalesce(nullif(btrim(p->>'legal_business_name'), ''), a.legal_business_name),
         dba = coalesce(nullif(btrim(p->>'dba'), ''), a.dba),
         business_address = coalesce(nullif(btrim(p->>'business_address'), ''), a.business_address),
         city = coalesce(nullif(btrim(p->>'city'), ''), a.city),
         state = coalesce(nullif(btrim(p->>'state'), ''), a.state),
         zip = coalesce(nullif(btrim(p->>'zip'), ''), a.zip),
         legal_entity = coalesce(nullif(btrim(p->>'legal_entity'), ''), a.legal_entity),
         ein = coalesce(nullif(btrim(p->>'ein'), ''), a.ein),
         industry = coalesce(nullif(btrim(p->>'industry'), ''), a.industry),
         website = coalesce(nullif(btrim(p->>'website'), ''), a.website),
         business_description = coalesce(nullif(btrim(p->>'business_description'), ''), a.business_description),
         date_business_started = coalesce((nullif(p->>'date_business_started', ''))::date, a.date_business_started),
         requested_amount = coalesce((nullif(p->>'requested_amount', ''))::numeric, a.requested_amount),
         average_monthly_revenue = coalesce((nullif(p->>'average_monthly_revenue', ''))::numeric, a.average_monthly_revenue),
         use_of_funds = coalesce(nullif(btrim(p->>'use_of_funds'), ''), a.use_of_funds),
         existing_positions = coalesce(nullif(btrim(p->>'existing_positions'), ''), a.existing_positions),
         contact_first_name = coalesce(nullif(btrim(p->>'contact_first_name'), ''), a.contact_first_name),
         contact_last_name = coalesce(nullif(btrim(p->>'contact_last_name'), ''), a.contact_last_name),
         contact_email = coalesce(nullif(btrim(p->>'contact_email'), ''), a.contact_email),
         contact_phone = coalesce(nullif(btrim(p->>'contact_phone'), ''), a.contact_phone),
         status = 'submitted',
         partner_status = 'application_submitted',
         application_state = 'submitted',
         completion_percent = 100,
         last_completed_step = 7,
         wizard_step = 7,
         submitted_at = now(),
         last_activity_at = now()
   where a.id = _app
  returning a.reference into _ref;

  insert into public.partner_application_status_history
    (application_id, state_kind, previous_value, new_value, source, partner_visible, reason)
  values (_app, 'partner', 'application_started', 'application_submitted', 'merchant', true,
          'The merchant submitted the application.');

  insert into public.partner_application_events
    (application_id, event_type, title, description, visibility)
  values (_app, 'submitted', 'Application Submitted',
          'The merchant completed and submitted the application.', 'partner');

  insert into public.integration_events
    (source_system, direction, event_type, idempotency_key, application_id, payload, next_retry_at)
  values ('hubspot', 'outbound', 'application_submitted', _app::text || ':submitted', _app,
          jsonb_build_object('application_id', _app, 'reference', _ref, 'submitted_at', now()), now())
  on conflict (source_system, direction, idempotency_key) do nothing;

  update public.merchant_application_tokens
     set revoked_at = now() where application_id = _app and revoked_at is null;

  perform set_config('magenta.trusted_partner_op', '0', true);
  return _ref;
end $$;
grant execute on function public.merchant_submit_application(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------
-- Resume links: single use, never disturb the live session
-- ---------------------------------------------------------------
create or replace function public.merchant_request_resume_token(_token text)
returns text language plpgsql security definer set search_path to 'public' as $$
declare _app uuid;
begin
  _app := public.merchant_token_application(_token, 'start');
  if _app is null then return null; end if;
  update public.merchant_application_tokens
     set revoked_at = now()
   where application_id = _app and kind = 'resume' and revoked_at is null and consumed_at is null;
  return public.issue_merchant_token(_app, 'resume', interval '3 days');
end $$;
grant execute on function public.merchant_request_resume_token(text) to anon, authenticated, service_role;

create or replace function public.merchant_redeem_resume_token(_token text)
returns text language plpgsql security definer set search_path to 'public' as $$
declare t public.merchant_application_tokens;
begin
  select * into t from public.merchant_application_tokens
   where token_hash = public.hash_merchant_token(_token) and kind = 'resume';
  if t.id is null or t.revoked_at is not null or t.consumed_at is not null or t.expires_at < now() then
    return null;
  end if;
  update public.merchant_application_tokens set consumed_at = now() where id = t.id;
  return public.issue_merchant_token(t.application_id, 'start', interval '7 days', t.id);
end $$;
grant execute on function public.merchant_redeem_resume_token(text) to anon, authenticated, service_role;