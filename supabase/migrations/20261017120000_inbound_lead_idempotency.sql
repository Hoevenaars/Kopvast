-- Publieke aanvragen: dezelfde inzending (dubbelklik of retry) schrijft één rij.

ALTER TABLE public.inbound_leads
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS inbound_leads_idempotency_key_idx
  ON public.inbound_leads (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
