import { notFound, redirect } from "next/navigation";
import { readScoutUser } from "@/lib/scout/auth";
import { scoutPublicBase, withBase } from "@/lib/scout/base-path";
import { getDraft, getLead, latestScan } from "@/lib/scout/leads";
import { SCOUT_STATUS_LABELS } from "@/lib/scout/types";
import {
  applyScoutApproachAction,
  approveDraftAction,
  attachScoutWebsiteAction,
  createManualReasonsMailScoutAction,
  createUnreachableDraftAction,
  rescanAction,
  saveDraftAction,
  sendScoutMailAction,
  updateScoutProfileAction,
} from "@/app/(scout)/scout/actions";
import { ManualReasonsForm } from "@/components/acquisition/manual-reasons-form";
import { ScoutContactEmailForm } from "@/components/scout/contact-email-form";
import { ScoutCompanyNameForm } from "@/components/scout/company-name-form";
import { LeadDraftTools } from "@/components/scout/draft-tools";
import { buildUnreachableSiteMail, isUnreachableSiteMail } from "@/lib/acquisition/unreachable-site-mail";
import {
  CONTENT_REASON_LABELS,
  GEOGRAPHIC_REASON_LABELS,
  approachSourceLabel,
  buildPersonalApproachLetter,
} from "@/lib/acquisition/outreach-policy";
import { scoutLeadHasWebsite } from "@/lib/scout/leads";
import { greetingForContact, knownFirstName } from "@/lib/prospect-profile";
import { resolveEmailSettings } from "@/lib/email-mode";

