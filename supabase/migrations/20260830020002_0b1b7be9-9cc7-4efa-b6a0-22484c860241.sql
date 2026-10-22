-- Anon read/write grants must match the anon policies already in place.
GRANT SELECT ON public.deals TO anon;
GRANT SELECT ON public.deal_presets TO anon;
GRANT SELECT ON public.pif_tiers TO anon;
GRANT SELECT ON public.closing_document_items TO anon;
GRANT SELECT, INSERT ON public.deal_acceptances TO anon;
GRANT SELECT, INSERT ON public.deal_revision_requests TO anon;
GRANT SELECT, INSERT ON public.uploaded_documents TO anon;
GRANT SELECT ON public.rep_profiles TO anon;

-- anon must never read or write tracking rows directly; the SECURITY DEFINER
-- RPCs are the only path in, and reps read them as authenticated.
REVOKE ALL ON public.deal_views FROM anon;
REVOKE ALL ON public.deal_bank_verification_clicks FROM anon;
GRANT SELECT ON public.deal_views TO authenticated;
GRANT SELECT ON public.deal_bank_verification_clicks TO authenticated;