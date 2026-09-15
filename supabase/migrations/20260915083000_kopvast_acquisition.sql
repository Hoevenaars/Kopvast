-- Acquisitiemodule bovenop Website Refresh.
-- Geen tweede prospectdatabase: uitbreiding van bestaande tabellen + contact/suppression.

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_status_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_status_check CHECK (
  status = ANY (ARRAY[
    'NEW','VALIDATING','SCANNING','SCAN_FAILED','ANALYSING','QUALIFIED','WATCHLIST',
    'SALES_READY','PRIORITY','REJECTED','PREVIEW_READY','ARCHIVED','CONVERTED'
  ])
);

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS product_fit text,
  ADD COLUMN IF NOT EXISTS contact_status text NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS contact_source text,
  ADD COLUMN IF NOT EXISTS consent_source text,
  ADD COLUMN IF NOT EXISTS consent_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS do_not_contact boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legal_note text,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz,
  ADD COLUMN IF NOT EXISTS mail_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS response_status text,
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS next_action_at timestamptz,
  ADD COLUMN IF NOT EXISTS inbound_lead_id uuid REFERENCES public.inbound_leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS public_check_token text,
  ADD COLUMN IF NOT EXISTS auto_outreach_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scan_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cost numeric NOT NULL DEFAULT 0;

UPDATE public.prospects SET last_activity_at = COALESCE(last_scan_at, updated_at, created_at) WHERE last_activity_at IS NULL;

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_product_fit_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_product_fit_check CHECK (
  product_fit IS NULL OR product_fit = ANY (ARRAY['STANDARD_FIT','CUSTOM_FIT','NOT_FIT','REVIEW_REQUIRED'])
);

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_contact_status_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_contact_status_check CHECK (
  contact_status = ANY (ARRAY['UNKNOWN','CONSENTED','EXISTING_CUSTOMER','OTHER_VALID_BASIS','DO_NOT_CONTACT','BLOCKED'])
);

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_mail_status_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_mail_status_check CHECK (
  mail_status = ANY (ARRAY['none','draft','queued','sent','delivered','bounced','failed','cancelled'])
);

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_response_status_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_response_status_check CHECK (
  response_status IS NULL OR response_status = ANY (ARRAY['NO_RESPONSE','POSITIVE','QUESTION','MEETING','NOT_INTERESTED','UNSUBSCRIBED'])
);

