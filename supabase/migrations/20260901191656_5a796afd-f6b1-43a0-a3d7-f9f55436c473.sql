DROP POLICY IF EXISTS "public read open deals" ON public.deals;
CREATE POLICY "public read open deals" ON public.deals
  FOR SELECT TO anon USING (expiration_date >= current_date);

DROP POLICY IF EXISTS "public read tiers of open deals" ON public.pif_tiers;
CREATE POLICY "public read tiers of open deals" ON public.pif_tiers
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = pif_tiers.deal_id AND d.expiration_date >= current_date)
  );

DROP POLICY IF EXISTS "public read presets of open deals" ON public.deal_presets;
CREATE POLICY "public read presets of open deals" ON public.deal_presets
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_presets.deal_id AND d.expiration_date >= current_date)
  );

DROP POLICY IF EXISTS "public read checklist of open deals" ON public.closing_document_items;
CREATE POLICY "public read checklist of open deals" ON public.closing_document_items
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = closing_document_items.deal_id AND d.expiration_date >= current_date)
  );