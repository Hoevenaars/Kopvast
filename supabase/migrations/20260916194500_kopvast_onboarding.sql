-- Onboarding en assets per opdracht. Alleen server-side via service role.

CREATE TABLE IF NOT EXISTS public.kopvast_onboardings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.kopvast_organizations (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.kopvast_projects (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open'
    CHECK (status = ANY (ARRAY['open', 'ready'])),
  ready_at timestamptz,
  override_reason text,
  overridden_by text,
  overridden_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);

CREATE TABLE IF NOT EXISTS public.kopvast_onboarding_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id uuid NOT NULL REFERENCES public.kopvast_onboardings (id) ON DELETE CASCADE,
  section text NOT NULL
    CHECK (section = ANY (ARRAY['bedrijf', 'merk', 'content', 'techniek', 'inspiratie', 'maatwerk'])),
  key text NOT NULL,
  title text NOT NULL,
  help_text text,
  item_type text NOT NULL
    CHECK (item_type = ANY (ARRAY['text', 'textarea', 'url', 'file', 'files'])),
  required boolean NOT NULL DEFAULT true,
  custom boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'missing'
    CHECK (status = ANY (ARRAY['missing', 'received', 'not_required', 'approved', 'rejected'])),
  value_text text,
  note text,
  admin_note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (onboarding_id, key)
);

CREATE TABLE IF NOT EXISTS public.kopvast_onboarding_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id uuid NOT NULL REFERENCES public.kopvast_onboardings (id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.kopvast_onboarding_items (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.kopvast_organizations (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.kopvast_projects (id) ON DELETE CASCADE,
  storage_key text NOT NULL UNIQUE,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  uploaded_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kopvast_onboardings_org_idx
  ON public.kopvast_onboardings (organization_id, status);
CREATE INDEX IF NOT EXISTS kopvast_onboardings_status_idx
  ON public.kopvast_onboardings (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS kopvast_onboarding_items_onboarding_idx
  ON public.kopvast_onboarding_items (onboarding_id, sort_order);
CREATE INDEX IF NOT EXISTS kopvast_onboarding_files_item_idx
  ON public.kopvast_onboarding_files (item_id, created_at);
CREATE INDEX IF NOT EXISTS kopvast_onboarding_files_org_idx
  ON public.kopvast_onboarding_files (organization_id);

ALTER TABLE public.kopvast_onboardings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_onboarding_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_onboarding_files ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.kopvast_onboardings FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_onboarding_items FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_onboarding_files FROM anon, authenticated;

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'kopvast-onboarding',
    'kopvast-onboarding',
    false,
    10485760,
    ARRAY[
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'text/plain',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  )
  ON CONFLICT (id) DO NOTHING;
END $$;
