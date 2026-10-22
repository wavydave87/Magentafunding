
-- ============ DEMO SEED: partner portal + sales side ============
-- Fictional data only. Removable via supabase/seed/purge-partner-demo-data.sql

select set_config('magenta.trusted_partner_op', '1', true);

-- 1. Organization settings -------------------------------------------------
update public.partner_organizations o set
  commission_rate_percent = case o.slug when 'northgate' then 4.0 when 'bluestone' then 2.5 else 3.25 end,
  referral_link_enabled = true,
  status = 'active',
  assigned_rep_id = (select r.id from public.rep_profiles r
                     where r.email = case o.slug
                       when 'northgate' then 'dave@magentafunding.com'
                       when 'bluestone' then 'tiffanni@magentafunding.com'
                       else 'dario@magentafunding.com' end)
where o.slug in ('northgate','bluestone','harbor-line');

-- 2. Team members ----------------------------------------------------------
insert into public.partner_members (organization_id, user_id, full_name, email, role, status)
select o.id, gen_random_uuid(), m.full_name, m.email, m.role::public.partner_member_role, m.status::public.partner_member_status
from public.partner_organizations o
join (values
  ('northgate','Marcus Ellery','marcus.ellery@northgate.example','organization_admin','active'),
  ('northgate','Priya Raman','priya.raman@northgate.example','manager','active'),
  ('northgate','Colin Vasquez','colin.vasquez@northgate.example','broker','active'),
  ('northgate','Dana Whitfield','dana.whitfield@northgate.example','referral_rep','inactive'),
  ('bluestone','Alicia Monroe','alicia.monroe@bluestone.example','organization_admin','active'),
  ('bluestone','Terrence Boyd','terrence.boyd@bluestone.example','referral_rep','active'),
  ('bluestone','Nina Alvarez','nina.alvarez@bluestone.example','referral_rep','active'),
  ('harbor-line','Gregory Sandoval','gregory.sandoval@harbor-line.example','organization_admin','active'),
  ('harbor-line','Eve Kaplan','eve.kaplan@harbor-line.example','manager','active'),
  ('harbor-line','Owen Brady','owen.brady@harbor-line.example','viewer','pending')
) as m(slug, full_name, email, role, status) on m.slug = o.slug
where not exists (select 1 from public.partner_members pm where pm.email = m.email);

-- 3. Referral attribution --------------------------------------------------
with ranked as (
  select a.id, a.organization_id, row_number() over (partition by a.organization_id order by a.created_at) rn
  from public.partner_applications a
),
rep as (
  select distinct on (organization_id) organization_id, id
  from public.partner_members
  where status = 'active' and role in ('referral_rep','broker','manager')
  order by organization_id, created_at
)
update public.partner_applications a
   set source = 'referral_link',
       referred_by_member_id = rep.id
  from ranked, rep
 where ranked.id = a.id
   and rep.organization_id = a.organization_id
   and ranked.rn <= 5;

-- 4. Fund more applications so commissions exist ---------------------------
with to_fund as (
  select id, row_number() over (order by created_at) rn
  from public.partner_applications
  where status in ('approved','contract_signed')
)
update public.partner_applications a
   set status = 'funded',
       approved_amount = coalesce(a.approved_amount, round(coalesce(a.requested_amount, 90000) * 0.9)),
       funded_amount = coalesce(a.funded_amount, round(coalesce(a.requested_amount, 90000) * 0.9)),
       funded_at = current_date - (to_fund.rn::int * 9)
  from to_fund
 where to_fund.id = a.id;

-- commissions for applications that were already funded before this seed
insert into public.partner_commissions (organization_id, application_id, funded_amount, rate_percent, amount)
select a.organization_id, a.id, a.funded_amount, o.commission_rate_percent,
       round(a.funded_amount * o.commission_rate_percent / 100.0, 2)
from public.partner_applications a
join public.partner_organizations o on o.id = a.organization_id
where a.status = 'funded' and coalesce(a.funded_amount,0) > 0
on conflict (application_id) do nothing;

-- backfill funded_at for any funded app missing it
update public.partner_applications
   set funded_at = current_date - 21
 where status = 'funded' and funded_at is null;

