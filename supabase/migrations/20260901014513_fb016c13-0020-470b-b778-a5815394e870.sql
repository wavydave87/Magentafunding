revoke execute on function public.partner_commission_on_funded() from public, anon, authenticated;
revoke execute on function public.partner_application_notify() from public, anon, authenticated;
revoke execute on function public.partner_ticket_message_after() from public, anon, authenticated;
revoke execute on function public.partner_commission_notify() from public, anon, authenticated;
revoke execute on function public.current_partner_member_id() from public, anon;
revoke execute on function public.is_partner_member() from public, anon;
revoke execute on function public.partner_notify(uuid,text,text,text,text,uuid) from public, anon, authenticated;