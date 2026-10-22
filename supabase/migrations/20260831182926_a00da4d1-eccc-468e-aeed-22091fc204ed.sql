revoke all on function public.partner_applications_guard() from public, anon, authenticated;
revoke all on function public.partner_applications_insert_guard() from public, anon, authenticated;
revoke all on function public.is_trusted_partner_op() from public, anon, authenticated;
revoke all on function public.partner_app_editable(uuid) from public, anon;
revoke all on function public.submit_partner_application(uuid) from public, anon;
revoke all on function public.partner_information_provided(uuid, text) from public, anon;