export default async function ScoutLeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await readScoutUser();
  const base = await scoutPublicBase();
  if (!user) redirect(withBase(base, "/login"));
  const { id } = await params;
  const { error } = await searchParams;
  const lead = await getLead(user.id, id);
  if (!lead) notFound();
  const draft = await getDraft(lead.id);
  const scan = await latestScan(lead.id);
  const settings = await resolveEmailSettings();
  const enrichment = lead.enrichment as Record<string, { value?: string | null; kind?: string }>;
  const scanFailed = lead.status === "scan_mislukt" || Boolean(lead.last_error);
  const generated =
    lead.email && scanFailed && (!draft || isUnreachableSiteMail(draft.message))
      ? buildUnreachableSiteMail({ domain: lead.domain, companyName: lead.company_name })
      : null;
  const hasWebsite = scoutLeadHasWebsite(lead);
  const approach = buildPersonalApproachLetter({
    companyName: lead.company_name,
    domain: lead.domain,
    place: lead.city,
    websitePresence: hasWebsite ? "HAS_WEBSITE" : "NO_WEBSITE",
    greeting: greetingForContact(knownFirstName({ firstName: lead.first_name, contactName: lead.contact_name })),
  });
  const approachLabels = [
    approach.geographicReason ? GEOGRAPHIC_REASON_LABELS[approach.geographicReason] : null,
    approach.contentReason ? CONTENT_REASON_LABELS[approach.contentReason] : null,
  ].filter(Boolean);
  const subject = draft?.subject ?? generated?.subject ?? approach.subject;
  const message = draft?.message ?? generated?.body ?? approach.body;
  const canEditMail = Boolean(draft);
  const showManualReasons = scanFailed && (!draft || isUnreachableSiteMail(draft.message));

  return (
    <main className="space-y-8 pb-8">
      <header>
        <p className="text-[11px] tracking-[0.28em] text-olive uppercase">{hasWebsite ? lead.domain : "Geen website"}</p>
        <h1 className="font-heading mt-2 text-4xl text-ink">{lead.company_name || lead.domain || "Prospect"}</h1>
        <p className="mt-3 text-sm text-olive">
          {SCOUT_STATUS_LABELS[lead.status]}
          {hasWebsite && lead.score != null ? ` · Kopvast Score ${lead.score}` : ""}
        </p>
      </header>

      <section>
        <h2 className="text-xs tracking-[0.18em] text-olive uppercase">Waarom interessant</h2>
        <p className="mt-2 text-base leading-7 text-ink">
          {lead.why_interesting ||
            (hasWebsite ? "Scan loopt of is nog niet klaar." : "Dit bedrijf heeft nog geen website. Er is geen scan en geen score.")}
        </p>
      </section>

      <section>
        <h2 className="text-xs tracking-[0.18em] text-olive uppercase">Grootste kansen</h2>
        <p className="mt-2 text-base leading-7 text-ink">{lead.biggest_opportunity || "—"}</p>
        <ul className="mt-3 space-y-2 text-sm text-olive">
          {lead.opportunities.map((item) => (
            <li key={item.title}>
              <span className="text-ink">{item.title}.</span> {item.detail}
            </li>
          ))}
        </ul>
      </section>

      {hasWebsite ? (
      <>
      <section className="grid grid-cols-2 gap-3">
        {[
          ["Technical", scan?.technical_score ?? "—"],
          ["Conversion", scan?.conversion_score ?? "—"],
          ["Design", scan?.design_score ?? "—"],
          ["Brand", scan?.brand_score ?? "—"],
          ["Content", scan?.content_score ?? "—"],
          ["Overall", lead.score ?? scan?.overall_score ?? "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
            <p className="text-[11px] tracking-[0.14em] text-olive uppercase">{label}</p>
            <p className="mt-1 text-2xl tabular-nums text-ink">{value}</p>
          </div>
        ))}
      </section>
      <p className="text-xs leading-5 text-olive">
        De Kopvast Score is een commerciële prioritering, geen objectieve of wetenschappelijke websitebenchmark.
      </p>
      </>
      ) : null}

      <section>
        <h2 className="text-xs tracking-[0.18em] text-olive uppercase">Mijn opmerking</h2>
        <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-ink">{lead.note || "—"}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs tracking-[0.18em] text-olive uppercase">Contactgegevens</h2>
        <ScoutCompanyNameForm leadId={lead.id} companyName={lead.company_name} />
        <ScoutContactEmailForm
          leadId={lead.id}
          email={lead.email || enrichment?.email?.value || null}
          scanFailed={lead.status === "scan_mislukt" || Boolean(lead.last_error)}
        />
        <ul className="space-y-1 text-sm text-ink">
          <li>Voornaam: {lead.first_name || "niet ingevuld"}</li>
          <li>Achternaam: {lead.last_name || "niet ingevuld"}</li>
          <li>Telefoon: {lead.phone || enrichment?.phone?.value || "niet gevonden"}</li>
          <li>Facebook: {lead.facebook_url || "niet ingevuld"}</li>
          <li>Andere social: {lead.social_url || "niet ingevuld"}</li>
          <li>LinkedIn uit scan: {lead.linkedin_url || "niet gevonden"}</li>
          <li>Plaats: {lead.city || "niet gevonden"}</li>
        </ul>
        <form action={updateScoutProfileAction} className="space-y-3 rounded-2xl border border-ink/10 bg-white px-4 py-4">
          <input type="hidden" name="leadId" value={lead.id} />
          <input name="firstName" defaultValue={lead.first_name ?? ""} placeholder="Voornaam" className="h-12 w-full rounded-2xl border border-ink/10 px-4" />
          <input name="lastName" defaultValue={lead.last_name ?? ""} placeholder="Achternaam" className="h-12 w-full rounded-2xl border border-ink/10 px-4" />
          <input name="phone" defaultValue={lead.phone ?? ""} placeholder="Telefoon" className="h-12 w-full rounded-2xl border border-ink/10 px-4" />
          <input name="city" defaultValue={lead.city ?? ""} placeholder="Vestigingsplaats" className="h-12 w-full rounded-2xl border border-ink/10 px-4" />
          <input name="facebookUrl" defaultValue={lead.facebook_url ?? ""} placeholder="Facebook-URL" className="h-12 w-full rounded-2xl border border-ink/10 px-4" />
          <input name="socialUrl" defaultValue={lead.social_url ?? ""} placeholder="Andere social URL" className="h-12 w-full rounded-2xl border border-ink/10 px-4" />
          <textarea name="note" defaultValue={lead.note ?? ""} rows={3} placeholder="Persoonlijke notitie" className="w-full rounded-2xl border border-ink/10 px-4 py-3" />
          <button className="h-12 w-full rounded-2xl border border-ink/15 text-sm">Gegevens opslaan</button>
        </form>
      </section>

      <section>
        <h2 className="text-xs tracking-[0.18em] text-olive uppercase">Acquisitieconcept</h2>
        <div className="mt-3 space-y-2 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm leading-6 text-ink">
          <p>
            Persoonlijke aanleiding: {approachLabels.join(" · ") || "Geen controleerbare aanleiding"}
            {approach.openingAxis === "content"
              ? " · opening gebruikt de inhoudelijke reden"
              : approach.openingAxis === "geographic"
                ? " · opening gebruikt de plaats"
                : " · neutrale opening"}
          </p>
          <p>
            Onderbouwing:{" "}
            {approach.sufficient
              ? approach.evidence || "Aanleiding gekozen."
              : "Personalisatie is onvoldoende onderbouwd. De concepttekst blijft neutraal tot je een eigen aanleiding invult of de tekst beoordeelt."}
          </p>
          <p>
            Bron:{" "}
            {approachSourceLabel({
              sourceKind: approach.sourceKind,
              sourceUrl: approach.sourceUrl,
              openingAxis: approach.openingAxis,
            })}
          </p>
          <p className="text-olive">Een notitie is context en wordt niet vanzelf een aanleiding. De eerste mail noemt geen prijs.</p>
        </div>
        {!approach.sufficient ? (
          <form action={applyScoutApproachAction} className="mt-3 space-y-3 rounded-2xl border border-ink/10 bg-white px-4 py-3">
            <p className="text-sm text-ink">Eigen aanleiding</p>
            <select name="geographicReason" defaultValue="" className="h-12 w-full rounded-2xl border border-ink/10 px-3">
              <option value="">Geen plaatselijke reden</option>
              <option value="GROESBEEK">Groesbeek</option>
              <option value="BERG_EN_DAL">Gemeente Berg en Dal</option>
              <option value="REGION_NIJMEGEN">Regio Nijmegen</option>
            </select>
            <select name="contentReason" defaultValue="" className="h-12 w-full rounded-2xl border border-ink/10 px-3">
              <option value="">Geen inhoudelijke reden</option>
              {Object.entries(CONTENT_REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <textarea
              name="evidence"
              rows={3}
              placeholder="Korte onderbouwing, alleen als je die zelf kent"
              className="w-full rounded-2xl border border-ink/10 px-4 py-3"
            />
            <input type="hidden" name="leadId" value={lead.id} />
            <button className="h-12 w-full rounded-2xl border border-ink/15 text-sm">Werk de opening bij</button>
          </form>
        ) : null}
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        {showManualReasons ? (
          <div className="mt-3">
            <ManualReasonsForm
              action={createManualReasonsMailScoutAction}
              hiddenFields={{ leadId: lead.id }}
              email={lead.email || enrichment?.email?.value || null}
              mode={settings.mode}
              intended={lead.email || enrichment?.email?.value || null}
              testTo={settings.testEmail}
              canSend={Boolean(lead.email || enrichment?.email?.value)}
              variant="scout"
            />
          </div>
        ) : null}
        {canEditMail ? (
          <form action={saveDraftAction} className="mt-3 space-y-3">
            <input type="hidden" name="leadId" value={lead.id} />
            <input
              name="subject"
              defaultValue={subject}
              className="h-12 w-full rounded-2xl border border-ink/10 bg-white px-4"
            />
            <textarea
              name="message"
              defaultValue={message}
              rows={10}
              className="w-full scroll-mb-[calc(8rem+env(safe-area-inset-bottom))] rounded-2xl border border-ink/10 bg-white px-4 py-3"
            />
            <div className="flex flex-col gap-2">
              <button className="h-12 rounded-2xl border border-ink/15 bg-white text-sm">Aanpassen</button>
              <LeadDraftTools subject={subject} message={message} />
              <button formAction={approveDraftAction} className="h-12 rounded-2xl bg-ink text-sm text-ivory">
                Goedkeuren
              </button>
              {lead.email ? (
                <>
                  {!approach.sufficient ? (
                    <label className="flex items-start gap-2 text-sm text-ink">
                      <input type="checkbox" name="reviewed" value="ja" className="mt-1" />
                      <span>Ik heb deze tekst beoordeeld. Live verzending wacht op die beoordeling.</span>
                    </label>
                  ) : null}
                  <button formAction={sendScoutMailAction} className="h-12 rounded-2xl bg-copper-dark text-sm text-ivory">
                    Versturen
                  </button>
                </>
              ) : null}
            </div>
            <p className="text-xs text-olive">
              {lead.email
                ? "Versturen gaat naar het opgeslagen adres. In TEST blijft de echte verzending intern."
                : "Goedkeuren zet het klaar. Voeg een e-mailadres toe om te kunnen versturen."}
            </p>
          </form>
        ) : lead.email && scanFailed ? (
          <form action={createUnreachableDraftAction} className="mt-3 space-y-3">
            <input type="hidden" name="leadId" value={lead.id} />
            <p className="text-sm leading-6 text-olive">
              Kon je de website zelf ook niet openen? Maak dan een mail om te helpen de site op te zetten.
            </p>
            <p className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm leading-6 text-ink">
              {buildUnreachableSiteMail({ domain: lead.domain, companyName: lead.company_name }).subject}
            </p>
            <button className="h-12 w-full rounded-2xl bg-copper-dark text-sm text-ivory">
              Maak mail voor onbereikbare site
            </button>
          </form>
        ) : showManualReasons ? null : (
          <p className="mt-2 text-sm text-olive">
            {hasWebsite
              ? `Nog geen concept. ${lead.last_error || "De scan loopt op de achtergrond."}`
              : "De eerste mail wordt klaargezet zonder scan en zonder verzonnen bevindingen."}
          </p>
        )}
      </section>

      {hasWebsite ? null : (
        <form action={attachScoutWebsiteAction} className="space-y-3 rounded-2xl border border-ink/10 bg-white px-4 py-4">
          <h2 className="text-xs tracking-[0.18em] text-olive uppercase">Later een website toevoegen</h2>
          <p className="text-sm leading-6 text-olive">Hetzelfde bedrijf blijft bestaan. Daarna kan de websitecheck starten.</p>
          <input type="hidden" name="leadId" value={lead.id} />
          <input
            name="website"
            required
            placeholder="https://"
            className="h-12 w-full rounded-2xl border border-ink/10 px-4"
          />
          <button className="h-12 w-full rounded-2xl bg-ink text-sm text-ivory">Website koppelen</button>
        </form>
      )}

      {hasWebsite && (lead.status === "scan_mislukt" || lead.last_error) ? (
        <form action={rescanAction}>
          <input type="hidden" name="leadId" value={lead.id} />
          <p className="mb-3 text-sm text-olive">De oorspronkelijke URL en opmerking blijven bewaard.</p>
          <button className="h-12 w-full rounded-2xl bg-copper-dark text-sm text-ivory">Opnieuw scannen</button>
        </form>
      ) : hasWebsite ? (
        <form action={rescanAction}>
          <input type="hidden" name="leadId" value={lead.id} />
          <button className="text-sm text-olive underline-offset-4 hover:underline">Nieuwe scan uitvoeren</button>
        </form>
      ) : null}
    </main>
  );
}
