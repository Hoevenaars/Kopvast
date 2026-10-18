-- Voor- en achternaam naast de bestaande contact_name.
-- Facebook en een andere social URL zijn geen website en starten geen scan.
-- Nieuwe kolommen erven de bestaande RLS. Geen nieuwe tabel en geen ruimere rechten.

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS social_url text;

ALTER TABLE public.prospect_contacts
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

ALTER TABLE public.scout_leads
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS social_url text;

UPDATE public.prospects
SET first_name = split_part(btrim(contact_name), ' ', 1)
WHERE first_name IS NULL
  AND contact_name IS NOT NULL
  AND btrim(contact_name) <> ''
  AND position('@' in contact_name) = 0;

UPDATE public.prospects
SET last_name = nullif(btrim(substr(btrim(contact_name), char_length(split_part(btrim(contact_name), ' ', 1)) + 1)), '')
WHERE last_name IS NULL
  AND contact_name IS NOT NULL
  AND position(' ' in btrim(contact_name)) > 0
  AND position('@' in contact_name) = 0;

UPDATE public.scout_leads
SET first_name = split_part(btrim(contact_name), ' ', 1)
WHERE first_name IS NULL
  AND contact_name IS NOT NULL
  AND btrim(contact_name) <> ''
  AND position('@' in contact_name) = 0;

UPDATE public.scout_leads
SET last_name = nullif(btrim(substr(btrim(contact_name), char_length(split_part(btrim(contact_name), ' ', 1)) + 1)), '')
WHERE last_name IS NULL
  AND contact_name IS NOT NULL
  AND position(' ' in btrim(contact_name)) > 0
  AND position('@' in contact_name) = 0;
