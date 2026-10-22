-- Removes ONLY the "Demo —" deal set and its mirrored partner applications.
-- Storage objects must be deleted separately from the closing-documents and
-- partner-documents buckets (prefixes listed at the bottom of this file).

begin;

select set_config('magenta.trusted_partner_op', '1', false);

-- Partner side ---------------------------------------------------------------
delete from public.partner_commissions
 where application_id in (select id from public.partner_applications where reference like 'MP-DEMO%');

delete from public.partner_documents
 where application_id in (select id from public.partner_applications where reference like 'MP-DEMO%');

delete from public.partner_application_events
 where application_id in (select id from public.partner_applications where reference like 'MP-DEMO%');

delete from public.partner_application_owners
 where application_id in (select id from public.partner_applications where reference like 'MP-DEMO%');

delete from public.partner_notifications
 where link_path in (
   select '/portal/applications/' || id::text from public.partner_applications where reference like 'MP-DEMO%'
   union all
   select '/partner/applications/' || id::text from public.partner_applications where reference like 'MP-DEMO%'
 );

delete from public.partner_applications where reference like 'MP-DEMO%';

-- Internal side ---------------------------------------------------------------
delete from public.uploaded_documents
 where deal_id in (select id from public.deals where merchant_name like 'Demo —%');
delete from public.deal_sends
 where deal_id in (select id from public.deals where merchant_name like 'Demo —%');
delete from public.deal_bank_verification_clicks
 where deal_id in (select id from public.deals where merchant_name like 'Demo —%');
delete from public.deal_views
 where deal_id in (select id from public.deals where merchant_name like 'Demo —%');
delete from public.deal_acceptances
 where deal_id in (select id from public.deals where merchant_name like 'Demo —%');
delete from public.deal_revision_requests
 where deal_id in (select id from public.deals where merchant_name like 'Demo —%');
delete from public.closing_document_items
 where deal_id in (select id from public.deals where merchant_name like 'Demo —%');
delete from public.pif_tiers
 where deal_id in (select id from public.deals where merchant_name like 'Demo —%');
delete from public.deal_presets
 where deal_id in (select id from public.deals where merchant_name like 'Demo —%');
delete from public.deals where merchant_name like 'Demo —%';

select set_config('magenta.trusted_partner_op', '0', false);

commit;

-- Storage prefixes to remove manually:
--   closing-documents/11110000-0000-4000-8000-000000000001/
--   closing-documents/11110000-0000-4000-8000-000000000003/
--   partner-documents/0d5d08f9-ce2a-46d2-8018-d46cdeb0838b/22220000-0000-4000-8000-000000000001/
--   partner-documents/45f1639b-2132-4f0b-a8a0-d61ef5c341f8/22220000-0000-4000-8000-000000000003/
