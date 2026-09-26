-- Follow-upkolommen ontbraken op productie, waardoor de acquisitielijst
-- kapotging op prospects.nurture_status. CONTACTED blijft geldig.

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS auto_follow_up_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_follow_up_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_follow_up_cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS outreach_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nurture_status text,
  ADD COLUMN IF NOT EXISTS nurture_until timestamptz,
  ADD COLUMN IF NOT EXISTS nurture_reason text,
  ADD COLUMN IF NOT EXISTS nurture_note text;

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_nurture_status_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_nurture_status_check CHECK (
  nurture_status IS NULL OR nurture_status = ANY (ARRAY['SCHEDULED','DUE'])
);

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_nurture_reason_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_nurture_reason_check CHECK (
  nurture_reason IS NULL OR nurture_reason = ANY (ARRAY[
    'NO_RESPONSE','NOT_NOW','BUDGET_LATER','PROJECT_DELAYED','EXISTING_CONTRACT',
    'TIMING_UNKNOWN','MANUAL','OTHER'
  ])
);

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_status_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_status_check CHECK (
  status = ANY (ARRAY[
    'NEW','VALIDATING','SCANNING','SCAN_FAILED','ANALYSING','QUALIFIED','WATCHLIST',
    'SALES_READY','PRIORITY','REJECTED','PREVIEW_READY','CONTACTED','ARCHIVED','CONVERTED','CLOSED'
  ])
);

ALTER TABLE public.email_messages DROP CONSTRAINT IF EXISTS email_messages_kind_check;
ALTER TABLE public.email_messages ADD CONSTRAINT email_messages_kind_check CHECK (
  kind = ANY (ARRAY[
    'internal_notification','customer_confirmation','acquisition_outreach','acquisition_test',
    'acquisition_follow_up','acquisition_manual_follow_up'
  ])
);

CREATE INDEX IF NOT EXISTS prospects_auto_follow_up_due_idx
  ON public.prospects (auto_follow_up_due_at)
  WHERE auto_follow_up_sent_at IS NULL
    AND auto_follow_up_cancelled_at IS NULL
    AND auto_follow_up_due_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS prospects_nurture_until_idx
  ON public.prospects (nurture_until)
  WHERE nurture_status = 'SCHEDULED';

CREATE UNIQUE INDEX IF NOT EXISTS email_messages_one_auto_follow_up_idx
  ON public.email_messages (prospect_id)
  WHERE kind = 'acquisition_follow_up'
    AND status = ANY (ARRAY['queued','sent','delivered']);
