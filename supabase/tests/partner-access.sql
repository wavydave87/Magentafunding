-- Partner Portal isolation & privilege-escalation checks.
-- Re-runnable: creates two throwaway partner members in two different demo
-- organizations, exercises every guard, then removes everything it created.
--
-- Run with a connection that may SET ROLE authenticated (owner/postgres):
--   psql "$SUPABASE_DB_URL" -f supabase/tests/partner-access.sql
DO $$
DECLARE
  org_a uuid;
  org_b uuid;
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  app_a uuid;
  app_b uuid;
  draft_a uuid;
  n int;
  blocked boolean;
BEGIN
  SELECT id INTO org_a FROM public.partner_organizations ORDER BY created_at LIMIT 1;
  SELECT id INTO org_b FROM public.partner_organizations WHERE id <> org_a ORDER BY created_at LIMIT 1;
  IF org_a IS NULL OR org_b IS NULL THEN
    RAISE EXCEPTION 'need at least two partner organizations to test isolation';
  END IF;

  INSERT INTO public.partner_members (organization_id, user_id, full_name, email, role, status)
  VALUES (org_a, user_a, 'Partner A (Test)', 'partner.a.test@example.com', 'organization_admin', 'active'),
         (org_b, user_b, 'Partner B (Test)', 'partner.b.test@example.com', 'broker', 'active');

  SELECT id INTO app_a FROM public.partner_applications WHERE organization_id = org_a LIMIT 1;
  SELECT id INTO app_b FROM public.partner_applications WHERE organization_id = org_b LIMIT 1;
  IF app_a IS NULL OR app_b IS NULL THEN
    RAISE EXCEPTION 'need at least one application in each organization';
  END IF;

  SET LOCAL ROLE authenticated;

  -- ============ 1. Cross-organization isolation ============
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', user_a, 'role', 'authenticated')::text, true);

  SELECT count(*) INTO n FROM public.partner_applications WHERE organization_id = org_b;
  IF n <> 0 THEN RAISE EXCEPTION 'partner A must not read organization B applications, saw %', n; END IF;

  SELECT count(*) INTO n FROM public.partner_documents WHERE organization_id = org_b;
  IF n <> 0 THEN RAISE EXCEPTION 'partner A must not read organization B documents, saw %', n; END IF;

  SELECT count(*) INTO n FROM public.partner_members WHERE organization_id = org_b;
  IF n <> 0 THEN RAISE EXCEPTION 'partner A must not read organization B members, saw %', n; END IF;

  SELECT count(*) INTO n FROM public.partner_applications WHERE organization_id = org_a;
  IF n = 0 THEN RAISE EXCEPTION 'partner A should read their own applications'; END IF;

  -- ============ 2. No access to internal deal data ============
  SELECT count(*) INTO n FROM public.deals;
  IF n <> 0 THEN RAISE EXCEPTION 'partners must not read deals at all, saw %', n; END IF;

  SELECT count(*) INTO n FROM public.rep_profiles;
  IF n <> 0 THEN RAISE EXCEPTION 'partners must not read rep profiles, saw %', n; END IF;

  SELECT count(*) INTO n FROM public.user_roles;
  IF n <> 0 THEN RAISE EXCEPTION 'partners must not read internal roles, saw %', n; END IF;

  -- ============ 3. Status / underwriting fields are protected ============
  blocked := false;
  BEGIN
    UPDATE public.partner_applications SET status = 'approved' WHERE id = app_a;
  EXCEPTION WHEN OTHERS THEN blocked := true;
  END;
  IF NOT blocked AND EXISTS (
    SELECT 1 FROM public.partner_applications WHERE id = app_a AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'partner must not be able to approve their own application';
  END IF;

  blocked := false;
  BEGIN
    UPDATE public.partner_applications
       SET funded_amount = 999999, commission_amount = 999999
     WHERE id = app_a;
  EXCEPTION WHEN OTHERS THEN blocked := true;
  END;
  IF NOT blocked AND EXISTS (
    SELECT 1 FROM public.partner_applications WHERE id = app_a AND funded_amount = 999999
  ) THEN
    RAISE EXCEPTION 'partner must not be able to set funded or commission amounts';
  END IF;

  -- ============ 4. Timeline entries cannot be forged ============
  blocked := false;
  BEGIN
    INSERT INTO public.partner_application_events
      (application_id, event_type, title, visibility)
    VALUES (app_a, 'approved', 'FORGED EVENT', 'partner');
  EXCEPTION WHEN OTHERS THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'partner must not insert timeline events directly'; END IF;

  SELECT count(*) INTO n
  FROM public.partner_application_events
  WHERE application_id = app_a AND visibility = 'internal';
  IF n <> 0 THEN RAISE EXCEPTION 'partner must not read internal-only timeline notes, saw %', n; END IF;

  -- ============ 5. New applications start as drafts in their own org ============
  INSERT INTO public.partner_applications (organization_id, created_by, legal_business_name)
  VALUES (org_a, user_a, 'Isolation Test Co')
  RETURNING id INTO draft_a;

  IF (SELECT status FROM public.partner_applications WHERE id = draft_a) <> 'started' THEN
    RAISE EXCEPTION 'new partner applications must start in the started state';
  END IF;

  blocked := false;
  BEGIN
    INSERT INTO public.partner_applications (organization_id, created_by, legal_business_name)
    VALUES (org_b, user_a, 'Cross Org Test Co');
  EXCEPTION WHEN OTHERS THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'partner must not create applications in another organization'; END IF;

  -- ============ 6. Document upload guards ============
  blocked := false;
  BEGIN
    INSERT INTO public.partner_documents
      (application_id, organization_id, file_name, storage_path, file_size, document_type)
    VALUES (draft_a, org_a, 'malware.exe', org_a || '/' || draft_a || '/malware.exe', 100, 'other');
  EXCEPTION WHEN OTHERS THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'non pdf/jpg/png uploads must be rejected'; END IF;

  blocked := false;
  BEGIN
    INSERT INTO public.partner_documents
      (application_id, organization_id, file_name, storage_path, file_size, document_type)
    VALUES (draft_a, org_a, 'huge.pdf', org_a || '/' || draft_a || '/huge.pdf', 99999999, 'other');
  EXCEPTION WHEN OTHERS THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'uploads over 25MB must be rejected'; END IF;

  -- ============ 7. Submission requires a complete application ============
  blocked := false;
  BEGIN
    PERFORM public.submit_partner_application(draft_a);
  EXCEPTION WHEN OTHERS THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'incomplete applications must not submit'; END IF;

  blocked := false;
  BEGIN
    PERFORM public.submit_partner_application(app_b);
  EXCEPTION WHEN OTHERS THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'partner must not submit another organization''s application'; END IF;

  -- ============ 8. Reverse direction: partner B is equally boxed in ============
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', user_b, 'role', 'authenticated')::text, true);

  SELECT count(*) INTO n FROM public.partner_applications WHERE organization_id = org_a;
  IF n <> 0 THEN RAISE EXCEPTION 'partner B must not read organization A applications, saw %', n; END IF;

  SELECT count(*) INTO n FROM public.partner_organizations WHERE id = org_a;
  IF n <> 0 THEN RAISE EXCEPTION 'partner B must not read organization A profile, saw %', n; END IF;

  -- ============ Cleanup ============
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', NULL, true);
  DELETE FROM public.partner_documents WHERE application_id = draft_a;
  DELETE FROM public.partner_application_events WHERE application_id = draft_a;
  DELETE FROM public.partner_applications WHERE id = draft_a;
  DELETE FROM public.partner_members WHERE user_id IN (user_a, user_b);

  RAISE NOTICE 'partner access checks passed';
END $$;
