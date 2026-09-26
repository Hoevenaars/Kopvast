-- Scout schreef email_source 'scout', maar die waarde was niet toegestaan.
-- Daardoor bleef het adres op de lead staan en kreeg het prospect geen contact.

ALTER TABLE public.prospect_contacts
  DROP CONSTRAINT IF EXISTS prospect_contacts_email_source_check;

ALTER TABLE public.prospect_contacts
  ADD CONSTRAINT prospect_contacts_email_source_check CHECK (
    email_source = ANY (ARRAY['admin','websitecheck','aanvraag','manual','import','scout'])
  );

INSERT INTO public.prospect_contacts (prospect_id, email, email_source, contact_status, do_not_contact)
SELECT DISTINCT ON (l.prospect_id, lower(trim(l.email)))
  l.prospect_id,
  lower(trim(l.email)),
  'scout',
  'UNKNOWN',
  false
FROM public.scout_leads l
WHERE l.prospect_id IS NOT NULL
  AND l.email IS NOT NULL
  AND trim(l.email) <> ''
  AND lower(trim(l.email)) ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  AND NOT EXISTS (
    SELECT 1
    FROM public.prospect_contacts c
    WHERE c.prospect_id = l.prospect_id
      AND lower(c.email) = lower(trim(l.email))
  )
ORDER BY l.prospect_id, lower(trim(l.email)), l.updated_at DESC;

-- Concepten die bij opslaan een extra handtekening kregen, terugzetten naar de Scout-tekst.
UPDATE public.email_messages em
SET
  body_text = d.message,
  body_html = NULL,
  updated_at = now()
FROM public.scout_leads l
JOIN LATERAL (
  SELECT message
  FROM public.scout_outreach_drafts
  WHERE lead_id = l.id
    AND status = 'draft'
    AND message IS NOT NULL
    AND length(trim(message)) > 0
  ORDER BY updated_at DESC
  LIMIT 1
) d ON true
WHERE em.prospect_id = l.prospect_id
  AND em.status = 'draft'
  AND em.prompt_version = 'kopvast-scout'
  AND em.body_text LIKE 'KOPVAST%'
  AND replace(em.body_text, E'\r', '') LIKE '%' || replace(d.message, E'\r', '') || '%';
