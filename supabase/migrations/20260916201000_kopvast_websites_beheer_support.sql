-- Websites, beheer en support. Uitbreiding op projecten en verzoeken.

ALTER TABLE public.kopvast_projects
  ADD COLUMN IF NOT EXISTS primary_domain text,
  ADD COLUMN IF NOT EXISTS preview_url text,
  ADD COLUMN IF NOT EXISTS production_url text,
  ADD COLUMN IF NOT EXISTS monthly_amount numeric,
  ADD COLUMN IF NOT EXISTS included_note text,
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS technical_note text;

ALTER TABLE public.kopvast_projects DROP CONSTRAINT IF EXISTS kopvast_projects_status_check;
ALTER TABLE public.kopvast_projects
  ADD CONSTRAINT kopvast_projects_status_check
  CHECK (status = ANY (ARRAY[
    'voorbereiding',
    'in_uitvoering',
    'wacht_op_klant',
    'opgeleverd',
    'live',
    'gepauzeerd',
    'opgezegd'
  ]));

ALTER TABLE public.kopvast_requests
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.kopvast_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS classification text;

ALTER TABLE public.kopvast_requests DROP CONSTRAINT IF EXISTS kopvast_requests_type_check;
ALTER TABLE public.kopvast_requests
  ADD CONSTRAINT kopvast_requests_type_check
  CHECK (type = ANY (ARRAY['wijziging', 'vraag', 'content', 'post_launch']));

ALTER TABLE public.kopvast_requests DROP CONSTRAINT IF EXISTS kopvast_requests_status_check;
ALTER TABLE public.kopvast_requests
  ADD CONSTRAINT kopvast_requests_status_check
  CHECK (status = ANY (ARRAY[
    'nieuw',
    'in_behandeling',
    'wacht_op_klant',
    'klaar',
    'gesloten',
    'afgewezen'
  ]));

ALTER TABLE public.kopvast_requests DROP CONSTRAINT IF EXISTS kopvast_requests_classification_check;
ALTER TABLE public.kopvast_requests
  ADD CONSTRAINT kopvast_requests_classification_check
  CHECK (
    classification IS NULL
    OR classification = ANY (ARRAY['inbegrepen', 'extra_werk', 'offerte_nodig'])
  );

CREATE INDEX IF NOT EXISTS kopvast_projects_type_idx ON public.kopvast_projects (type);
CREATE INDEX IF NOT EXISTS kopvast_requests_status_idx ON public.kopvast_requests (status);
CREATE INDEX IF NOT EXISTS kopvast_requests_project_idx ON public.kopvast_requests (project_id);

UPDATE public.kopvast_projects
SET
  monthly_amount = COALESCE(monthly_amount, 199),
  included_note = COALESCE(
    included_note,
    'Je website blijft technisch gezond, actueel en bruikbaar. Wij houden de basis op orde en zorgen dat kleine wijzigingen niet blijven liggen.'
  )
WHERE type = 'beheer';
