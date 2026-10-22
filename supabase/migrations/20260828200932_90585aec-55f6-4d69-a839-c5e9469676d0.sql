create or replace function public.accept_offer(
  _deal_id uuid,
  _amount numeric,
  _frequency text,
  _payment numeric,
  _payback numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _acceptance_id uuid;
begin
  if _frequency not in ('daily','weekly') then
    raise exception 'invalid frequency';
  end if;

  if not exists (
    select 1 from public.deals d
    where d.id = _deal_id
      and d.expiration_date >= current_date
      and _amount >= d.min_funded
      and _amount <= d.max_funded
  ) then
    raise exception 'offer is not available';
  end if;

  insert into public.deal_acceptances
    (deal_id, accepted_amount, frequency, computed_payment, computed_payback)
  values (_deal_id, _amount, _frequency, _payment, _payback)
  returning id into _acceptance_id;

  update public.deals set status = 'accepted' where id = _deal_id;

  return _acceptance_id;
end;
$$;

revoke execute on function public.accept_offer(uuid, numeric, text, numeric, numeric) from public;
grant execute on function public.accept_offer(uuid, numeric, text, numeric, numeric) to anon, authenticated;