-- 5. Commission status mix -------------------------------------------------
with ranked as (
  select c.id, row_number() over (order by c.created_at, c.id) rn
  from public.partner_commissions c
)
update public.partner_commissions c
   set status = (case ranked.rn % 4 when 0 then 'pending' when 1 then 'paid' when 2 then 'paid' else 'approved' end)::public.partner_commission_status,
       paid_at = case when ranked.rn % 4 in (1,2) then current_date - (ranked.rn * 7)::int else null end,
       payment_reference = case when ranked.rn % 4 in (1,2) then 'ACH-' || to_char(current_date - (ranked.rn * 7)::int, 'YYYYMM') || '-' || lpad(ranked.rn::text, 4, '0') else null end
  from ranked
 where ranked.id = c.id;

-- 6. Referral link visits (last 90 days) -----------------------------------
insert into public.partner_referral_visits (organization_id, member_id, visitor_id, created_at)
select m.organization_id, m.id,
       'demo-' || substr(md5(random()::text), 1, 12),
       now() - (g || ' days')::interval - (floor(random()*20) || ' hours')::interval
from generate_series(0, 89) g
join lateral (
  select id, organization_id from public.partner_members
  where status = 'active' and email like '%.example'
  order by md5(g::text || id::text) limit 1
) m on true
where random() < 0.85;

-- 7. Sales-side demo deals -------------------------------------------------
with reps as (
  select id, email from public.rep_profiles
),
new_deals as (
  insert into public.deals (
    rep_id, merchant_name, merchant_email, merchant_phone, expiration_date,
    buy_rate, upsell_points, min_funded, max_funded, term_days,
    allow_weekly, origination_fee_percent, other_fees, pif_enabled, status,
    funding_window_start, funding_window_end
  )
  select r.id, d.merchant_name, d.merchant_email, d.merchant_phone,
         current_date + d.days_out,
         d.buy_rate, 4, d.min_funded, d.max_funded, d.term_days,
         true, 5, 495, true, d.status,
         current_date + 2, current_date + 21
  from (values
    ('dave@magentafunding.com','Kingsley Auto Group','ap@kingsleyauto.example','+15125550142',18,1.28,40000,120000,180,'sent'),
    ('dave@magentafunding.com','Verdant Landscaping Co','billing@verdantland.example','+15125550188',12,1.34,25000,75000,150,'accepted'),
    ('tiffanni@magentafunding.com','Copperfield Dental Partners','office@copperfielddental.example','+14045550119',20,1.24,50000,150000,210,'sent'),
    ('tiffanni@magentafunding.com','Harborview Freight LLC','dispatch@harborviewfreight.example','+14045550173',9,1.38,30000,90000,120,'draft'),
    ('dario@magentafunding.com','Sunbelt HVAC Services','accounts@sunbelthvac.example','+16025550164',15,1.30,35000,110000,165,'sent'),
    ('dario@magentafunding.com','Willow Creek Cafe Group','owner@willowcreekcafe.example','+16025550107',25,1.42,15000,45000,120,'draft')
  ) as d(rep_email, merchant_name, merchant_email, merchant_phone, days_out, buy_rate, min_funded, max_funded, term_days, status)
  join reps r on r.email = d.rep_email
  returning id, merchant_name, min_funded, max_funded, status
)
insert into public.deal_presets (deal_id, label, amount, sort_order)
select nd.id, p.label, p.amt, p.sort_order
from new_deals nd
cross join lateral (values
  ('Conservative', nd.min_funded, 1),
  ('Recommended', round((nd.min_funded + nd.max_funded) / 2), 2),
  ('Maximum', nd.max_funded, 3)
) as p(label, amt, sort_order);

insert into public.closing_document_items (deal_id, label, sort_order)
select d.id, l.label, l.sort_order
from public.deals d
cross join (values
  ('Signed application (additional business owner)', 1),
  ('Government-issued photo ID', 2),
  ('Voided business check', 3),
  ('Last 4 months of credit card processing statements', 4)
) as l(label, sort_order)
where d.merchant_email like '%.example';

insert into public.pif_tiers (deal_id, label, discount_percent, sort_order)
select d.id, t.label, t.pct, t.sort_order
from public.deals d
cross join (values ('Within 30 days', 15, 1), ('Within 60 days', 10, 2), ('Within 90 days', 5, 3)) as t(label, pct, sort_order)
where d.merchant_email like '%.example';

