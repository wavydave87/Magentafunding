CREATE TABLE public.deal_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  user_agent text
);

GRANT SELECT ON public.deal_views TO authenticated;
GRANT ALL ON public.deal_views TO service_role;

ALTER TABLE public.deal_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reps read own deal views"
ON public.deal_views FOR SELECT TO authenticated
USING (public.owns_deal(deal_id));

CREATE INDEX deal_views_deal_time_idx ON public.deal_views (deal_id, viewed_at DESC);
CREATE INDEX deal_views_dedupe_idx ON public.deal_views (deal_id, visitor_id, viewed_at DESC);

CREATE OR REPLACE FUNCTION public.record_deal_view(_deal_id uuid, _visitor_id text, _user_agent text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  _vid text := nullif(btrim(coalesce(_visitor_id, '')), '');
begin
  if _vid is null then
    return false;
  end if;

  if not exists (select 1 from public.deals d where d.id = _deal_id) then
    return false;
  end if;

  if exists (
    select 1 from public.deal_views v
    where v.deal_id = _deal_id
      and v.visitor_id = _vid
      and v.viewed_at > now() - interval '30 minutes'
  ) then
    return false;
  end if;

  insert into public.deal_views (deal_id, visitor_id, user_agent)
  values (_deal_id, _vid, left(coalesce(_user_agent, ''), 300));

  return true;
end;
$$;

REVOKE ALL ON FUNCTION public.record_deal_view(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_deal_view(uuid, text, text) TO anon, authenticated, service_role;

CREATE VIEW public.deal_view_stats
WITH (security_invoker = true)
AS
SELECT
  v.deal_id,
  count(*)::bigint AS view_count,
  count(DISTINCT v.visitor_id)::bigint AS unique_visitors,
  min(v.viewed_at) AS first_viewed_at,
  max(v.viewed_at) AS last_viewed_at
FROM public.deal_views v
GROUP BY v.deal_id;

GRANT SELECT ON public.deal_view_stats TO authenticated;
GRANT ALL ON public.deal_view_stats TO service_role;