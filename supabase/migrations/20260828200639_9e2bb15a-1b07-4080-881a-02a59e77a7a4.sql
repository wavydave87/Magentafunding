alter view public.public_deal_view set (security_invoker = true);

grant select (
  id, merchant_name, expiration_date, sell_rate, min_funded, max_funded, term_days,
  allow_weekly, weekly_rate_increase_points, origination_fee_percent, other_fees,
  pif_enabled, status
) on public.deals to anon;

create policy "public read safe deal fields" on public.deals for select to anon using (true);

grant select (id, full_name, email, phone) on public.rep_profiles to anon;
create policy "public read rep contact" on public.rep_profiles for select to anon using (true);

revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.owns_deal(uuid) from public, anon;
revoke execute on function public.deal_is_open(uuid) from public, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.owns_deal(uuid) to authenticated;
grant execute on function public.deal_is_open(uuid) to anon;