CREATE UNIQUE INDEX IF NOT EXISTS prospects_public_check_token_idx
  ON public.prospects (public_check_token) WHERE public_check_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS prospects_last_activity_at_idx ON public.prospects (last_activity_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS prospects_mail_status_idx ON public.prospects (mail_status);
CREATE INDEX IF NOT EXISTS prospects_product_fit_idx ON public.prospects (product_fit);
CREATE INDEX IF NOT EXISTS prospects_response_status_idx ON public.prospects (response_status);

CREATE TABLE IF NOT EXISTS public.prospect_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  email text NOT NULL,
  email_source text NOT NULL DEFAULT 'admin',
  email_verification_status text NOT NULL DEFAULT 'UNKNOWN',
  contact_status text NOT NULL DEFAULT 'UNKNOWN',
  consent_source text,
  consent_timestamp timestamptz,
  do_not_contact boolean NOT NULL DEFAULT false,
  legal_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prospect_contacts_email_source_check CHECK (
    email_source = ANY (ARRAY['admin','websitecheck','aanvraag','manual','import'])
  ),
  CONSTRAINT prospect_contacts_verification_check CHECK (
    email_verification_status = ANY (ARRAY['UNKNOWN','VALID','INVALID','BOUNCED'])
  ),
  CONSTRAINT prospect_contacts_status_check CHECK (
    contact_status = ANY (ARRAY['UNKNOWN','CONSENTED','EXISTING_CUSTOMER','OTHER_VALID_BASIS','DO_NOT_CONTACT','BLOCKED'])
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS prospect_contacts_prospect_email_idx
  ON public.prospect_contacts (prospect_id, lower(email));
CREATE INDEX IF NOT EXISTS prospect_contacts_email_idx
  ON public.prospect_contacts (lower(email));
CREATE INDEX IF NOT EXISTS prospect_contacts_prospect_id_idx
  ON public.prospect_contacts (prospect_id);

CREATE TABLE IF NOT EXISTS public.suppression_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  domain text,
  reason text NOT NULL,
  source text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT suppression_email_or_domain CHECK (email IS NOT NULL OR domain IS NOT NULL),
  CONSTRAINT suppression_reason_check CHECK (
    reason = ANY (ARRAY['UNSUBSCRIBED','BOUNCED','COMPLAINT','MANUAL_BLOCK','LEGAL_BLOCK'])
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS suppression_entries_email_idx
  ON public.suppression_entries (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS suppression_entries_domain_idx
  ON public.suppression_entries (lower(domain)) WHERE domain IS NOT NULL;

ALTER TABLE public.website_scans
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS canonical_domain text,
  ADD COLUMN IF NOT EXISTS progress jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.product_fit_checks
  ADD COLUMN IF NOT EXISTS fit_label text;

ALTER TABLE public.product_fit_checks DROP CONSTRAINT IF EXISTS product_fit_checks_fit_label_check;
ALTER TABLE public.product_fit_checks ADD CONSTRAINT product_fit_checks_fit_label_check CHECK (
  fit_label IS NULL OR fit_label = ANY (ARRAY['STANDARD_FIT','CUSTOM_FIT','NOT_FIT','REVIEW_REQUIRED'])
);

ALTER TABLE public.email_messages DROP CONSTRAINT IF EXISTS email_messages_kind_check;
ALTER TABLE public.email_messages ADD CONSTRAINT email_messages_kind_check CHECK (
  kind = ANY (ARRAY['internal_notification','customer_confirmation','acquisition_outreach','acquisition_test'])
);

ALTER TABLE public.email_messages
  ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.prospect_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scan_id uuid REFERENCES public.website_scans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS analysis_id uuid,
  ADD COLUMN IF NOT EXISTS body_text text,
  ADD COLUMN IF NOT EXISTS body_html text,
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'resend',
  ADD COLUMN IF NOT EXISTS template_version text,
  ADD COLUMN IF NOT EXISTS prompt_version text,
  ADD COLUMN IF NOT EXISTS findings_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS email_mode text,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS intended_to_email text,
  ADD COLUMN IF NOT EXISTS queued_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS send_locked_at timestamptz;

ALTER TABLE public.email_messages DROP CONSTRAINT IF EXISTS email_messages_status_check;
ALTER TABLE public.email_messages ADD CONSTRAINT email_messages_status_check CHECK (
  status = ANY (ARRAY['queued','sent','delivered','bounced','failed','draft','cancelled'])
);

ALTER TABLE public.email_messages DROP CONSTRAINT IF EXISTS email_messages_mode_check;
ALTER TABLE public.email_messages ADD CONSTRAINT email_messages_mode_check CHECK (
  email_mode IS NULL OR email_mode = ANY (ARRAY['TEST','LIVE'])
);

CREATE UNIQUE INDEX IF NOT EXISTS email_messages_idempotency_key_idx
  ON public.email_messages (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS email_messages_prospect_id_idx ON public.email_messages (prospect_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS email_messages_live_scan_idx
  ON public.email_messages (contact_id, scan_id)
  WHERE kind = 'acquisition_outreach'
    AND email_mode = 'LIVE'
    AND status = ANY (ARRAY['queued','sent','delivered']);

ALTER TABLE public.email_events
  ADD COLUMN IF NOT EXISTS provider_event_id text;

CREATE UNIQUE INDEX IF NOT EXISTS email_events_provider_event_id_idx
  ON public.email_events (provider_event_id) WHERE provider_event_id IS NOT NULL;

ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_actor_type_check;
ALTER TABLE public.activity_logs ADD CONSTRAINT activity_logs_actor_type_check CHECK (
  actor_type = ANY (ARRAY['system','agent','human','workflow','user','webhook'])
);

ALTER TABLE public.cost_events DROP CONSTRAINT IF EXISTS cost_events_type_check;
ALTER TABLE public.cost_events ADD CONSTRAINT cost_events_type_check CHECK (
  cost_type = ANY (ARRAY['ai','browser','hosting','data','preview','email','other'])
);

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS score_rejected_max integer NOT NULL DEFAULT 49,
  ADD COLUMN IF NOT EXISTS score_watchlist_max integer NOT NULL DEFAULT 64,
  ADD COLUMN IF NOT EXISTS score_qualified_max integer NOT NULL DEFAULT 79,
  ADD COLUMN IF NOT EXISTS score_sales_ready_max integer NOT NULL DEFAULT 89,
  ADD COLUMN IF NOT EXISTS email_mode text NOT NULL DEFAULT 'TEST',
  ADD COLUMN IF NOT EXISTS test_email text NOT NULL DEFAULT 'contact@kopvast.nl';

ALTER TABLE public.inbound_leads
  ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS inbound_leads_prospect_id_idx ON public.inbound_leads (prospect_id);

ALTER TABLE public.prospect_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppression_entries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.prospect_contacts FROM anon, authenticated;
REVOKE ALL ON TABLE public.suppression_entries FROM anon, authenticated;
