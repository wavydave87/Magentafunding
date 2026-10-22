
-- ============ Phase 3: internal pipeline controls + automation ============

-- 1. Internal status transitions -------------------------------------------
create or replace function public.partner_set_application_status(
  _application_id uuid,
  _status public.partner_application_status,
  _note text default null,
  _approved_amount numeric default null,
  _funded_amount numeric default null,
  _funded_at date default null,
  _missing_items text[] default null
)
returns public.partner_applications
language plpgsql
security definer
set search_path to 'public'
as $$
declare app public.partner_applications;
begin
  if not public.is_internal_user() then
    raise exception 'Only Magenta staff can change an application status.' using errcode = '42501';
  end if;

  perform set_config('magenta.trusted_partner_op', '1', true);

  update public.partner_applications a
     set status = _status,
         approved_amount = coalesce(_approved_amount, a.approved_amount),
         funded_amount = case when _status = 'funded'
                              then coalesce(_funded_amount, a.funded_amount, a.approved_amount)
                              else coalesce(_funded_amount, a.funded_amount) end,
         funded_at = case when _status = 'funded'
                          then coalesce(_funded_at, a.funded_at, current_date)
                          else a.funded_at end,
         missing_items = case when _status = 'missing_information'
                              then coalesce(_missing_items, a.missing_items)
                              else a.missing_items end
   where a.id = _application_id
  returning * into app;

  if app.id is null then
    raise exception 'Application not found.' using errcode = '42501';
  end if;

  insert into public.partner_application_events
    (application_id, event_type, title, description, visibility, created_by)
  values (_application_id, 'status_change',
          replace(initcap(replace(_status::text, '_', ' ')), '  ', ' '),
          coalesce(nullif(btrim(_note), ''), 'Status updated by the Magenta team.'),
          'partner', auth.uid());

  perform set_config('magenta.trusted_partner_op', '0', true);
  return app;
end $$;

revoke all on function public.partner_set_application_status(uuid, public.partner_application_status, text, numeric, numeric, date, text[]) from public, anon;
grant execute on function public.partner_set_application_status(uuid, public.partner_application_status, text, numeric, numeric, date, text[]) to authenticated;

