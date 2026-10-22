drop function if exists public.start_merchant_application(text, text, uuid, text, text, text, text, text);

create or replace function public.start_merchant_application(
  _org_code text,
  _legal_business_name text,
  _contact_first_name text,
  _contact_last_name text,
  _contact_email text,
  _contact_phone text,
  _user_code text default null,
  _visit_id uuid default null)
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
  if _visit_id is not null then
    update public.partner_referral_visits set converted_application_id = _app where id = _visit_id;
  end if;

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

grant execute on function public.start_merchant_application(text, text, text, text, text, text, text, uuid) to anon, authenticated, service_role;