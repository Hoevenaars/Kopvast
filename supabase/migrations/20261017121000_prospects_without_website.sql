-- Bedrijven zonder website: geen verplicht domein, geen fictief domein.
-- Bestaande prospects houden hun domein. Meerdere NULL-domeinen zijn toegestaan.
-- Deduplicatie zonder website gaat via identity_key (e-mail + bedrijfsnaam).

ALTER TABLE public.prospects
  ALTER COLUMN domain DROP NOT NULL,
  ALTER COLUMN website_url DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS identity_key text;

DROP INDEX IF EXISTS public.prospects_active_domain_idx;
CREATE UNIQUE INDEX prospects_active_domain_idx
  ON public.prospects (lower(domain))
  WHERE is_archived = false
    AND domain IS NOT NULL
    AND btrim(domain) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS prospects_identity_without_domain_idx
  ON public.prospects (identity_key)
  WHERE is_archived = false
    AND domain IS NULL
    AND identity_key IS NOT NULL;

ALTER TABLE public.scout_leads
  ALTER COLUMN url DROP NOT NULL,
  ALTER COLUMN domain DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS source_url text;

DROP INDEX IF EXISTS public.scout_leads_user_domain_idx;
CREATE UNIQUE INDEX scout_leads_user_domain_idx
  ON public.scout_leads (user_id, domain)
  WHERE domain IS NOT NULL
    AND btrim(domain) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS scout_leads_user_identity_without_domain_idx
  ON public.scout_leads (user_id, lower(email), lower(company_name))
  WHERE domain IS NULL
    AND email IS NOT NULL
    AND company_name IS NOT NULL;