insert into public.deal_views (deal_id, visitor_id, viewed_at, user_agent)
select d.id, 'demo-' || substr(md5(d.id::text || g::text), 1, 10),
       now() - (g || ' days')::interval, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
from public.deals d
cross join generate_series(1, 4) g
where d.merchant_email like '%.example' and d.status in ('sent','accepted');

insert into public.deal_acceptances (deal_id, accepted_amount, frequency, computed_payment, computed_payback, requested_funding_date)
select d.id, 50000, 'daily', 446.67, 67000, current_date + 5
from public.deals d
where d.merchant_name = 'Verdant Landscaping Co'
  and not exists (select 1 from public.deal_acceptances a where a.deal_id = d.id);

-- 8. Library: resources, trainings, FAQs -----------------------------------
insert into public.partner_resources (title, description, category, kind, link_url, published, sort_order)
values
  ('Magenta Submission Checklist','Everything required before an application goes to underwriting.','Underwriting','link','https://www.magentafunding.com/','true','1'),
  ('Merchant One-Pager','Client-facing overview of Magenta funding programs.','Marketing','link','https://www.magentafunding.com/','true','2'),
  ('Commission Schedule Overview','How partner commissions are calculated and paid.','Commissions','link','https://www.magentafunding.com/','true','3'),
  ('Industry Restrictions','Verticals Magenta cannot fund and common workarounds.','Underwriting','link','https://www.magentafunding.com/','true','4'),
  ('Referral Link Best Practices','How top partners position the referral link with merchants.','Marketing','link','https://www.magentafunding.com/','true','5')
on conflict do nothing;

with t as (
  insert into public.partner_trainings (title, description, category, published, sort_order)
  values
    ('Partner Onboarding','Get productive with the Magenta Portal in under an hour.','Onboarding', true, 1),
    ('Selling Revenue-Based Funding','Positioning, objection handling and structure basics.','Sales', true, 2)
  returning id, title
)
insert into public.partner_training_modules (training_id, title, description, kind, content_url, duration_minutes, sort_order)
select t.id, m.title, m.descr, m.kind::public.partner_module_kind, 'https://www.magentafunding.com/', m.mins, m.sort_order
from t
join (values
  ('Partner Onboarding','Portal Tour','Navigation, dashboard and pipeline stages.','video',8,1),
  ('Partner Onboarding','Submitting Your First Application','Walkthrough of the six-step wizard.','video',12,2),
  ('Partner Onboarding','Documents That Speed Up Underwriting','What to collect up front.','document',6,3),
  ('Selling Revenue-Based Funding','Qualifying the Merchant','Revenue, time in business and existing positions.','video',10,1),
  ('Selling Revenue-Based Funding','Explaining Factor Rates','Simple language merchants understand.','video',9,2),
  ('Selling Revenue-Based Funding','Handling Common Objections','Cost, term length and stacking concerns.','document',7,3)
) as m(training, title, descr, kind, mins, sort_order) on m.training = t.title;

insert into public.partner_faqs (question, answer, category, published, sort_order)
values
  ('How long does underwriting take?','Most complete applications receive a decision within one business day. Missing bank statements are the most common delay.','Underwriting', true, 1),
  ('When are commissions paid?','Commissions are approved after funding clears and paid on the next weekly ACH run.','Commissions', true, 2),
  ('What rate does my organization earn?','Your rate is set on your organization profile and shown on every commission line.','Commissions', true, 3),
  ('What documents does a merchant need?','A signed application, government photo ID, voided business check and the last four months of bank statements.','Underwriting', true, 4),
  ('Can I track submissions from my referral link?','Yes. Every visit and submission through your link appears on the Referrals screen.','Referrals', true, 5),
  ('How do I add a teammate?','Organization admins can invite teammates from the Team screen.','Account', true, 6),
  ('What industries cannot be funded?','Firearms, adult entertainment, cannabis and most crypto businesses are outside our credit box.','Underwriting', true, 7),
  ('Who do I contact for help?','Open a ticket on the Support screen and your Magenta rep will respond the same business day.','Support', true, 8)
on conflict do nothing;

select set_config('magenta.trusted_partner_op', '0', true);
