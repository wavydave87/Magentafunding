-- 1. Entitlement flag ------------------------------------------------------
ALTER TABLE public.partner_members
  ADD COLUMN IF NOT EXISTS can_view_org_referrals boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.partner_members.can_view_org_referrals IS
  'Specific approved entitlement: allows a non-admin partner user to see organization-link referrals that have no individual owner.';

-- 2. Organization must be active -------------------------------------------
CREATE OR REPLACE FUNCTION public.current_partner_org()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select m.organization_id
  from public.partner_members m
  join public.partner_organizations o on o.id = m.organization_id
  where m.user_id = auth.uid()
    and m.status = 'active'
    and o.status = 'active'
  limit 1
$function$;

CREATE OR REPLACE FUNCTION public.current_partner_member_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select m.id
  from public.partner_members m
  join public.partner_organizations o on o.id = m.organization_id
  where m.user_id = auth.uid()
    and m.status = 'active'
    and o.status = 'active'
  limit 1
$function$;

CREATE OR REPLACE FUNCTION public.is_partner_org_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.partner_members m
    join public.partner_organizations o on o.id = m.organization_id
    where m.user_id = auth.uid()
      and m.status = 'active'
      and o.status = 'active'
      and m.role = 'organization_admin'
  )
$function$;

CREATE OR REPLACE FUNCTION public.current_partner_can_view_org_links()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select coalesce((
    select m.can_view_org_referrals
    from public.partner_members m
    join public.partner_organizations o on o.id = m.organization_id
    where m.user_id = auth.uid()
      and m.status = 'active'
      and o.status = 'active'
    limit 1
  ), false)
$function$;

