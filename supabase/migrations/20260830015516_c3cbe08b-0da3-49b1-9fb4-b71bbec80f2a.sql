ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS bank_verification_url text;
ALTER TABLE public.rep_profiles ADD COLUMN IF NOT EXISTS default_bank_verification_url text;

CREATE TABLE IF NOT EXISTS public.deal_bank_verification_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  user_agent text
);

GRANT SELECT ON public.deal_bank_verification_clicks TO authenticated;
GRANT ALL ON public.deal_bank_verification_clicks TO service_role;

ALTER TABLE public.deal_bank_verification_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reps read own bank verification clicks"
  ON public.deal_bank_verification_clicks
  FOR SELECT TO authenticated
  USING (public.owns_deal(deal_id));

CREATE INDEX IF NOT EXISTS deal_bank_verification_clicks_deal_idx
  ON public.deal_bank_verification_clicks (deal_id, clicked_at DESC);

CREATE OR REPLACE FUNCTION public.record_bank_verification_click(
  _deal_id uuid,
  _visitor_id text,
  _user_agent text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  _vid text := nullif(btrim(coalesce(_visitor_id, '')), '');
begin
  if _vid is null then
    return false;
  end if;

  if not exists (
    select 1 from public.deals d
    where d.id = _deal_id and d.bank_verification_url is not null
  ) then
    return false;
  end if;

  if exists (
    select 1 from public.deal_bank_verification_clicks c
    where c.deal_id = _deal_id
      and c.visitor_id = _vid
      and c.clicked_at > now() - interval '30 minutes'
  ) then
    return false;
  end if;

  insert into public.deal_bank_verification_clicks (deal_id, visitor_id, user_agent)
  values (_deal_id, _vid, left(coalesce(_user_agent, ''), 300));

  return true;
end;
$function$;

REVOKE ALL ON FUNCTION public.record_bank_verification_click(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_bank_verification_click(uuid, text, text) TO anon, authenticated, service_role;

DROP VIEW IF EXISTS public.public_deal_view;
CREATE VIEW public.public_deal_view AS
SELECT d.id,
    d.merchant_name,
    d.expiration_date,
    d.sell_rate,
    d.min_funded,
    d.max_funded,
    d.term_days,
    d.allow_weekly,
    d.weekly_rate_increase_points,
    d.origination_fee_percent,
    d.other_fees,
    d.pif_enabled,
    d.status,
    d.funding_window_start,
    r.full_name AS rep_name,
    r.email AS rep_email,
    r.phone AS rep_phone,
    d.funding_window_end,
    d.bank_verification_url
   FROM public.deals d
     JOIN public.rep_profiles r ON r.id = d.rep_id;

GRANT SELECT ON public.public_deal_view TO anon, authenticated;