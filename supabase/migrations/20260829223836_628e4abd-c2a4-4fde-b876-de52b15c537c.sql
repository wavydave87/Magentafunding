alter table public.deals
  add column if not exists merchant_email text,
  add column if not exists merchant_phone text,
  add column if not exists funding_window_start date,
  add column if not exists funding_window_end date;

alter table public.deal_acceptances
  add column if not exists requested_funding_date date;

alter table public.deal_revision_requests
  add column if not exists requested_funding_date date;

-- Public offer view: expose the funding window, never merchant contact details.
drop view if exists public.public_deal_view;
create view public.public_deal_view as
select
  d.id, d.merchant_name, d.expiration_date, d.sell_rate,
  d.min_funded, d.max_funded, d.term_days,
  d.allow_weekly, d.weekly_rate_increase_points,
  d.origination_fee_percent, d.other_fees, d.pif_enabled, d.status,
  d.funding_window_start, d.funding_window_end,
  r.full_name as rep_name, r.email as rep_email, r.phone as rep_phone
from public.deals d
join public.rep_profiles r on r.id = d.rep_id;

alter view public.public_deal_view set (security_invoker = true);
grant select on public.public_deal_view to anon, authenticated;
grant select (funding_window_start, funding_window_end) on public.deals to anon;

-- Acceptance / revision now carry the client's requested funding date.
create or replace function public.accept_offer(
  _deal_id uuid, _amount numeric, _frequency text,
  _payment numeric, _payback numeric, _funding_date date default null
) returns uuid
language plpgsql security definer set search_path to 'public' as $function$
declare
  _acceptance_id uuid;
begin
  if _frequency not in ('daily','weekly') then
    raise exception 'invalid frequency';
  end if;

  if exists (select 1 from public.deal_acceptances a where a.deal_id = _deal_id) then
    raise exception 'this offer has already been accepted';
  end if;

  if not exists (
    select 1 from public.deals d
    where d.id = _deal_id
      and d.expiration_date >= current_date
      and _amount >= d.min_funded
      and _amount <= d.max_funded
  ) then
    raise exception 'offer is not available';
  end if;

  if _funding_date is not null and exists (
    select 1 from public.deals d
    where d.id = _deal_id
      and (
        (d.funding_window_start is not null and _funding_date < d.funding_window_start)
        or (d.funding_window_end is not null and _funding_date > d.funding_window_end)
      )
  ) then
    raise exception 'requested funding date is outside the allowed window';
  end if;

  insert into public.deal_acceptances
    (deal_id, accepted_amount, frequency, computed_payment, computed_payback, requested_funding_date)
  values (_deal_id, _amount, _frequency, _payment, _payback, _funding_date)
  returning id into _acceptance_id;

  update public.deals set status = 'accepted' where id = _deal_id;

  return _acceptance_id;
end;
$function$;

create or replace function public.request_revision(
  _deal_id uuid, _amount numeric, _frequency text,
  _payment numeric, _payback numeric, _note text default null,
  _funding_date date default null
) returns uuid
language plpgsql security definer set search_path to 'public' as $function$
declare
  _id uuid;
begin
  if _frequency not in ('daily','weekly') then
    raise exception 'invalid frequency';
  end if;

  if not exists (
    select 1 from public.deals d
    where d.id = _deal_id
      and d.expiration_date >= current_date
      and _amount >= d.min_funded
      and _amount <= d.max_funded
  ) then
    raise exception 'this offer is not available for revision';
  end if;

  update public.deal_revision_requests
    set status = 'superseded'
  where deal_id = _deal_id and status = 'open';

  insert into public.deal_revision_requests
    (deal_id, requested_amount, frequency, computed_payment, computed_payback, note, requested_funding_date)
  values (_deal_id, _amount, _frequency, _payment, _payback, nullif(btrim(coalesce(_note,'')), ''), _funding_date)
  returning id into _id;

  update public.deals set status = 'revision_requested' where id = _deal_id;

  return _id;
end;
$function$;

revoke execute on function public.accept_offer(uuid, numeric, text, numeric, numeric, date) from public;
revoke execute on function public.request_revision(uuid, numeric, text, numeric, numeric, text, date) from public;
grant execute on function public.accept_offer(uuid, numeric, text, numeric, numeric, date) to anon, authenticated;
grant execute on function public.request_revision(uuid, numeric, text, numeric, numeric, text, date) to anon, authenticated;

-- Send tracking
create table if not exists public.deal_sends (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  channel text not null check (channel in ('email','sms','manual')),
  destination text,
  sent_by uuid not null,
  kind text not null default 'offer' check (kind in ('offer','reminder')),
  status text not null default 'sent',
  detail text,
  created_at timestamp with time zone not null default now()
);

grant select, insert on public.deal_sends to authenticated;
grant all on public.deal_sends to service_role;

alter table public.deal_sends enable row level security;

create policy "reps read own deal sends" on public.deal_sends
  for select to authenticated using (public.owns_deal(deal_id));
create policy "reps log own deal sends" on public.deal_sends
  for insert to authenticated with check (public.owns_deal(deal_id) and sent_by = auth.uid());

create index if not exists deal_sends_deal_id_created_at_idx
  on public.deal_sends (deal_id, created_at desc);