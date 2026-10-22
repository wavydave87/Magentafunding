revoke all on function public.is_internal_user() from public, anon;
revoke all on function public.current_partner_org() from public, anon;
revoke all on function public.is_partner_org_admin() from public, anon;
revoke all on function public.partner_app_org(uuid) from public, anon;
grant execute on function public.is_internal_user() to authenticated, service_role;
grant execute on function public.current_partner_org() to authenticated, service_role;
grant execute on function public.is_partner_org_admin() to authenticated, service_role;
grant execute on function public.partner_app_org(uuid) to authenticated, service_role;