-- 1. Public offer view: enforce the caller's own permissions
ALTER VIEW public.public_deal_view SET (security_invoker = true);

-- 2. deals: scope anonymous reads to open deals and non-sensitive columns
DROP POLICY IF EXISTS "public read safe deal fields" ON public.deals;
REVOKE SELECT ON public.deals FROM anon;
GRANT SELECT (
  id, rep_id, merchant_name, expiration_date, sell_rate, min_funded, max_funded,
  term_days, allow_weekly, weekly_rate_increase_points, origination_fee_percent,
  other_fees, pif_enabled, status, funding_window_start, funding_window_end,
  bank_verification_url
) ON public.deals TO anon;
CREATE POLICY "public read open deals" ON public.deals
  FOR SELECT TO anon USING (public.deal_is_open(id));

-- 3. rep_profiles: only reachable through an open deal, non-sensitive columns
DROP POLICY IF EXISTS "public read rep contact" ON public.rep_profiles;
REVOKE SELECT ON public.rep_profiles FROM anon;
GRANT SELECT (id, full_name, email, phone) ON public.rep_profiles TO anon;
CREATE POLICY "public read rep contact for open deals" ON public.rep_profiles
  FOR SELECT TO anon USING (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.rep_id = rep_profiles.id
        AND d.expiration_date >= current_date
    )
  );

-- 4. Deal pricing / checklist tables: scope to open deals
DROP POLICY IF EXISTS "public read tiers" ON public.pif_tiers;
CREATE POLICY "public read tiers of open deals" ON public.pif_tiers
  FOR SELECT TO anon USING (public.deal_is_open(deal_id));

DROP POLICY IF EXISTS "public read presets" ON public.deal_presets;
CREATE POLICY "public read presets of open deals" ON public.deal_presets
  FOR SELECT TO anon USING (public.deal_is_open(deal_id));

DROP POLICY IF EXISTS "public read checklist" ON public.closing_document_items;
CREATE POLICY "public read checklist of open deals" ON public.closing_document_items
  FOR SELECT TO anon USING (public.deal_is_open(deal_id));

-- 5. Training modules must respect the parent training's publish + audience rules
DROP POLICY IF EXISTS "read modules of readable trainings" ON public.partner_training_modules;
CREATE POLICY "read modules of readable trainings" ON public.partner_training_modules
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.partner_trainings t
      WHERE t.id = partner_training_modules.training_id
        AND (
          public.is_internal_user()
          OR (
            t.published
            AND public.is_partner_member()
            AND (
              t.audience IS NULL
              OR t.audience = (
                SELECT o.partner_type FROM public.partner_organizations o
                WHERE o.id = public.current_partner_org()
              )
            )
          )
        )
    )
  );

-- 6. SECURITY DEFINER functions: remove blanket PUBLIC/anon execute on internal helpers
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM public, anon;
REVOKE ALL ON FUNCTION public.owns_deal(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.deal_is_open(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_deal(uuid) TO authenticated;

-- Public-facing RPCs: explicit grants only, no blanket PUBLIC execute
REVOKE ALL ON FUNCTION public.accept_offer(uuid, numeric, text, numeric, numeric, date) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_offer(uuid, numeric, text, numeric, numeric, date) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.request_revision(uuid, numeric, text, numeric, numeric, text, date) FROM public;
GRANT EXECUTE ON FUNCTION public.request_revision(uuid, numeric, text, numeric, numeric, text, date) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.record_deal_view(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_deal_view(uuid, text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.record_bank_verification_click(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_bank_verification_click(uuid, text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.record_referral_visit(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_referral_visit(text, text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_referral_application(text, text, text, text, text, text, text, numeric, text, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_referral_application(text, text, text, text, text, text, text, numeric, text, numeric) TO anon, authenticated;