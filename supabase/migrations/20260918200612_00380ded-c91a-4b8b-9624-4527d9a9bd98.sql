DROP POLICY IF EXISTS "Partners read their organization referrals" ON public.partner_referrals;
CREATE POLICY "Partners read entitled referrals"
  ON public.partner_referrals FOR SELECT TO authenticated
  USING (public.partner_entitled(organization_id, member_id));

DROP POLICY IF EXISTS "Partners create referrals for their organization" ON public.partner_referrals;
CREATE POLICY "Partners create entitled referrals"
  ON public.partner_referrals FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_partner_org()
    AND (
      public.is_partner_org_admin()
      OR member_id = public.current_partner_member_id()
    )
  );