-- Role-based access checks for client documents and revision requests.
-- Re-runnable: creates a throwaway rep + revision request and removes them.
-- Set :demo to a deal id that has uploaded documents (defaults to the sample deal).
DO $$
DECLARE
  owner_id uuid;
  other_id uuid := gen_random_uuid();
  demo uuid;
  n int;
BEGIN
  SELECT d.id, d.rep_id INTO demo, owner_id
  FROM public.deals d
  JOIN public.uploaded_documents u ON u.deal_id = d.id
  GROUP BY d.id, d.rep_id
  ORDER BY count(u.id) DESC
  LIMIT 1;
  IF demo IS NULL THEN RAISE EXCEPTION 'no deal with uploaded documents to test against'; END IF;

  INSERT INTO public.rep_profiles (id, full_name, email)
  VALUES (other_id, 'Other Rep (Test)', 'other.rep.test@example.com');
  INSERT INTO public.deal_revision_requests (deal_id, requested_amount, frequency, computed_payment, computed_payback, note)
  VALUES (demo, 40000, 'weekly', 2700, 51200, 'ROLE TEST');

  -- 1. Owning rep (admins pass the same policies via has_role).
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO n FROM public.uploaded_documents WHERE deal_id = demo;
  IF n = 0 THEN RAISE EXCEPTION 'owner should read uploads'; END IF;
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'closing-documents' AND name LIKE demo || '/%';
  IF n = 0 THEN RAISE EXCEPTION 'owner should reach stored files'; END IF;
  UPDATE public.deal_revision_requests SET status = 'closed' WHERE deal_id = demo AND note = 'ROLE TEST';
  IF NOT FOUND THEN RAISE EXCEPTION 'owner should update revisions'; END IF;
  UPDATE public.deal_revision_requests SET status = 'open' WHERE deal_id = demo AND note = 'ROLE TEST';

  -- 2. Unrelated rep is blocked everywhere.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', other_id, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO n FROM public.uploaded_documents WHERE deal_id = demo;
  IF n <> 0 THEN RAISE EXCEPTION 'other rep must not read uploads, saw %', n; END IF;
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'closing-documents' AND name LIKE demo || '/%';
  IF n <> 0 THEN RAISE EXCEPTION 'other rep must not reach stored files, saw %', n; END IF;
  SELECT count(*) INTO n FROM public.deal_revision_requests WHERE deal_id = demo;
  IF n <> 0 THEN RAISE EXCEPTION 'other rep must not read revisions, saw %', n; END IF;
  UPDATE public.deal_revision_requests SET status = 'closed' WHERE deal_id = demo;
  IF FOUND THEN RAISE EXCEPTION 'other rep must not update revisions'; END IF;

  -- 3. Anonymous link holder: no stored files, no revision edits.
  RESET ROLE;
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'closing-documents';
  IF n <> 0 THEN RAISE EXCEPTION 'anon must not reach stored files, saw %', n; END IF;
  UPDATE public.deal_revision_requests SET status = 'closed' WHERE deal_id = demo;
  IF FOUND THEN RAISE EXCEPTION 'anon must not update revisions'; END IF;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', NULL, true);
  DELETE FROM public.deal_revision_requests WHERE note = 'ROLE TEST';
  DELETE FROM public.rep_profiles WHERE id = other_id;
  RAISE NOTICE 'role-based access checks passed';
END $$;

-- ---------------------------------------------------------------------------
-- Offer send history: only the owning rep (or an admin) may read or log sends.
-- ---------------------------------------------------------------------------
-- anon must see nothing and be unable to insert
set role anon;
select case when count(*) = 0 then 'ok: anon cannot read deal_sends'
            else 'FAIL: anon can read deal_sends' end from public.deal_sends;
do $$
begin
  begin
    insert into public.deal_sends (deal_id, channel, sent_by)
    select id, 'email', rep_id from public.deals limit 1;
    raise notice 'FAIL: anon inserted a send';
  exception when others then
    raise notice 'ok: anon cannot log sends';
  end;
end $$;
reset role;
