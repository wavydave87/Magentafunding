-- Clients holding the offer link may read back their own acceptance + uploaded file names (safe columns only)
CREATE POLICY "clients read acceptance for own deal" ON public.deal_acceptances
  FOR SELECT TO anon USING (public.deal_is_open(deal_id));
GRANT SELECT (id, deal_id, accepted_amount, frequency, computed_payment, computed_payback, accepted_at)
  ON public.deal_acceptances TO anon;

CREATE POLICY "clients read own uploads" ON public.uploaded_documents
  FOR SELECT TO anon USING (public.deal_is_open(deal_id));
GRANT SELECT (id, deal_id, file_name, uploaded_at) ON public.uploaded_documents TO anon;

-- One acceptance per deal
CREATE UNIQUE INDEX IF NOT EXISTS deal_acceptances_one_per_deal
  ON public.deal_acceptances (deal_id);

CREATE OR REPLACE FUNCTION public.accept_offer(_deal_id uuid, _amount numeric, _frequency text, _payment numeric, _payback numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _acceptance_id uuid;
begin
  if _frequency not in ('daily','weekly') then
    raise exception 'invalid frequency';
  end if;

  if exists (select 1 from public.deal_acceptances a where a.deal_id = _deal_id) then
    raise exception 'this offer has already been accepted';
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
$function$;