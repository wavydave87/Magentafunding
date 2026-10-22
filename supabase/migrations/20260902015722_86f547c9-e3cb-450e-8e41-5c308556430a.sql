-- Controlled public lookup for a single open offer.
create or replace function public.get_public_deal(_deal_id uuid)
returns table (
  id uuid,
  merchant_name text,
  expiration_date date,
  sell_rate numeric,
  min_funded numeric,
  max_funded numeric,
  term_days integer,
  allow_weekly boolean,
  weekly_rate_increase_points numeric,
  origination_fee_percent numeric,
  other_fees numeric,
  pif_enabled boolean,
  status text,
  funding_window_start date,
  funding_window_end date,
  bank_verification_url text,
  rep_name text,
  rep_email text,
  rep_phone text
)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.merchant_name, d.expiration_date, d.sell_rate, d.min_funded, d.max_funded,
         d.term_days, d.allow_weekly, d.weekly_rate_increase_points, d.origination_fee_percent,
         d.other_fees, d.pif_enabled, d.status, d.funding_window_start, d.funding_window_end,
         d.bank_verification_url, r.full_name, r.email, r.phone
  from public.deals d
  join public.rep_profiles r on r.id = d.rep_id
  where d.id = _deal_id
    and d.expiration_date >= current_date;
$$;

revoke all on function public.get_public_deal(uuid) from public;
grant execute on function public.get_public_deal(uuid) to anon, authenticated;

drop view if exists public.public_deal_view;

-- Anonymous visitors only need enough of `deals` for the open-offer policies.
revoke select (
  merchant_name, sell_rate, min_funded, max_funded, term_days, allow_weekly,
  weekly_rate_increase_points, origination_fee_percent, other_fees, pif_enabled,
  status, funding_window_start, funding_window_end, bank_verification_url, rep_id
) on public.deals from anon;

-- Rep contact details are no longer readable straight from the table.
drop policy if exists "public read rep contact for open deals" on public.rep_profiles;
revoke select on public.rep_profiles from anon;
revoke select (id, full_name, email, phone) on public.rep_profiles from anon;