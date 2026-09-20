import { notFound, redirect } from "next/navigation";
import { readScoutUser } from "@/lib/scout/auth";
import { scoutPublicBase, withBase } from "@/lib/scout/base-path";
import { getDraft, getLead, latestScan } from "@/lib/scout/leads";
import { SCOUT_STATUS_LABELS } from "@/lib/scout/types";
import {
  approveDraftAction,
  createUnreachableDraftAction,
  rescanAction,
  saveDraftAction,
  sendScoutMailAction,
} from "@/app/(scout)/scout/actions";
import { ScoutContactEmailForm } from "@/components/scout/contact-email-form";
import { LeadDraftTools } from "@/components/scout/draft-tools";
import { buildUnreachableSiteMail } from "@/lib/acquisition/unreachable-site-mail";

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
  const enrichment = lead.enrichment as Record<string, { value?: string | null; kind?: string }>;
  const generated =
    lead.email && (lead.status === "scan_mislukt" || Boolean(lead.last_error))
      ? buildUnreachableSiteMail({ domain: lead.domain, companyName: lead.company_name })
      : null;
  const subject = draft?.subject ?? generated?.subject ?? "";
  const message = draft?.message ?? generated?.body ?? "";
  const canEditMail = Boolean(draft || generated);

  return (
    <main className="space-y-8 pb-8">
      <header>
        <p className="text-[11px] tracking-[0.28em] text-olive uppercase">{lead.domain}</p>
        <h1 className="font-heading mt-2 text-4xl text-ink">{lead.company_name || lead.domain}</h1>
        <p className="mt-3 text-sm text-olive">
          {SCOUT_STATUS_LABELS[lead.status]}
          {lead.score != null ? ` · Kopvast Score ${lead.score}` : ""}
        </p>
      </header>

      <section>
        <h2 className="text-xs tracking-[0.18em] text-olive uppercase">Waarom interessant</h2>
        <p className="mt-2 text-base leading-7 text-ink">{lead.why_interesting || "Scan loopt of is nog niet klaar."}</p>
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

      <section>
        <h2 className="text-xs tracking-[0.18em] text-olive uppercase">Mijn opmerking</h2>
        <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-ink">{lead.note || "—"}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs tracking-[0.18em] text-olive uppercase">Contactgegevens</h2>
        <ScoutContactEmailForm
          leadId={lead.id}
          email={lead.email || enrichment?.email?.value || null}
          scanFailed={lead.status === "scan_mislukt" || Boolean(lead.last_error)}
        />
        <ul className="space-y-1 text-sm text-ink">
          <li>Telefoon: {lead.phone || enrichment?.phone?.value || "niet gevonden"}</li>
          <li>LinkedIn: {lead.linkedin_url || "niet gevonden"}</li>
          <li>Plaats: {lead.city || "niet gevonden"}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xs tracking-[0.18em] text-olive uppercase">Acquisitieconcept</h2>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
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
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
            />
            <div className="flex flex-col gap-2">
              <button className="h-12 rounded-2xl border border-ink/15 bg-white text-sm">Aanpassen</button>
              <LeadDraftTools subject={subject} message={message} />
              <button formAction={approveDraftAction} className="h-12 rounded-2xl bg-ink text-sm text-ivory">
                Goedkeuren
              </button>
              {lead.email ? (
                <button formAction={sendScoutMailAction} className="h-12 rounded-2xl bg-copper-dark text-sm text-ivory">
                  Versturen
                </button>
              ) : null}
            </div>
            <p className="text-xs text-olive">
              {lead.email
                ? "Versturen gaat naar het opgeslagen adres. In TEST blijft de echte verzending intern."
                : "Goedkeuren zet het klaar. Voeg een e-mailadres toe om te kunnen versturen."}
            </p>
          </form>
        ) : lead.email && (lead.status === "scan_mislukt" || lead.last_error) ? (
          <form action={createUnreachableDraftAction} className="mt-3 space-y-3">
            <input type="hidden" name="leadId" value={lead.id} />
            <p className="text-sm leading-6 text-olive">
              De site is niet bereikbaar. Maak een mail om te helpen de site op te zetten.
            </p>
            <p className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm leading-6 text-ink">
              {buildUnreachableSiteMail({ domain: lead.domain, companyName: lead.company_name }).subject}
            </p>
            <button className="h-12 w-full rounded-2xl bg-copper-dark text-sm text-ivory">Maak mail</button>
          </form>
        ) : (
          <p className="mt-2 text-sm text-olive">Nog geen concept. {lead.last_error || "De scan loopt op de achtergrond."}</p>
        )}
      </section>

      {lead.status === "scan_mislukt" || lead.last_error ? (
        <form action={rescanAction}>
          <input type="hidden" name="leadId" value={lead.id} />
          <p className="mb-3 text-sm text-olive">De oorspronkelijke URL en opmerking blijven bewaard.</p>
          <button className="h-12 w-full rounded-2xl bg-copper-dark text-sm text-ivory">Opnieuw scannen</button>
        </form>
      ) : (
        <form action={rescanAction}>
          <input type="hidden" name="leadId" value={lead.id} />
          <button className="text-sm text-olive underline-offset-4 hover:underline">Nieuwe scan uitvoeren</button>
        </form>
      )}
    </main>
  );
}
