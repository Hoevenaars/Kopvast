-- Kliksporen voor acquisitie-CTA's. Alleen via de service-role, niet via de Data API.

CREATE TABLE IF NOT EXISTS public.acquisition_click_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  mail_id uuid REFERENCES public.email_messages(id) ON DELETE SET NULL,
  choice text NOT NULL,
  destination_url text NOT NULL,
  clicked_at timestamptz,
  click_count integer NOT NULL DEFAULT 0,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT acquisition_click_links_choice_check CHECK (choice = ANY (ARRAY['voorstel', 'info']))
);

CREATE INDEX IF NOT EXISTS acquisition_click_links_prospect_id_idx
  ON public.acquisition_click_links (prospect_id, created_at DESC);
CREATE INDEX IF NOT EXISTS acquisition_click_links_clicked_at_idx
  ON public.acquisition_click_links (clicked_at DESC NULLS LAST);
CREATE UNIQUE INDEX IF NOT EXISTS acquisition_click_links_mail_choice_idx
  ON public.acquisition_click_links (mail_id, choice)
  WHERE mail_id IS NOT NULL;

ALTER TABLE public.acquisition_click_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.acquisition_click_links FROM anon, authenticated;