-- 2. Create a linked deal from an application ------------------------------
create or replace function public.partner_create_deal_from_application(_application_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  app public.partner_applications;
  _rep uuid;
  _deal uuid;
  _amount numeric;
begin
  if not public.is_internal_user() then
    raise exception 'Only Magenta staff can create a deal.' using errcode = '42501';
  end if;

  select * into app from public.partner_applications where id = _application_id;
  if not found then
    raise exception 'Application not found.' using errcode = '42501';
  end if;
  if app.linked_deal_id is not null then
    return app.linked_deal_id;
  end if;

  select coalesce(
    app.assigned_rep_id,
    (select o.assigned_rep_id from public.partner_organizations o where o.id = app.organization_id),
    (select r.id from public.rep_profiles r where r.id = auth.uid()),
    (select r.id from public.rep_profiles r order by r.created_at limit 1)
  ) into _rep;

  if _rep is null then
    raise exception 'No Magenta rep is available to own this deal.' using errcode = '22023';
  end if;

  _amount := coalesce(app.approved_amount, app.requested_amount, 50000);

  insert into public.deals (
    rep_id, merchant_name, merchant_email, merchant_phone, expiration_date,
    buy_rate, upsell_points, min_funded, max_funded, term_days,
    allow_weekly, origination_fee_percent, other_fees, pif_enabled, status,
    funding_window_start, funding_window_end
  ) values (
    _rep, app.legal_business_name, app.contact_email, app.contact_phone,
    current_date + 14, 1.30, 4,
    greatest(round(_amount * 0.5), 5000), round(_amount), 150,
    true, 5, 0, true, 'draft',
    current_date + 2, current_date + 21
  ) returning id into _deal;

  insert into public.deal_presets (deal_id, label, amount, sort_order)
  values (_deal, 'Conservative', greatest(round(_amount * 0.5), 5000), 1),
         (_deal, 'Recommended', round(_amount * 0.75), 2),
         (_deal, 'Maximum', round(_amount), 3);

  perform set_config('magenta.trusted_partner_op', '1', true);
  update public.partner_applications set linked_deal_id = _deal where id = _application_id;

  insert into public.partner_application_events
    (application_id, event_type, title, description, visibility, created_by)
  values (_application_id, 'offer', 'Offer Being Prepared',
          'Magenta started building an offer for this application.', 'partner', auth.uid());
  perform set_config('magenta.trusted_partner_op', '0', true);

  return _deal;
end $$;

revoke all on function public.partner_create_deal_from_application(uuid) from public, anon;
grant execute on function public.partner_create_deal_from_application(uuid) to authenticated;

-- 3. Automation: linked deal funded -> application funded ------------------
create or replace function public.partner_deal_funded_sync()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare app public.partner_applications;
begin
  if new.status = 'funded' and (tg_op = 'INSERT' or old.status is distinct from 'funded') then
    select * into app from public.partner_applications where linked_deal_id = new.id;
    if found and app.status <> 'funded' then
      perform set_config('magenta.trusted_partner_op', '1', true);
      update public.partner_applications
         set status = 'funded',
             funded_amount = coalesce(funded_amount, approved_amount,
               (select a.accepted_amount from public.deal_acceptances a where a.deal_id = new.id limit 1)),
             funded_at = coalesce(funded_at, current_date)
       where id = app.id;
      insert into public.partner_application_events
        (application_id, event_type, title, description, visibility)
      values (app.id, 'funded', 'Funded',
              'The linked deal was funded. Your commission has been created.', 'partner');
      perform set_config('magenta.trusted_partner_op', '0', true);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists partner_deal_funded_sync_trg on public.deals;
create trigger partner_deal_funded_sync_trg
after insert or update on public.deals
for each row execute function public.partner_deal_funded_sync();

-- 4. Automation: merchant accepts an offer -> partner notified -------------
create or replace function public.partner_deal_accepted_notify()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare app public.partner_applications; m record;
begin
  select * into app from public.partner_applications where linked_deal_id = new.deal_id;
  if not found then return new; end if;

  insert into public.partner_application_events
    (application_id, event_type, title, description, visibility)
  values (app.id, 'offer_accepted', 'Merchant Accepted The Offer',
          'The merchant accepted an offer of $' || to_char(new.accepted_amount, 'FM999999990') || '.',
          'partner');

  for m in select user_id from public.partner_members
            where organization_id = app.organization_id and status = 'active' loop
    perform public.partner_notify(m.user_id, 'application', 'Merchant Accepted The Offer',
      app.legal_business_name || ' accepted an offer of $' || to_char(new.accepted_amount, 'FM999999990') || '.',
      '/partner/applications/' || app.id::text, app.organization_id);
  end loop;
  return new;
end $$;

drop trigger if exists partner_deal_accepted_notify_trg on public.deal_acceptances;
create trigger partner_deal_accepted_notify_trg
after insert on public.deal_acceptances
for each row execute function public.partner_deal_accepted_notify();

-- 5. Admin commission configuration ----------------------------------------
create or replace function public.partner_set_commission_rate(_organization_id uuid, _rate numeric)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only Magenta administrators can change commission rates.' using errcode = '42501';
  end if;
  if _rate is null or _rate < 0 or _rate > 25 then
    raise exception 'Commission rate must be between 0 and 25 percent.' using errcode = '22023';
  end if;
  update public.partner_organizations set commission_rate_percent = _rate where id = _organization_id;
end $$;

revoke all on function public.partner_set_commission_rate(uuid, numeric) from public, anon;
grant execute on function public.partner_set_commission_rate(uuid, numeric) to authenticated;

create or replace function public.partner_override_commission(
  _commission_id uuid,
  _note text,
  _amount numeric default null,
  _rate_percent numeric default null,
  _status public.partner_commission_status default null,
  _payment_reference text default null,
  _paid_at date default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only Magenta administrators can adjust commissions.' using errcode = '42501';
  end if;
  if coalesce(btrim(_note), '') = '' then
    raise exception 'A note is required when adjusting a commission.' using errcode = '22023';
  end if;

  update public.partner_commissions c
     set amount = coalesce(_amount, c.amount),
         rate_percent = coalesce(_rate_percent, c.rate_percent),
         status = coalesce(_status, c.status),
         payment_reference = coalesce(_payment_reference, c.payment_reference),
         paid_at = case when coalesce(_status, c.status) = 'paid'
                        then coalesce(_paid_at, c.paid_at, current_date) else c.paid_at end,
         note = _note
   where c.id = _commission_id;
end $$;

revoke all on function public.partner_override_commission(uuid, text, numeric, numeric, public.partner_commission_status, text, date) from public, anon;
grant execute on function public.partner_override_commission(uuid, text, numeric, numeric, public.partner_commission_status, text, date) to authenticated;

create or replace function public.partner_bulk_commission_status(
  _ids uuid[],
  _status public.partner_commission_status,
  _payment_reference text default null
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare n integer;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only Magenta administrators can update commissions.' using errcode = '42501';
  end if;

  update public.partner_commissions c
     set status = _status,
         paid_at = case when _status = 'paid' then coalesce(c.paid_at, current_date) else c.paid_at end,
         payment_reference = coalesce(nullif(btrim(coalesce(_payment_reference, '')), ''), c.payment_reference)
   where c.id = any(_ids);
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.partner_bulk_commission_status(uuid[], public.partner_commission_status, text) from public, anon;
grant execute on function public.partner_bulk_commission_status(uuid[], public.partner_commission_status, text) to authenticated;
