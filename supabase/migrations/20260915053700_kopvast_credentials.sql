-- Wachtwoorden voor Admin Console en Mijn Kopvast. Alleen server-side via service role.

CREATE TABLE IF NOT EXISTS public.kopvast_credentials (
  email text PRIMARY KEY,
  password_hash text NOT NULL,
  password_updated_at timestamptz NOT NULL DEFAULT now(),
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kopvast_credentials_locked_idx
  ON public.kopvast_credentials (locked_until)
  WHERE locked_until IS NOT NULL;

ALTER TABLE public.kopvast_login_tokens
  DROP CONSTRAINT IF EXISTS kopvast_login_tokens_purpose_check;

ALTER TABLE public.kopvast_login_tokens
  ADD CONSTRAINT kopvast_login_tokens_purpose_check
  CHECK (purpose = ANY (ARRAY['console', 'admin', 'customer', 'password_reset']));

ALTER TABLE public.kopvast_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.kopvast_credentials FROM anon, authenticated;
