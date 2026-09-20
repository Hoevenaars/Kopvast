-- Agent 0: minimale commerciële kolommen + orders gekoppeld aan WR proposals.
-- Geen tweede CRM. Geen kopvast_proposals.

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS commercial_intent text,
  ADD COLUMN IF NOT EXISTS commercial_stage text;

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_commercial_intent_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_commercial_intent_check CHECK (
  commercial_intent IS NULL OR commercial_intent = ANY (ARRAY['NONE','MORE_INFO','PROPOSAL'])
);

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_commercial_stage_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_commercial_stage_check CHECK (
  commercial_stage IS NULL OR commercial_stage = ANY (ARRAY[
    'PROSPECT','ENGAGED','REQUESTED','QUALIFIED','PROPOSAL','WON','CUSTOMER'
  ])
);

ALTER TABLE public.inbound_leads
  ADD COLUMN IF NOT EXISTS commercial_intent text,
  ADD COLUMN IF NOT EXISTS commercial_stage text;

ALTER TABLE public.inbound_leads DROP CONSTRAINT IF EXISTS inbound_leads_commercial_intent_check;
ALTER TABLE public.inbound_leads ADD CONSTRAINT inbound_leads_commercial_intent_check CHECK (
  commercial_intent IS NULL OR commercial_intent = ANY (ARRAY['NONE','MORE_INFO','PROPOSAL'])
);

ALTER TABLE public.inbound_leads DROP CONSTRAINT IF EXISTS inbound_leads_commercial_stage_check;
ALTER TABLE public.inbound_leads ADD CONSTRAINT inbound_leads_commercial_stage_check CHECK (
  commercial_stage IS NULL OR commercial_stage = ANY (ARRAY[
    'PROSPECT','ENGAGED','REQUESTED','QUALIFIED','PROPOSAL','WON','CUSTOMER'
  ])
);

CREATE INDEX IF NOT EXISTS prospects_commercial_stage_idx
  ON public.prospects (commercial_stage);
CREATE INDEX IF NOT EXISTS inbound_leads_prospect_id_idx
  ON public.inbound_leads (prospect_id);
CREATE INDEX IF NOT EXISTS inbound_leads_commercial_stage_idx
  ON public.inbound_leads (commercial_stage);

CREATE UNIQUE INDEX IF NOT EXISTS proposals_active_draft_per_request_idx
  ON public.proposals (request_id)
  WHERE request_id IS NOT NULL AND status = ANY (ARRAY['DRAFT','READY']);

CREATE TABLE IF NOT EXISTS public.kopvast_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  order_number text NOT NULL UNIQUE,
  proposal_id uuid NOT NULL UNIQUE,
  organization_id uuid NOT NULL REFERENCES public.kopvast_organizations(id) ON DELETE RESTRICT,
  inbound_lead_id uuid REFERENCES public.inbound_leads(id) ON DELETE SET NULL,
  product_type text NOT NULL
    CHECK (product_type = ANY (ARRAY['website','beheer','merkrefresh','sjablonen','maatwerk'])),
  product_label text NOT NULL,
  status text NOT NULL DEFAULT 'NEW'
    CHECK (status = ANY (ARRAY[
      'NEW','ONBOARDING','READY_FOR_PRODUCTION','IN_PRODUCTION','CLIENT_REVIEW',
      'CHANGES','APPROVED','READY_TO_LAUNCH','LIVE','COMPLETED','ON_HOLD'
    ])),
  agreed_price_amount numeric,
  agreed_price_label text,
  agreed_price_cadence text,
  include_recurring_beheer boolean NOT NULL DEFAULT false,
  recurring_price_amount numeric,
  recurring_price_label text,
  scope text,
  proposal_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  target_live_at date,
  next_action text,
  next_action_at date,
  next_action_owner text,
  production_notes text,
  review_notes text,
  visited_statuses jsonb NOT NULL DEFAULT '["NEW"]'::jsonb
);

CREATE INDEX IF NOT EXISTS kopvast_orders_org_idx ON public.kopvast_orders (organization_id);
CREATE INDEX IF NOT EXISTS kopvast_orders_status_idx ON public.kopvast_orders (status);
CREATE INDEX IF NOT EXISTS kopvast_orders_next_action_at_idx ON public.kopvast_orders (next_action_at);

CREATE TABLE IF NOT EXISTS public.kopvast_onboardings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.kopvast_orders(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.kopvast_organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status = ANY (ARRAY['OPEN','IN_PROGRESS','DONE'])),
  progress jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kopvast_websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.kopvast_orders(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.kopvast_organizations(id) ON DELETE CASCADE,
  domain text,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status = ANY (ARRAY['planned','building','review','live'])),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kopvast_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.kopvast_orders(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.kopvast_organizations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind = ANY (ARRAY['deposit','final','recurring'])),
  amount numeric,
  label text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status = ANY (ARRAY['draft','sent','paid','cancelled'])),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kopvast_invoices_order_idx ON public.kopvast_invoices (order_id);

CREATE TABLE IF NOT EXISTS public.kopvast_order_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.kopvast_orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_type text NOT NULL DEFAULT 'human'
    CHECK (actor_type = ANY (ARRAY['system','human'])),
  actor_id text,
  old_status text,
  new_status text,
  body text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kopvast_order_activities_order_idx
  ON public.kopvast_order_activities (order_id, created_at DESC);

ALTER TABLE public.kopvast_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_onboardings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_order_activities ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.kopvast_orders FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_onboardings FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_websites FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_invoices FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_order_activities FROM anon, authenticated;
