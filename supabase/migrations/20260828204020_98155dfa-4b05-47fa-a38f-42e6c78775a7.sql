ALTER VIEW public.public_deal_view SET (security_invoker = false);
GRANT SELECT ON public.public_deal_view TO anon, authenticated;

REVOKE SELECT ON public.deals FROM anon;
REVOKE SELECT ON public.rep_profiles FROM anon;
DROP POLICY IF EXISTS "public read safe deal fields" ON public.deals;
DROP POLICY IF EXISTS "public read rep contact" ON public.rep_profiles;