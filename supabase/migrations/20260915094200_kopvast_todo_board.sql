-- Planner-stijl takenbord voor Kopvast Admin. Alleen server-side via service role.

CREATE TABLE IF NOT EXISTS public.kopvast_todo_buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kopvast_todo_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT 'pink',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kopvast_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.kopvast_organizations (id) ON DELETE SET NULL,
  bucket_id uuid REFERENCES public.kopvast_todo_buckets (id) ON DELETE SET NULL,
  title text NOT NULL,
  due_at date,
  start_at date,
  priority text NOT NULL DEFAULT 'normaal'
    CHECK (priority = ANY (ARRAY['laag', 'normaal', 'hoog'])),
  status text NOT NULL DEFAULT 'open'
    CHECK (status = ANY (ARRAY['open', 'done'])),
  progress text NOT NULL DEFAULT 'niet_gestart'
    CHECK (progress = ANY (ARRAY['niet_gestart', 'bezig', 'voltooid'])),
  note text,
  sort_order integer NOT NULL DEFAULT 0,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.kopvast_todo_label_links (
  todo_id uuid NOT NULL REFERENCES public.kopvast_todos (id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.kopvast_todo_labels (id) ON DELETE CASCADE,
  PRIMARY KEY (todo_id, label_id)
);

CREATE TABLE IF NOT EXISTS public.kopvast_todo_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id uuid NOT NULL REFERENCES public.kopvast_todos (id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kopvast_todos_bucket_idx
  ON public.kopvast_todos (bucket_id, sort_order);
CREATE INDEX IF NOT EXISTS kopvast_todos_org_idx
  ON public.kopvast_todos (organization_id);
CREATE INDEX IF NOT EXISTS kopvast_todos_open_due_idx
  ON public.kopvast_todos (due_at)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS kopvast_todo_comments_todo_idx
  ON public.kopvast_todo_comments (todo_id, created_at);
CREATE INDEX IF NOT EXISTS kopvast_todo_buckets_position_idx
  ON public.kopvast_todo_buckets (position);

INSERT INTO public.kopvast_todo_buckets (name, position)
SELECT seed.name, seed.position
FROM (
  VALUES
    ('Backlog', 0),
    ('Deze week / In Progress', 1),
    ('Volgende week', 2),
    ('Bewaking en beheer', 3),
    ('Optimalisaties', 4),
    ('Afgerond', 5)
) AS seed(name, position)
WHERE NOT EXISTS (SELECT 1 FROM public.kopvast_todo_buckets);

ALTER TABLE public.kopvast_todo_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_todo_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_todo_label_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kopvast_todo_comments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.kopvast_todo_buckets FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_todo_labels FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_todos FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_todo_label_links FROM anon, authenticated;
REVOKE ALL ON TABLE public.kopvast_todo_comments FROM anon, authenticated;
