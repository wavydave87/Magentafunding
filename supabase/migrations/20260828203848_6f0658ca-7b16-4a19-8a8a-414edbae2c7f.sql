GRANT EXECUTE ON FUNCTION public.owns_deal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deal_is_open(uuid) TO anon, authenticated;