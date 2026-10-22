ALTER VIEW public.public_deal_view SET (security_invoker = true);

GRANT SELECT (id, rep_id, merchant_name, expiration_date, sell_rate, min_funded, max_funded, term_days,
  allow_weekly, weekly_rate_increase_points, origination_fee_percent, other_fees, pif_enabled, status)
  ON public.deals TO anon;
CREATE POLICY "public read safe deal fields" ON public.deals
  FOR SELECT TO anon USING (true);

GRANT SELECT (id, full_name, email, phone) ON public.rep_profiles TO anon;
CREATE POLICY "public read rep contact" ON public.rep_profiles
  FOR SELECT TO anon USING (true);