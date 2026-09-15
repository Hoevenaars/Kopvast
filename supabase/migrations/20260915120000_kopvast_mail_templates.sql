-- Standaard mailtemplates voor bevestigingen, interne meldingen en acquisitie.
-- Alleen server-side via service role.

CREATE TABLE IF NOT EXISTS public.kopvast_mail_templates (
  key text PRIMARY KEY,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

ALTER TABLE public.kopvast_mail_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.kopvast_mail_templates FROM anon, authenticated;
