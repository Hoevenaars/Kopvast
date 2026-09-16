-- Aanvragen-module: kwalificatie, call notes, next action en draft-voorstellen.
-- Scanner-tabellen blijven onaangeraakt.

ALTER TABLE public.inbound_leads
  ADD COLUMN IF NOT EXISTS product_fit text,
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS next_action_at timestamptz,
  ADD COLUMN IF NOT EXISTS call_notes text,
  ADD COLUMN IF NOT EXISTS qualification_notes text;

DO $$
DECLARE
  conname text;
BEGIN
  FOR conname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'inbound_leads'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.inbound_leads DROP CONSTRAINT IF EXISTS %I', conname);
  END LOOP;
END $$;

ALTER TABLE public.inbound_leads DROP CONSTRAINT IF EXISTS inbound_leads_status_check;
ALTER TABLE public.inbound_leads ADD CONSTRAINT inbound_leads_status_check CHECK (
  status = ANY (ARRAY[
    'NIEUW','MAATWERK_REVIEW','QUALIFIED','PROPOSAL_NEEDED','IN_GESPREK',
    'GEWONNEN','VERLOREN','OMGEZET','AFGEWEZEN'
  ])
);

ALTER TABLE public.inbound_leads DROP CONSTRAINT IF EXISTS inbound_leads_product_fit_check;
ALTER TABLE public.inbound_leads ADD CONSTRAINT inbound_leads_product_fit_check CHECK (
  product_fit IS NULL OR product_fit = ANY (ARRAY['STANDARD_FIT','CUSTOM_FIT','NOT_FIT','REVIEW_REQUIRED'])
);

UPDATE public.inbound_leads
SET product_fit = 'CUSTOM_FIT'
WHERE product_fit IS NULL
  AND (type = 'maatwerk' OR status = 'MAATWERK_REVIEW');

UPDATE public.inbound_leads
SET product_fit = 'STANDARD_FIT'
WHERE product_fit IS NULL;

CREATE INDEX IF NOT EXISTS inbound_leads_product_fit_idx ON public.inbound_leads (product_fit);
CREATE INDEX IF NOT EXISTS inbound_leads_status_idx ON public.inbound_leads (status);
CREATE INDEX IF NOT EXISTS inbound_leads_created_at_idx ON public.inbound_leads (created_at DESC);

CREATE TABLE IF NOT EXISTS public.kopvast_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inbound_lead_id uuid NOT NULL REFERENCES public.inbound_leads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'DRAFT',
  product_fit text,
  title text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kopvast_proposals_status_check CHECK (
    status = ANY (ARRAY['DRAFT','SENT','ACCEPTED','REJECTED'])
  ),
  CONSTRAINT kopvast_proposals_fit_check CHECK (
    product_fit IS NULL OR product_fit = ANY (ARRAY['STANDARD_FIT','CUSTOM_FIT','NOT_FIT','REVIEW_REQUIRED'])
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS kopvast_proposals_one_draft_idx
  ON public.kopvast_proposals (inbound_lead_id)
  WHERE status = 'DRAFT';

CREATE INDEX IF NOT EXISTS kopvast_proposals_lead_idx
  ON public.kopvast_proposals (inbound_lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.kopvast_proposal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.kopvast_proposals(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  amount_label text,
  cadence text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kopvast_proposal_lines_proposal_idx
  ON public.kopvast_proposal_lines (proposal_id, sort_order);

CREATE TABLE IF NOT EXISTS public.kopvast_lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inbound_lead_id uuid NOT NULL REFERENCES public.inbound_leads(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_type text NOT NULL DEFAULT 'human',
  actor_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kopvast_lead_activities_lead_idx
  ON public.kopvast_lead_activities (inbound_lead_id, created_at DESC);

ALTER TABLE public.kopvast_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_proposal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_lead_activities ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.kopvast_proposals FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_proposal_lines FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_lead_activities FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.kopvast_clear_acquisition_workspace()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prospects_n int;
  leads_n int;
  mails_n int;
BEGIN
  SELECT count(*) INTO prospects_n FROM public.prospects;
  SELECT count(*) INTO leads_n FROM public.inbound_leads;
  SELECT count(*) INTO mails_n FROM public.email_messages;

  UPDATE public.prospects SET inbound_lead_id = NULL WHERE inbound_lead_id IS NOT NULL;
  UPDATE public.inbound_leads SET prospect_id = NULL WHERE prospect_id IS NOT NULL;

  DELETE FROM public.email_events;
  DELETE FROM public.email_messages;
  DELETE FROM public.cost_events;
  DELETE FROM public.activity_logs;
  DELETE FROM public.findings;
  DELETE FROM public.prospect_scores;
  DELETE FROM public.product_fit_checks;
  DELETE FROM public.manual_reviews;
  DELETE FROM public.previews;
  DELETE FROM public.scanned_pages;
  DELETE FROM public.website_scans;
  DELETE FROM public.prospect_contacts;
  DELETE FROM public.prospect_sources;
  DELETE FROM public.kopvast_proposal_lines;
  DELETE FROM public.kopvast_proposals;
  DELETE FROM public.kopvast_lead_activities;
  DELETE FROM public.prospects;
  DELETE FROM public.inbound_leads;

  RETURN jsonb_build_object(
    'ok', true,
    'prospects', prospects_n,
    'leads', leads_n,
    'mails', mails_n,
    'cleared_at', now()
  );
END;
$$;
