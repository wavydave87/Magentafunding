CREATE POLICY "members read their own row" ON public.partner_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "members read their own organization" ON public.partner_organizations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.partner_members m
    WHERE m.organization_id = partner_organizations.id
      AND m.user_id = auth.uid()
  ));