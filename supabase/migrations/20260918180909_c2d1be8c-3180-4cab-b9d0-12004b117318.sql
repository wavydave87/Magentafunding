CREATE TYPE public.partner_invitation_status AS ENUM ('pending','accepted','expired','revoked');

CREATE TABLE public.partner_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.partner_organizations(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  full_name text,
  intended_role public.partner_member_role NOT NULL DEFAULT 'referral_rep',
  invited_by uuid,
  token_hash text NOT NULL,
  status public.partner_invitation_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  resend_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX partner_invitations_token_uidx ON public.partner_invitations (token_hash);
CREATE UNIQUE INDEX partner_invitations_live_uidx
  ON public.partner_invitations (organization_id, lower(invited_email))
  WHERE status = 'pending';
CREATE INDEX partner_invitations_org_idx ON public.partner_invitations (organization_id, created_at DESC);

GRANT SELECT ON public.partner_invitations TO authenticated;
GRANT ALL ON public.partner_invitations TO service_role;

ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal staff read invitations"
  ON public.partner_invitations FOR SELECT TO authenticated
  USING (public.is_internal_user());

CREATE POLICY "Org admins read their invitations"
  ON public.partner_invitations FOR SELECT TO authenticated
  USING (public.is_partner_org_admin() AND organization_id = public.current_partner_org());

CREATE TRIGGER partner_invitations_touch
  BEFORE UPDATE ON public.partner_invitations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.partner_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  website text,
  partner_type text,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.partner_inquiries TO anon;
GRANT INSERT ON public.partner_inquiries TO authenticated;
GRANT SELECT, UPDATE ON public.partner_inquiries TO authenticated;
GRANT ALL ON public.partner_inquiries TO service_role;

ALTER TABLE public.partner_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an inquiry"
  ON public.partner_inquiries FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Internal staff read inquiries"
  ON public.partner_inquiries FOR SELECT TO authenticated
  USING (public.is_internal_user());

CREATE POLICY "Internal staff update inquiries"
  ON public.partner_inquiries FOR UPDATE TO authenticated
  USING (public.is_internal_user())
  WITH CHECK (public.is_internal_user());

CREATE TRIGGER partner_inquiries_touch
  BEFORE UPDATE ON public.partner_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();