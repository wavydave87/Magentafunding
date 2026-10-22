REVOKE SELECT ON public.deals FROM anon;
GRANT SELECT (id, merchant_name, expiration_date, sell_rate, min_funded, max_funded, term_days,
  allow_weekly, weekly_rate_increase_points, origination_fee_percent, other_fees, pif_enabled, status)
  ON public.deals TO anon;

REVOKE SELECT ON public.rep_profiles FROM anon;
GRANT SELECT (id, full_name, email, phone) ON public.rep_profiles TO anon;

REVOKE SELECT ON public.uploaded_documents FROM anon;
GRANT SELECT (id, deal_id, file_name, uploaded_at) ON public.uploaded_documents TO anon;

REVOKE SELECT ON public.deal_acceptances FROM anon;
GRANT SELECT (id, deal_id, accepted_amount, frequency, computed_payment, computed_payback, accepted_at)
  ON public.deal_acceptances TO anon;