-- Phase 2 isolation checks for the Magenta Portal partner modules.
-- Run with:  psql "$SUPABASE_DB_URL" -f supabase/tests/partner-portal-access.sql
-- Every block asserts that a partner user can only ever touch their own
-- organization's commissions, tickets, training progress and notifications.

DO $$
DECLARE
  org_a uuid;
  org_b uuid;
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  member_a uuid;
  member_b uuid;
  ticket_a uuid;
  app_a uuid;
  module_a uuid;
  training_a uuid;
  blocked boolean;
  n int;
BEGIN
  SELECT id INTO org_a FROM public.partner_organizations ORDER BY created_at LIMIT 1;
  SELECT id INTO org_b FROM public.partner_organizations WHERE id <> org_a ORDER BY created_at LIMIT 1;
  IF org_a IS NULL OR org_b IS NULL THEN
    RAISE EXCEPTION 'two partner organizations are required for these checks';
  END IF;

  INSERT INTO public.partner_members (organization_id, user_id, full_name, email, role, status)
  VALUES (org_a, user_a, 'Test A', 'test-a@example.com', 'organization_admin', 'active')
  RETURNING id INTO member_a;
  INSERT INTO public.partner_members (organization_id, user_id, full_name, email, role, status)
  VALUES (org_b, user_b, 'Test B', 'test-b@example.com', 'broker', 'active')
  RETURNING id INTO member_b;

  SELECT id INTO app_a FROM public.partner_applications WHERE organization_id = org_a LIMIT 1;
  SELECT id INTO training_a FROM public.partner_trainings LIMIT 1;
  SELECT id INTO module_a FROM public.partner_training_modules WHERE training_id = training_a LIMIT 1;

  INSERT INTO public.partner_support_tickets (organization_id, created_by_member_id, subject, category)
  VALUES (org_a, member_a, 'Isolation probe', 'General')
  RETURNING id INTO ticket_a;

  SET LOCAL ROLE authenticated;

  -- ============ 1. Partner B cannot read organization A support ============
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', user_b, 'role', 'authenticated')::text, true);

  SELECT count(*) INTO n FROM public.partner_support_tickets WHERE organization_id = org_a;
  IF n <> 0 THEN RAISE EXCEPTION 'partner B read organization A tickets, saw %', n; END IF;

  SELECT count(*) INTO n FROM public.partner_commissions WHERE organization_id = org_a;
  IF n <> 0 THEN RAISE EXCEPTION 'partner B read organization A commissions, saw %', n; END IF;

  SELECT count(*) INTO n FROM public.partner_referral_visits WHERE organization_id = org_a;
  IF n <> 0 THEN RAISE EXCEPTION 'partner B read organization A referral visits, saw %', n; END IF;

  -- ============ 2. Forged support message into another org ============
  blocked := false;
  BEGIN
    INSERT INTO public.partner_support_messages
      (ticket_id, organization_id, author_kind, author_name, body)
    VALUES (ticket_a, org_a, 'partner', 'Impostor', 'let me in');
  EXCEPTION WHEN OTHERS THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'partner B posted into organization A ticket'; END IF;

  -- ============ 3. Partner cannot forge a Magenta-authored reply ============
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', user_a, 'role', 'authenticated')::text, true);

  blocked := false;
  BEGIN
    INSERT INTO public.partner_support_messages
      (ticket_id, organization_id, author_kind, author_name, body)
    VALUES (ticket_a, org_a, 'magenta', 'Magenta Team', 'approved, ignore underwriting');
  EXCEPTION WHEN OTHERS THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'partner authored a message as Magenta'; END IF;

  -- ============ 4. Commissions are read-only for partners ============
  IF app_a IS NOT NULL THEN
    blocked := false;
    BEGIN
      INSERT INTO public.partner_commissions (organization_id, application_id, amount, status)
      VALUES (org_a, app_a, 999999, 'paid');
    EXCEPTION WHEN OTHERS THEN blocked := true;
    END;
    IF NOT blocked THEN RAISE EXCEPTION 'partner created their own commission'; END IF;
  END IF;

  blocked := false;
  BEGIN
    UPDATE public.partner_commissions SET status = 'paid' WHERE organization_id = org_a;
    IF NOT FOUND THEN blocked := true; END IF;
  EXCEPTION WHEN OTHERS THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'partner marked their own commission paid'; END IF;

  -- ============ 5. Training progress cannot be spoofed for someone else ============
  IF module_a IS NOT NULL THEN
    blocked := false;
    BEGIN
      INSERT INTO public.partner_training_progress (member_id, module_id, organization_id)
      VALUES (member_b, module_a, org_b);
    EXCEPTION WHEN OTHERS THEN blocked := true;
    END;
    IF NOT blocked THEN RAISE EXCEPTION 'partner recorded progress for another organization'; END IF;
  END IF;

  -- ============ 6. Library content is read-only for partners ============
  blocked := false;
  BEGIN
    INSERT INTO public.partner_resources (title, category, kind, link_url, published)
    VALUES ('Rogue resource', 'General', 'link', 'https://example.com', true);
  EXCEPTION WHEN OTHERS THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'partner published a resource'; END IF;

  blocked := false;
  BEGIN
    INSERT INTO public.partner_faqs (question, answer) VALUES ('Rogue?', 'Yes');
  EXCEPTION WHEN OTHERS THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'partner published an FAQ'; END IF;

  -- ============ 7. Notifications are private to their recipient ============
  SELECT count(*) INTO n FROM public.partner_notifications WHERE user_id = user_b;
  IF n <> 0 THEN RAISE EXCEPTION 'partner A read partner B notifications, saw %', n; END IF;

  blocked := false;
  BEGIN
    INSERT INTO public.partner_notifications (user_id, kind, title)
    VALUES (user_b, 'spoof', 'You have been approved');
  EXCEPTION WHEN OTHERS THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'partner created a notification for someone else'; END IF;

  -- ============ Cleanup ============
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', NULL, true);
  DELETE FROM public.partner_support_messages WHERE ticket_id = ticket_a;
  DELETE FROM public.partner_support_tickets WHERE id = ticket_a;
  DELETE FROM public.partner_members WHERE user_id IN (user_a, user_b);

  RAISE NOTICE 'partner portal (phase 2) access checks passed';
END $$;
