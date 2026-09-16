-- Opdrachten: commerciële afspraak (proposal) wordt operationele uitvoering (order).
-- Alleen server-side via service role.

CREATE TABLE IF NOT EXISTS public.kopvast_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.kopvast_organizations(id) ON DELETE SET NULL,
  inbound_lead_id uuid REFERENCES public.inbound_leads(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text,
  company_name text,
  website text,
  product_type text NOT NULL
    CHECK (product_type = ANY (ARRAY['website','beheer','merkrefresh','sjablonen','maatwerk'])),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status = ANY (ARRAY['DRAFT','SENT','ACCEPTED','DECLINED'])),
  price_amount numeric,
  price_label text,
  price_cadence text,
  include_recurring_beheer boolean NOT NULL DEFAULT false,
  recurring_price_amount numeric,
  recurring_price_label text,
  scope text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  accepted_at timestamptz
);

CREATE INDEX IF NOT EXISTS kopvast_proposals_lead_idx ON public.kopvast_proposals (inbound_lead_id);

CREATE TABLE IF NOT EXISTS public.kopvast_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  order_number text NOT NULL UNIQUE,
  proposal_id uuid NOT NULL UNIQUE REFERENCES public.kopvast_proposals(id) ON DELETE RESTRICT,
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

ALTER TABLE public.kopvast_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_onboardings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_order_activities ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.kopvast_proposals FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_orders FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_onboardings FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_websites FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_invoices FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_order_activities FROM anon, authenticated;
