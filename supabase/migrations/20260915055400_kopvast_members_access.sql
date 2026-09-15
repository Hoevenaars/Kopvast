-- Toegang tot Mijn Kopvast per gebruiker. Standaard aan na omzetten van een lead.

ALTER TABLE public.kopvast_members
  ADD COLUMN IF NOT EXISTS access_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.kopvast_members.access_enabled IS 'Als false mag deze gebruiker niet inloggen in Mijn Kopvast.';
