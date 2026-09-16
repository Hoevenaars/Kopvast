-- Recurring beheer voor facturatie v1.
-- kopvast_invoices bestaat al via orders en klantdossier, met andere kolommen.
-- Deze migratie maakt die tabel daarom niet opnieuw aan.

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

CREATE INDEX IF NOT EXISTS kopvast_recurring_org_idx ON public.kopvast_recurring (organization_id);
CREATE INDEX IF NOT EXISTS kopvast_recurring_active_idx ON public.kopvast_recurring (active);

ALTER TABLE public.kopvast_recurring ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.kopvast_recurring FROM anon, authenticated;
