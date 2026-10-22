-- Removes every Partner Portal + sales demo row. Run as a migration before go-live.
-- Safe to run more than once. Real organizations and deals are untouched.

do $$
declare
  demo uuid[];
begin
  select array_agg(id) into demo
  from public.partner_organizations
  where slug in ('northgate', 'bluestone', 'harbor-line');

  if demo is not null then
    delete from public.partner_application_events e
     using public.partner_applications a
     where e.application_id = a.id and a.organization_id = any(demo);

    delete from public.partner_application_owners o
     using public.partner_applications a
     where o.application_id = a.id and a.organization_id = any(demo);

    delete from public.partner_training_progress where organization_id = any(demo);
    delete from public.partner_support_messages where organization_id = any(demo);
    delete from public.partner_support_tickets where organization_id = any(demo);
    delete from public.partner_notifications where organization_id = any(demo);
    delete from public.partner_referral_visits where organization_id = any(demo);
    delete from public.partner_commissions where organization_id = any(demo);
    delete from public.partner_documents where organization_id = any(demo);
    delete from public.partner_applications where organization_id = any(demo);
    delete from public.partner_members where organization_id = any(demo);
    delete from public.partner_organizations where id = any(demo);
  end if;

  -- Demo sales deals (every seeded merchant uses an .example contact address)
  delete from public.deal_acceptances a using public.deals d
   where a.deal_id = d.id and d.merchant_email like '%.example';
  delete from public.deal_revision_requests r using public.deals d
   where r.deal_id = d.id and d.merchant_email like '%.example';
  delete from public.deal_views v using public.deals d
   where v.deal_id = d.id and d.merchant_email like '%.example';
  delete from public.deal_bank_verification_clicks c using public.deals d
   where c.deal_id = d.id and d.merchant_email like '%.example';
  delete from public.deal_sends s using public.deals d
   where s.deal_id = d.id and d.merchant_email like '%.example';
  delete from public.deal_presets p using public.deals d
   where p.deal_id = d.id and d.merchant_email like '%.example';
  delete from public.pif_tiers t using public.deals d
   where t.deal_id = d.id and d.merchant_email like '%.example';
  delete from public.closing_document_items i using public.deals d
   where i.deal_id = d.id and d.merchant_email like '%.example';
  delete from public.uploaded_documents u using public.deals d
   where u.deal_id = d.id and d.merchant_email like '%.example';
  delete from public.deals where merchant_email like '%.example';

  -- Demo library content
  delete from public.partner_training_modules m
   using public.partner_trainings t
   where m.training_id = t.id
     and t.title in ('Partner Onboarding', 'Selling Revenue-Based Funding');
  delete from public.partner_trainings
   where title in ('Partner Onboarding', 'Selling Revenue-Based Funding');
  delete from public.partner_resources where link_url like '%magentafunding.com%';
  delete from public.partner_faqs;
end $$;
