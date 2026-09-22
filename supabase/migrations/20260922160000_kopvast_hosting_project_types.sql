-- Hosting en Hosting Plus als projecttypes naast Beheer.
-- Bestaande beheerrijen blijven staan. Afgesproken maandbedragen worden niet herberekend.

ALTER TABLE public.kopvast_projects DROP CONSTRAINT IF EXISTS kopvast_projects_type_check;

ALTER TABLE public.kopvast_projects
  ADD CONSTRAINT kopvast_projects_type_check
  CHECK (type = ANY (ARRAY[
    'website',
    'beheer',
    'merkrefresh',
    'sjablonen',
    'maatwerk',
    'hosting',
    'hosting_plus'
  ]));
