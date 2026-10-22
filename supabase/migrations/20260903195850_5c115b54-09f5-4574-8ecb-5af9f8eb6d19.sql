-- 1. Public offer detail helpers: replace anon table reads with controlled, id-scoped lookups.
CREATE OR REPLACE FUNCTION public.get_public_deal_presets(_deal_id uuid)
RETURNS TABLE(label text, amount numeric, sort_order integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  select p.label, p.amount, p.sort_order
  from public.deal_presets p
  join public.deals d on d.id = p.deal_id
  where p.deal_id = _deal_id and d.expiration_date >= current_date
  order by p.sort_order;
$$;

CREATE OR REPLACE FUNCTION public.get_public_deal_tiers(_deal_id uuid)
RETURNS TABLE(label text, discount_percent numeric, sort_order integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  select t.label, t.discount_percent, t.sort_order
  from public.pif_tiers t
  join public.deals d on d.id = t.deal_id
  where t.deal_id = _deal_id and d.expiration_date >= current_date
  order by t.sort_order;
$$;

CREATE OR REPLACE FUNCTION public.get_public_deal_checklist(_deal_id uuid)
RETURNS TABLE(label text, sort_order integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  select c.label, c.sort_order
  from public.closing_document_items c
  join public.deals d on d.id = c.deal_id
  where c.deal_id = _deal_id and d.expiration_date >= current_date
  order by c.sort_order;
$$;

REVOKE ALL ON FUNCTION public.get_public_deal_presets(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_deal_tiers(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_deal_checklist(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_deal_presets(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_deal_tiers(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_deal_checklist(uuid) TO anon, authenticated, service_role;

-- 2. Remove broad anonymous table access.
DROP POLICY IF EXISTS "public read presets of open deals" ON public.deal_presets;
DROP POLICY IF EXISTS "public read tiers of open deals" ON public.pif_tiers;
DROP POLICY IF EXISTS "public read checklist of open deals" ON public.closing_document_items;
DROP POLICY IF EXISTS "public read open deals" ON public.deals;

REVOKE SELECT ON public.deals FROM anon;
REVOKE SELECT ON public.deal_presets FROM anon;
REVOKE SELECT ON public.pif_tiers FROM anon;
REVOKE SELECT ON public.closing_document_items FROM anon;

-- 3. No SECURITY DEFINER function in the API schema is executable by PUBLIC.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f.sig);
  END LOOP;
END $$;