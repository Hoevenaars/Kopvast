-- Facturatie v1: vastleggen wat afgesproken is en of het gefactureerd/betaald is.
-- Geen boekhoudkoppeling. OVERDUE wordt afgeleid, niet opgeslagen.

CREATE TABLE IF NOT EXISTS public.kopvast_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.kopvast_organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.kopvast_projects(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount_ex_vat numeric(12,2) NOT NULL CHECK (amount_ex_vat >= 0),
  status text NOT NULL DEFAULT 'NOT_INVOICED'
    CHECK (status = ANY (ARRAY['NOT_INVOICED','INVOICED','PAID','CANCELLED'])),
  invoice_number text,
  invoice_date date,
  due_date date,
  external_reference text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kopvast_recurring (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.kopvast_organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.kopvast_projects(id) ON DELETE SET NULL,
  monthly_amount numeric(12,2) NOT NULL CHECK (monthly_amount >= 0),
  start_date date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  billing_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kopvast_invoices_org_idx ON public.kopvast_invoices (organization_id);
CREATE INDEX IF NOT EXISTS kopvast_invoices_status_idx ON public.kopvast_invoices (status);
CREATE INDEX IF NOT EXISTS kopvast_invoices_due_idx ON public.kopvast_invoices (due_date);
CREATE INDEX IF NOT EXISTS kopvast_recurring_org_idx ON public.kopvast_recurring (organization_id);
CREATE INDEX IF NOT EXISTS kopvast_recurring_active_idx ON public.kopvast_recurring (active);

ALTER TABLE public.kopvast_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_recurring ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.kopvast_invoices FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_recurring FROM anon, authenticated;
