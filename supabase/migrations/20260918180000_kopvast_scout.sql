-- Kopvast Scout: mobiele acquisitie-ingang.
-- Tabellen volgen de specificatie (leads, website_scans, outreach_drafts, lead_events)
-- met scout_ prefix zodat bestaande Website Refresh-tabellen onaangetast blijven.

CREATE TABLE IF NOT EXISTS public.scout_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  url text NOT NULL,
  domain text NOT NULL,
  canonical_url text,
  company_name text,
  note text,
  industry text,
  city text,
  description text,
  email text,
  phone text,
  linkedin_url text,
  source text NOT NULL DEFAULT 'scout_manual',
  status text NOT NULL DEFAULT 'nieuw',
  pipeline_stage text NOT NULL DEFAULT 'capture',
  score integer,
  why_interesting text,
  commercial_summary text,
  biggest_opportunity text,
  opportunities jsonb NOT NULL DEFAULT '[]'::jsonb,
  enrichment jsonb NOT NULL DEFAULT '{}'::jsonb,
  prospect_id uuid,
  last_scan_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scout_leads_source_check CHECK (
    source = ANY (ARRAY[
      'scout_manual','safari_share','camera','nearby','prospect_scanner','import','shortcut','clipboard'
    ])
  ),
  CONSTRAINT scout_leads_status_check CHECK (
    status = ANY (ARRAY[
      'nieuw','scannen','geanalyseerd','concept_klaar','benaderd','reactie','kans','gewonnen','afgevallen','scan_mislukt'
    ])
  ),
  CONSTRAINT scout_leads_score_check CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

CREATE UNIQUE INDEX IF NOT EXISTS scout_leads_user_domain_idx
  ON public.scout_leads (user_id, domain);
CREATE INDEX IF NOT EXISTS scout_leads_user_status_idx
  ON public.scout_leads (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS scout_leads_user_score_idx
  ON public.scout_leads (user_id, score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS scout_leads_source_idx
  ON public.scout_leads (source, created_at DESC);
CREATE INDEX IF NOT EXISTS scout_leads_prospect_id_idx
  ON public.scout_leads (prospect_id)
  WHERE prospect_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.scout_website_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.scout_leads(id) ON DELETE CASCADE,
  technical_score integer,
  conversion_score integer,
  design_score integer,
  brand_score integer,
  content_score integer,
  overall_score integer,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  opportunities jsonb NOT NULL DEFAULT '[]'::jsonb,
  commercial_summary text,
  raw_scan_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scout_scans_status_check CHECK (
    status = ANY (ARRAY['queued','running','completed','failed'])
  )
);

CREATE INDEX IF NOT EXISTS scout_website_scans_lead_id_idx
  ON public.scout_website_scans (lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.scout_outreach_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.scout_leads(id) ON DELETE CASCADE,
  subject text,
  message text,
  channel text NOT NULL DEFAULT 'email',
  status text NOT NULL DEFAULT 'draft',
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scout_drafts_channel_check CHECK (channel = ANY (ARRAY['email','linkedin','other'])),
  CONSTRAINT scout_drafts_status_check CHECK (status = ANY (ARRAY['draft','approved','sent']))
);

CREATE INDEX IF NOT EXISTS scout_outreach_drafts_lead_id_idx
  ON public.scout_outreach_drafts (lead_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS scout_outreach_drafts_status_idx
  ON public.scout_outreach_drafts (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.scout_lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.scout_leads(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_type text NOT NULL DEFAULT 'system',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scout_lead_events_type_check CHECK (
    event_type = ANY (ARRAY[
      'lead_created','scan_started','scan_completed','scan_failed','draft_generated',
      'draft_modified','draft_approved','contacted','response_received',
      'opportunity_created','won','lost','email_sent','rescan_requested'
    ])
  )
);

CREATE INDEX IF NOT EXISTS scout_lead_events_lead_id_idx
  ON public.scout_lead_events (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS scout_lead_events_type_idx
  ON public.scout_lead_events (event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.scout_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.scout_leads(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'pipeline',
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 4,
  run_after timestamptz NOT NULL DEFAULT now(),
  idempotency_key text NOT NULL,
  last_error text,
  locked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scout_jobs_status_check CHECK (
    status = ANY (ARRAY['pending','running','completed','failed','cancelled'])
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS scout_jobs_idempotency_key_idx
  ON public.scout_jobs (idempotency_key);
CREATE INDEX IF NOT EXISTS scout_jobs_pending_idx
  ON public.scout_jobs (run_after)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.scout_rate_limits (
  id text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scout_sessions_user_id_idx ON public.scout_sessions (user_id);

CREATE OR REPLACE FUNCTION public.scout_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scout_leads_updated_at ON public.scout_leads;
CREATE TRIGGER scout_leads_updated_at
  BEFORE UPDATE ON public.scout_leads
  FOR EACH ROW EXECUTE FUNCTION public.scout_set_updated_at();

DROP TRIGGER IF EXISTS scout_outreach_drafts_updated_at ON public.scout_outreach_drafts;
CREATE TRIGGER scout_outreach_drafts_updated_at
  BEFORE UPDATE ON public.scout_outreach_drafts
  FOR EACH ROW EXECUTE FUNCTION public.scout_set_updated_at();

DROP TRIGGER IF EXISTS scout_jobs_updated_at ON public.scout_jobs;
CREATE TRIGGER scout_jobs_updated_at
  BEFORE UPDATE ON public.scout_jobs
  FOR EACH ROW EXECUTE FUNCTION public.scout_set_updated_at();

ALTER TABLE public.scout_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_website_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_outreach_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.scout_leads FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.scout_website_scans FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.scout_outreach_drafts FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.scout_lead_events FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.scout_jobs FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.scout_rate_limits FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.scout_sessions FROM anon, authenticated, PUBLIC;

GRANT ALL ON TABLE public.scout_leads TO service_role;
GRANT ALL ON TABLE public.scout_website_scans TO service_role;
GRANT ALL ON TABLE public.scout_outreach_drafts TO service_role;
GRANT ALL ON TABLE public.scout_lead_events TO service_role;
GRANT ALL ON TABLE public.scout_jobs TO service_role;
GRANT ALL ON TABLE public.scout_rate_limits TO service_role;
GRANT ALL ON TABLE public.scout_sessions TO service_role;

DROP POLICY IF EXISTS scout_leads_owner_all ON public.scout_leads;
CREATE POLICY scout_leads_owner_all ON public.scout_leads
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS scout_scans_owner_all ON public.scout_website_scans;
CREATE POLICY scout_scans_owner_all ON public.scout_website_scans
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scout_leads l
      WHERE l.id = scout_website_scans.lead_id AND l.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scout_leads l
      WHERE l.id = scout_website_scans.lead_id AND l.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS scout_drafts_owner_all ON public.scout_outreach_drafts;
CREATE POLICY scout_drafts_owner_all ON public.scout_outreach_drafts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scout_leads l
      WHERE l.id = scout_outreach_drafts.lead_id AND l.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scout_leads l
      WHERE l.id = scout_outreach_drafts.lead_id AND l.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS scout_events_owner_all ON public.scout_lead_events;
CREATE POLICY scout_events_owner_all ON public.scout_lead_events
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scout_leads l
      WHERE l.id = scout_lead_events.lead_id AND l.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scout_leads l
      WHERE l.id = scout_lead_events.lead_id AND l.user_id = auth.uid()
    )
  );
