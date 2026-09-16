-- Voorstellen: editor, versies, publieke pagina, vraag en akkoord.
-- Alleen server-side via service role.

CREATE TABLE IF NOT EXISTS public.kopvast_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  number text NOT NULL UNIQUE,
  version integer NOT NULL DEFAULT 1,
  type text NOT NULL DEFAULT 'maatwerk'
    CHECK (type = ANY (ARRAY['website','beheer','merkrefresh','sjablonen','maatwerk'])),
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status = ANY (ARRAY['DRAFT','SENT','VIEWED','QUESTION','ACCEPTED'])),
  title text NOT NULL DEFAULT '',
  intro text NOT NULL DEFAULT '',
  aanleiding text NOT NULL DEFAULT '',
  scope_summary text NOT NULL DEFAULT '',
  planning text NOT NULL DEFAULT '',
  validity_text text NOT NULL DEFAULT '',
  recipient_name text NOT NULL DEFAULT '',
  recipient_email text NOT NULL DEFAULT '',
  recipient_organization text NOT NULL DEFAULT '',
  organization_id uuid REFERENCES public.kopvast_organizations(id) ON DELETE SET NULL,
  inbound_lead_id uuid REFERENCES public.inbound_leads(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  current_token text UNIQUE,
  current_version_id uuid,
  subtotal_cents integer NOT NULL DEFAULT 0,
  recurring_monthly_cents integer NOT NULL DEFAULT 0,
  vat_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  question_text text,
  question_at timestamptz,
  accepted_at timestamptz,
  accepted_by_name text,
  accepted_by_email text,
  accepted_snapshot jsonb,
  handed_off_at timestamptz,
  created_by_email text
);

CREATE TABLE IF NOT EXISTS public.kopvast_proposal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.kopvast_proposals(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'scope'
    CHECK (kind = ANY (ARRAY['scope','recurring'])),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kopvast_proposal_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.kopvast_proposals(id) ON DELETE CASCADE,
  version integer NOT NULL,
  token text NOT NULL UNIQUE,
  snapshot jsonb NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  first_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, version)
);

CREATE TABLE IF NOT EXISTS public.kopvast_proposal_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.kopvast_proposals(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_type text NOT NULL DEFAULT 'system',
  actor_email text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kopvast_proposals_status_idx ON public.kopvast_proposals (status);
CREATE INDEX IF NOT EXISTS kopvast_proposals_sent_idx ON public.kopvast_proposals (sent_at DESC);
CREATE INDEX IF NOT EXISTS kopvast_proposals_lead_idx ON public.kopvast_proposals (inbound_lead_id);
CREATE INDEX IF NOT EXISTS kopvast_proposals_org_idx ON public.kopvast_proposals (organization_id);
CREATE INDEX IF NOT EXISTS kopvast_proposal_lines_proposal_idx ON public.kopvast_proposal_lines (proposal_id, sort_order);
CREATE INDEX IF NOT EXISTS kopvast_proposal_versions_proposal_idx ON public.kopvast_proposal_versions (proposal_id, version);
CREATE INDEX IF NOT EXISTS kopvast_proposal_activity_proposal_idx ON public.kopvast_proposal_activity (proposal_id, created_at DESC);

ALTER TABLE public.kopvast_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_proposal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_proposal_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_proposal_activity ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.kopvast_proposals FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_proposal_lines FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_proposal_versions FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_proposal_activity FROM anon, authenticated;
