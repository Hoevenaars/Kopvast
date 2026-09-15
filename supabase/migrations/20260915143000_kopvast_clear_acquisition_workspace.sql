-- Leegt testdata uit de acquisitie-omgeving. Inloggen, templates en suppressions blijven staan.

CREATE OR REPLACE FUNCTION public.kopvast_clear_acquisition_workspace()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prospects_n int;
  leads_n int;
  mails_n int;
BEGIN
  SELECT count(*) INTO prospects_n FROM public.prospects;
  SELECT count(*) INTO leads_n FROM public.inbound_leads;
  SELECT count(*) INTO mails_n FROM public.email_messages;

  UPDATE public.prospects SET inbound_lead_id = NULL WHERE inbound_lead_id IS NOT NULL;
  UPDATE public.inbound_leads SET prospect_id = NULL WHERE prospect_id IS NOT NULL;

  DELETE FROM public.email_events;
  DELETE FROM public.email_messages;
  DELETE FROM public.cost_events;
  DELETE FROM public.activity_logs;
  DELETE FROM public.findings;
  DELETE FROM public.prospect_scores;
  DELETE FROM public.product_fit_checks;
  DELETE FROM public.manual_reviews;
  DELETE FROM public.previews;
  DELETE FROM public.scanned_pages;
  DELETE FROM public.website_scans;
  DELETE FROM public.prospect_contacts;
  DELETE FROM public.prospect_sources;
  DELETE FROM public.prospects;
  DELETE FROM public.inbound_leads;

  RETURN jsonb_build_object(
    'ok', true,
    'prospects', prospects_n,
    'leads', leads_n,
    'mails', mails_n,
    'cleared_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.kopvast_clear_acquisition_workspace() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kopvast_clear_acquisition_workspace() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kopvast_clear_acquisition_workspace() TO service_role;
