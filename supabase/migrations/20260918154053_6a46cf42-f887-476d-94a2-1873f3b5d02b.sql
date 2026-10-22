CREATE TABLE public.deal_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_at timestamptz NOT NULL,
  note text,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deal_follow_ups_note_length CHECK (note IS NULL OR char_length(note) <= 500)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_follow_ups TO authenticated;
GRANT ALL ON public.deal_follow_ups TO service_role;

ALTER TABLE public.deal_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reps read accessible deal follow ups"
ON public.deal_follow_ups
FOR SELECT
TO authenticated
USING (public.owns_deal(deal_id));

CREATE POLICY "reps create own deal follow ups"
ON public.deal_follow_ups
FOR INSERT
TO authenticated
WITH CHECK (public.owns_deal(deal_id) AND owner_id = auth.uid());

CREATE POLICY "reps update accessible deal follow ups"
ON public.deal_follow_ups
FOR UPDATE
TO authenticated
USING (public.owns_deal(deal_id))
WITH CHECK (public.owns_deal(deal_id) AND (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "reps delete accessible deal follow ups"
ON public.deal_follow_ups
FOR DELETE
TO authenticated
USING (public.owns_deal(deal_id));

CREATE INDEX deal_follow_ups_deal_due_idx
ON public.deal_follow_ups (deal_id, completed_at, due_at);

CREATE INDEX deal_follow_ups_owner_due_idx
ON public.deal_follow_ups (owner_id, completed_at, due_at);

CREATE OR REPLACE FUNCTION public.set_deal_follow_up_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_deal_follow_ups_updated_at
BEFORE UPDATE ON public.deal_follow_ups
FOR EACH ROW EXECUTE FUNCTION public.set_deal_follow_up_updated_at();