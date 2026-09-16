-- Klantdossier: voorstellen, facturen, notities, support, merk, activiteit en review.

CREATE TABLE IF NOT EXISTS public.kopvast_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.kopvast_organizations(id) ON DELETE SET NULL,
  inbound_lead_id uuid REFERENCES public.inbound_leads(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text,
  status text NOT NULL DEFAULT 'concept'
    CHECK (status = ANY (ARRAY['concept','verstuurd','geaccepteerd','afgewezen','review'])),
  product_type text NOT NULL DEFAULT 'website',
  amount_label text,
  contact_name text,
  contact_email text,
  company_name text,
  website text,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kopvast_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.kopvast_organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.kopvast_projects(id) ON DELETE SET NULL,
  number text,
  title text NOT NULL,
  amount_label text,
  status text NOT NULL DEFAULT 'concept'
    CHECK (status = ANY (ARRAY['concept','verstuurd','betaald','vervallen'])),
  issued_at date,
  due_at date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kopvast_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.kopvast_organizations(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kopvast_support (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.kopvast_organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status = ANY (ARRAY['open','in_behandeling','wacht_op_klant','klaar'])),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kopvast_brand_profiles (
  organization_id uuid PRIMARY KEY REFERENCES public.kopvast_organizations(id) ON DELETE CASCADE,
  name text,
  tagline text,
  primary_color text,
  secondary_color text,
  typography text,
  tone text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kopvast_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.kopvast_organizations(id) ON DELETE CASCADE,
  source text NOT NULL
    CHECK (source = ANY (ARRAY['prospect','request','proposal','order','onboarding','website','invoice','support','note','lead','system'])),
  event_type text NOT NULL,
  title text NOT NULL,
  detail text,
  actor_email text,
  related_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kopvast_customer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.kopvast_proposals(id) ON DELETE CASCADE,
  candidate_organization_id uuid NOT NULL REFERENCES public.kopvast_organizations(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status = ANY (ARRAY['open','merged','kept_separate'])),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kopvast_proposals_org_idx ON public.kopvast_proposals (organization_id);
CREATE INDEX IF NOT EXISTS kopvast_proposals_lead_idx ON public.kopvast_proposals (inbound_lead_id);
CREATE INDEX IF NOT EXISTS kopvast_invoices_org_idx ON public.kopvast_invoices (organization_id);
CREATE INDEX IF NOT EXISTS kopvast_notes_org_idx ON public.kopvast_notes (organization_id);
CREATE INDEX IF NOT EXISTS kopvast_support_org_idx ON public.kopvast_support (organization_id);
CREATE INDEX IF NOT EXISTS kopvast_activity_org_idx ON public.kopvast_activity (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kopvast_customer_reviews_open_idx ON public.kopvast_customer_reviews (status) WHERE status = 'open';

ALTER TABLE public.kopvast_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_support ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_customer_reviews ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.kopvast_proposals FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_invoices FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_notes FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_support FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_brand_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_activity FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_customer_reviews FROM anon, authenticated;
