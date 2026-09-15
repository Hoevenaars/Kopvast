-- Kopvast klant- en adminconsole. Alleen server-side via service role.
-- Toegepast op Website Refresh.

CREATE TABLE IF NOT EXISTS public.kopvast_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  website text,
  status text NOT NULL DEFAULT 'onboarding'
    CHECK (status = ANY (ARRAY['lead','onboarding','active','paused','ended'])),
  inbound_lead_id uuid REFERENCES public.inbound_leads(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  notes text
);

CREATE TABLE IF NOT EXISTS public.kopvast_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.kopvast_organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'owner'
    CHECK (role = ANY (ARRAY['owner','member'])),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);

CREATE TABLE IF NOT EXISTS public.kopvast_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.kopvast_organizations(id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type = ANY (ARRAY['website','beheer','merkrefresh','sjablonen','maatwerk'])),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'voorbereiding'
    CHECK (status = ANY (ARRAY['voorbereiding','in_uitvoering','wacht_op_klant','opgeleverd','live','opgezegd'])),
  price_label text,
  started_at date,
  due_at date,
  live_at date,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kopvast_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.kopvast_organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL
    CHECK (kind = ANY (ARRAY['logo','huisstijl','foto','tekst','bestand','link'])),
  url text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kopvast_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.kopvast_organizations(id) ON DELETE CASCADE,
  created_by_email text,
  type text NOT NULL DEFAULT 'wijziging'
    CHECK (type = ANY (ARRAY['wijziging','vraag','content'])),
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'nieuw'
    CHECK (status = ANY (ARRAY['nieuw','in_behandeling','wacht_op_klant','klaar','afgewezen'])),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kopvast_login_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  purpose text NOT NULL CHECK (purpose = ANY (ARRAY['console','admin'])),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kopvast_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['customer','admin'])),
  organization_id uuid REFERENCES public.kopvast_organizations(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kopvast_members_email_idx ON public.kopvast_members (lower(email));
CREATE INDEX IF NOT EXISTS kopvast_sessions_email_idx ON public.kopvast_sessions (lower(email));
CREATE INDEX IF NOT EXISTS kopvast_login_tokens_email_idx ON public.kopvast_login_tokens (lower(email));
CREATE INDEX IF NOT EXISTS kopvast_projects_org_idx ON public.kopvast_projects (organization_id);
CREATE INDEX IF NOT EXISTS kopvast_assets_org_idx ON public.kopvast_assets (organization_id);
CREATE INDEX IF NOT EXISTS kopvast_requests_org_idx ON public.kopvast_requests (organization_id);
CREATE INDEX IF NOT EXISTS kopvast_organizations_lead_idx ON public.kopvast_organizations (inbound_lead_id);

ALTER TABLE public.kopvast_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_login_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.kopvast_organizations FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_members FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_projects FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_assets FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_requests FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_login_tokens FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_sessions FROM anon, authenticated;