-- 3. Entitlement rule -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.partner_entitled(_organization_id uuid, _member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select case
    when _organization_id is null then false
    when _organization_id is distinct from public.current_partner_org() then false
    when public.is_partner_org_admin() then true
    when _member_id is not null and _member_id = public.current_partner_member_id() then true
    when _member_id is null then public.current_partner_can_view_org_links()
    else false
  end
$function$;

CREATE OR REPLACE FUNCTION public.partner_app_visible(_application_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select coalesce((
    select public.partner_entitled(a.organization_id, a.attributed_member_id)
    from public.partner_applications a
    where a.id = _application_id
  ), false)
$function$;

-- 4. Partner read/write rules ----------------------------------------------
DROP POLICY IF EXISTS "partners read own applications" ON public.partner_applications;
DROP POLICY IF EXISTS "partners update editable applications" ON public.partner_applications;
DROP POLICY IF EXISTS "partners create draft applications" ON public.partner_applications;

DROP POLICY IF EXISTS "partners read own owners" ON public.partner_application_owners;
DROP POLICY IF EXISTS "partners add owners while editable" ON public.partner_application_owners;
DROP POLICY IF EXISTS "partners update owners while editable" ON public.partner_application_owners;
DROP POLICY IF EXISTS "partners remove owners while editable" ON public.partner_application_owners;

DROP POLICY IF EXISTS "partners read own documents" ON public.partner_documents;
DROP POLICY IF EXISTS "partners add documents while editable" ON public.partner_documents;

DROP POLICY IF EXISTS "partners read partner events" ON public.partner_application_events;
CREATE POLICY "partners read entitled partner events"
ON public.partner_application_events FOR SELECT TO authenticated
USING (visibility = 'partner' AND public.partner_app_visible(application_id));

DROP POLICY IF EXISTS "partners read own commissions" ON public.partner_commissions;
CREATE POLICY "partners read entitled commissions"
ON public.partner_commissions FOR SELECT TO authenticated
USING (organization_id = public.current_partner_org() AND public.partner_app_visible(application_id));

-- 5. Constrained partner-facing application summary -------------------------
CREATE OR REPLACE VIEW public.partner_application_summary
WITH (security_invoker = false) AS
SELECT
  a.id,
  a.organization_id,
  a.attributed_member_id,
  a.referral_id,
  a.reference,
  a.legal_business_name,
  a.dba,
  a.city,
  a.state,
  a.contact_first_name,
  a.contact_last_name,
  a.partner_status,
  a.application_state,
  a.funding_state,
  a.completion_percent,
  a.started_at,
  a.submitted_at,
  a.last_activity_at,
  a.funded_amount,
  a.funded_at,
  a.created_at,
  a.updated_at
FROM public.partner_applications a
WHERE public.partner_entitled(a.organization_id, a.attributed_member_id);

COMMENT ON VIEW public.partner_application_summary IS
  'Partner-safe application fields only. Definer view: the entitlement rule is enforced in its WHERE clause; underwriting, banking, credit, pricing and internal fields are never exposed.';

REVOKE ALL ON public.partner_application_summary FROM anon;
GRANT SELECT ON public.partner_application_summary TO authenticated;

-- 6. Team statistics --------------------------------------------------------
CREATE OR REPLACE VIEW public.partner_member_stats
WITH (security_invoker = false) AS
SELECT
  m.id AS member_id,
  m.organization_id,
  m.full_name,
  m.email,
  m.role,
  m.status,
  m.code,
  m.can_view_org_referrals,
  coalesce(s.referral_count, 0) AS referral_count,
  coalesce(s.submitted_count, 0) AS submitted_count,
  coalesce(s.funded_count, 0) AS funded_count,
  coalesce(s.funded_volume, 0) AS funded_volume,
  coalesce(c.commission_earned, 0) AS commission_earned
FROM public.partner_members m
LEFT JOIN LATERAL (
  SELECT
    count(*) AS referral_count,
    count(*) FILTER (WHERE a.submitted_at IS NOT NULL) AS submitted_count,
    count(*) FILTER (WHERE a.funding_state = 'funded') AS funded_count,
    coalesce(sum(a.funded_amount) FILTER (WHERE a.funding_state = 'funded'), 0) AS funded_volume
  FROM public.partner_applications a
  WHERE a.attributed_member_id = m.id
) s ON true
LEFT JOIN LATERAL (
  SELECT coalesce(sum(pc.amount), 0) AS commission_earned
  FROM public.partner_commissions pc
  JOIN public.partner_applications pa ON pa.id = pc.application_id
  WHERE pa.attributed_member_id = m.id
    AND pc.status IN ('approved', 'paid', 'scheduled')
) c ON true
WHERE m.organization_id = public.current_partner_org()
  AND (public.is_partner_org_admin() OR m.id = public.current_partner_member_id());

REVOKE ALL ON public.partner_member_stats FROM anon;
GRANT SELECT ON public.partner_member_stats TO authenticated;

-- 7. Atomic invitation acceptance -------------------------------------------
CREATE OR REPLACE FUNCTION public.partner_accept_invitation(
  _token_hash text,
  _user_id uuid,
  _full_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inv public.partner_invitations;
  member_id uuid;
BEGIN
  UPDATE public.partner_invitations i
     SET status = 'accepted',
         accepted_at = now(),
         updated_at = now()
   WHERE i.token_hash = _token_hash
     AND i.status = 'pending'
     AND i.revoked_at IS NULL
     AND i.expires_at > now()
  RETURNING * INTO inv;

  IF inv.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF inv.intended_role = 'organization_admin' THEN
    RAISE EXCEPTION 'Organization admin invitations are issued by Magenta only';
  END IF;

  INSERT INTO public.partner_members (organization_id, user_id, full_name, email, role, status)
  VALUES (
    inv.organization_id,
    _user_id,
    coalesce(nullif(trim(_full_name), ''), inv.full_name, inv.invited_email),
    inv.invited_email,
    inv.intended_role,
    'active'
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE
    SET status = 'active',
        role = CASE WHEN public.partner_members.role = 'organization_admin'
                    THEN public.partner_members.role ELSE excluded.role END,
        updated_at = now()
  RETURNING id INTO member_id;

  INSERT INTO public.partner_admin_audit_log (actor_user_id, entity_type, entity_id, action, new_value)
  VALUES (_user_id, 'partner_invitation', inv.id, 'invitation_accepted',
          jsonb_build_object('organization_id', inv.organization_id, 'member_id', member_id, 'role', inv.intended_role));

  RETURN member_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.partner_accept_invitation(text, uuid, text) FROM anon, authenticated;