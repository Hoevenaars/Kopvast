-- Voorstellen: bestaande Website Refresh-tabellen uitbreiden.
-- Geen parallelle kopvast_proposals-tabellen; service role only.

DROP TABLE IF EXISTS public.kopvast_proposal_activity;
DROP TABLE IF EXISTS public.kopvast_proposal_versions;
DROP TABLE IF EXISTS public.kopvast_proposal_lines;
DROP TABLE IF EXISTS public.kopvast_proposals;

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'maatwerk',
  ADD COLUMN IF NOT EXISTS aanleiding text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS recipient_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS recipient_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS recipient_organization text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS question_text text,
  ADD COLUMN IF NOT EXISTS question_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by_name text,
  ADD COLUMN IF NOT EXISTS accepted_by_email text,
  ADD COLUMN IF NOT EXISTS accepted_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS handed_off_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by_email text;

ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_type_check;
ALTER TABLE public.proposals ADD CONSTRAINT proposals_type_check CHECK (
  type = ANY (ARRAY['website','beheer','merkrefresh','sjablonen','maatwerk'])
);

ALTER TABLE public.proposal_versions
  ADD COLUMN IF NOT EXISTS public_token_hash text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS first_viewed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS proposal_versions_public_token_hash_key
  ON public.proposal_versions (public_token_hash)
  WHERE public_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS proposals_last_viewed_idx
  ON public.proposals (last_viewed_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS activity_logs_entity_idx
  ON public.activity_logs (entity_type, entity_id);
