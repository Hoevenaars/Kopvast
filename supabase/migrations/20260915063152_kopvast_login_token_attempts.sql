-- Bruteforce-beveiliging voor eenmalige inlog- en herstelcodes.

ALTER TABLE public.kopvast_login_tokens
  ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0;
