-- Productie, klantreview en livegang. Alleen server-side via service role.

CREATE TABLE IF NOT EXISTS public.kopvast_productions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.kopvast_organizations (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.kopvast_projects (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ready_for_production'
    CHECK (status = ANY (ARRAY[
      'ready_for_production',
      'in_production',
      'client_review',
      'changes',
      'approved',
      'ready_to_launch',
      'live'
    ])),
  preview_url text,
  review_message text,
  next_action text,
  blockers text,
  due_at date,
  live_at timestamptz,
  onboarding_complete boolean NOT NULL DEFAULT false,
  scope text,
  launch_checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);

CREATE TABLE IF NOT EXISTS public.kopvast_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id uuid NOT NULL REFERENCES public.kopvast_productions (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.kopvast_organizations (id) ON DELETE CASCADE,
  page_section text NOT NULL,
  body text NOT NULL,
  file_url text,
  file_name text,
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status = ANY (ARRAY['OPEN', 'IN_PROGRESS', 'DONE'])),
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kopvast_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id uuid NOT NULL REFERENCES public.kopvast_productions (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.kopvast_organizations (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind = ANY (ARRAY['concept', 'final'])),
  name text NOT NULL,
  email text NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kopvast_production_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id uuid NOT NULL REFERENCES public.kopvast_productions (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.kopvast_organizations (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_email text,
  detail text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kopvast_productions_status_idx
  ON public.kopvast_productions (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS kopvast_productions_org_idx
  ON public.kopvast_productions (organization_id);
CREATE INDEX IF NOT EXISTS kopvast_change_requests_production_idx
  ON public.kopvast_change_requests (production_id, status);
CREATE INDEX IF NOT EXISTS kopvast_approvals_production_idx
  ON public.kopvast_approvals (production_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kopvast_production_activity_idx
  ON public.kopvast_production_activity (production_id, created_at DESC);

ALTER TABLE public.kopvast_productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_production_activity ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.kopvast_productions FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_change_requests FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_approvals FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_production_activity FROM anon, authenticated;
