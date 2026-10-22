CREATE TABLE public.partner_view_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  admin_user_id uuid NOT NULL,
  effective_member_id uuid NOT NULL REFERENCES public.partner_members(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.partner_organizations(id) ON DELETE CASCADE,
  effective_role public.partner_member_role NOT NULL,
  mode text NOT NULL DEFAULT 'view' CHECK (mode IN ('view','work')),
  return_path text NOT NULL DEFAULT '/partners',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

GRANT ALL ON public.partner_view_sessions TO service_role;

ALTER TABLE public.partner_view_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX partner_view_sessions_admin_idx ON public.partner_view_sessions (admin_user_id, created_at DESC);