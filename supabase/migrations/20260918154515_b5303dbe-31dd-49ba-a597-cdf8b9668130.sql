REVOKE ALL ON FUNCTION public.set_deal_follow_up_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_deal_follow_up_updated_at() TO service_role;