REVOKE ALL ON FUNCTION public.deal_is_open(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.owns_deal(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.accept_offer(uuid, numeric, text, numeric, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_offer(uuid, numeric, text, numeric, numeric) TO anon, authenticated;