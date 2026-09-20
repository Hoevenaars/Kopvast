-- Verzonden acquisitiemail zet de prospectfase op Benaderd.

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_status_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_status_check CHECK (
  status = ANY (ARRAY[
    'NEW','VALIDATING','SCANNING','SCAN_FAILED','ANALYSING','QUALIFIED','WATCHLIST',
    'SALES_READY','PRIORITY','REJECTED','PREVIEW_READY','CONTACTED','ARCHIVED','CONVERTED'
  ])
);

UPDATE public.prospects
SET status = 'CONTACTED', updated_at = now()
WHERE is_archived = false
  AND status NOT IN ('CONVERTED', 'ARCHIVED', 'CONTACTED')
  AND mail_status IN ('queued', 'sent', 'delivered');

UPDATE public.scout_leads
SET status = 'benaderd', pipeline_stage = 'sent', updated_at = now()
WHERE status NOT IN ('benaderd', 'reactie', 'kans', 'gewonnen', 'afgevallen')
  AND prospect_id IN (
    SELECT id FROM public.prospects
    WHERE mail_status IN ('queued', 'sent', 'delivered')
  );
