import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  attachWebsiteAction,
  convertProspectForm,
  createManualReasonsMailAction,
  createUnreachableMailForm,
  generateFirstMailAction,
  rescanProspectAction,
  updateFollowUpForm,
  updateProspectProfileAction,
} from "@/app/(workspace)/admin/acquisitie/actions";
import { CommercialFollowUp } from "@/components/acquisition/commercial-follow-up";
import { SentMails } from "@/components/acquisition/sent-mails";
import { ManualReasonsForm } from "@/components/acquisition/manual-reasons-form";
import { PageIntro } from "@/components/workspace/page-frame";
import { FormBusyOverlay, SubmitButton } from "@/components/workspace/form-busy";
import { fieldClass, areaClass, Field } from "@/components/form-fields";
import { loadProspectDetail } from "@/lib/acquisition";
import { mailHasFindings } from "@/lib/acquisition/manual-reasons";
import { isUnreachableProspect } from "@/lib/acquisition/unreachable-site-mail";
import { ensureScoutProspectContact, loadScoutCaptureForProspect } from "@/lib/scout/crm";
import { ScoutCapturePanel } from "@/app/(workspace)/admin/scout/scout-capture-panel";
import {
  FINDING_CATEGORY_LABELS,
  formatNlDate,
  formatNlDateTime,
  labelForActivity,
  labelForActor,
  labelForContact,
  labelForFit,
  labelForMail,
  labelForStatus,
  pickCommercialFindings,
  responseStatuses,
  type ProductFit,
} from "@/lib/acquisition-constants";
import { isShortAcquisitionKind } from "@/lib/acquisition/follow-up";
import { sentMailRecords } from "@/lib/acquisition/sent-mails";
import { explainOutreachOffer, personalApproachForProspect } from "@/lib/acquisition/outreach-policy";
import { greetingForContact, knownFirstName } from "@/lib/prospect-profile";
import { resolveEmailSettings } from "@/lib/email-mode";
import { ProspectContactEmailForm } from "../contact-email-form";
import { ProspectCompanyNameForm } from "../company-name-form";
import { MailEditor } from "../mail-editor";
import { ScanProgress } from "../scan-progress";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const prospect = await loadProspectDetail(id);
  return { title: prospect?.company_name || prospect?.domain || "Prospect", robots: { index: false, follow: false } };
}

export default async function ProspectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mailError?: string }>;
}) {
  const { id } = await params;
  const { mailError } = await searchParams;
  const scout = await loadScoutCaptureForProspect(id);
  if (scout?.email) await ensureScoutProspectContact(id, scout.email);
  const prospect = await loadProspectDetail(id);
  if (!prospect) notFound();

  const running = ["queued", "running"].includes(prospect.scan?.status ?? "") || ["SCANNING", "ANALYSING", "VALIDATING"].includes(prospect.status);
  const commercialFindings = pickCommercialFindings(prospect.findings, 5);
  const settings = await resolveEmailSettings();
  const mode = settings.mode;
  const blocked = prospect.do_not_contact || prospect.contact_status === "BLOCKED" || prospect.contact_status === "DO_NOT_CONTACT" || Boolean(prospect.suppression);
  const scanFailed = isUnreachableProspect({
    status: prospect.status,
    scanStatus: prospect.scan?.status,
    scanError: prospect.scan?.error_message,
  });
  const sentMails = sentMailRecords(prospect.mails);
  const draftMail = prospect.mail?.status === "draft" ? prospect.mail : null;
  const mailSent = sentMails.some((mail) => mail.kind === "acquisition_outreach");
  const showManualReasons = scanFailed && !mailSent && !mailHasFindings(prospect.mail);
  const showUnreachableCreate = scanFailed && Boolean(prospect.contact?.email) && !prospect.mail;
  const hasWebsite = Boolean(prospect.website_url?.trim());

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow={hasWebsite ? prospect.domain : "Geen website"}
        title={prospect.company_name || prospect.domain || "Prospect"}
        text={hasWebsite ? prospect.website_url : "Nog geen website. Er is geen scan en geen score."}
      />
      {scout ? <ScoutCapturePanel capture={scout} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Opportunity Score" value={prospect.opportunity_score == null ? "—" : `${Math.round(prospect.opportunity_score)} / 100`} />
        <Stat label="Prospectstatus" value={labelForStatus(prospect.status)} />
        <Stat label="Product Fit" value={labelForFit(prospect.product_fit)} />
        <Stat label="Contactstatus" value={labelForContact(prospect.contact_status)} />
        <Stat label="Mailstatus" value={labelForMail(prospect.mail_status)} />
        <Stat label="Laatste activiteit" value={formatNlDate(prospect.last_activity_at)} />
        <Stat label="Plaats" value={prospect.city || "—"} />
        <Stat label="Kosten" value={`€ ${prospect.total_cost.toFixed(4)}`} />
      </section>
      <p className="text-sm text-ink/55">
        {hasWebsite
          ? "De opportunity score is een rangorde voor later automatisch werk. Jij bepaalt of je mailt."
          : "Zonder website is er geen opportunity score. De eerste mail gebruikt alleen wat je zelf hebt vastgelegd."}
      </p>
      {prospect.contact_name || prospect.phone ? (
        <p className="text-sm text-ink/70">
          {prospect.contact_name ? `Contactpersoon: ${prospect.contact_name}` : "Contactpersoon nog onbekend"}
          {prospect.phone ? ` · Telefoon: ${prospect.phone}` : ""}
          {prospect.facebook_url ? ` · Facebook: ${prospect.facebook_url}` : ""}
        </p>
      ) : (
        <p className="text-sm text-ink/55">Contactpersoon nog onbekend. Een Gmailadres of telefoonnummer is genoeg om later contact te leggen.</p>
      )}

      <form action={updateProspectProfileAction} className="relative space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
        <FormBusyOverlay label="Gegevens opslaan…" />
        <h2 className="font-semibold">Prospectgegevens</h2>
        <input type="hidden" name="prospectId" value={prospect.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="firstName" label="Voornaam">
            <input id="firstName" name="firstName" defaultValue={prospect.first_name ?? ""} className={fieldClass} />
          </Field>
          <Field id="lastName" label="Achternaam">
            <input id="lastName" name="lastName" defaultValue={prospect.last_name ?? ""} className={fieldClass} />
          </Field>
        </div>
        <Field id="phone" label="Telefoon">
          <input id="phone" name="phone" defaultValue={prospect.phone ?? ""} className={fieldClass} />
        </Field>
        <Field id="city" label="Vestigingsplaats">
          <input id="city" name="city" defaultValue={prospect.city ?? ""} className={fieldClass} />
        </Field>
        <Field id="facebookUrl" label="Facebook">
          <input id="facebookUrl" name="facebookUrl" defaultValue={prospect.facebook_url ?? ""} placeholder="Geen website, geen scan" className={fieldClass} />
        </Field>
        <Field id="socialUrl" label="Andere social URL">
          <input id="socialUrl" name="socialUrl" defaultValue={prospect.social_url ?? ""} className={fieldClass} />
        </Field>
        <Field id="sourceType" label="Bron">
          <select id="sourceType" name="sourceType" defaultValue={prospect.source_type ?? "kopvast"} className={fieldClass}>
            <option value="kopvast">Handmatig</option>
            <option value="referral">Doorverwijzing</option>
            <option value="import">Import</option>
          </select>
        </Field>
        <Field id="notes" label="Persoonlijke notitie">
          <textarea id="notes" name="notes" defaultValue={prospect.notes ?? ""} className={areaClass} />
        </Field>
        <SubmitButton pendingLabel="Opslaan…" className="h-12 cursor-pointer rounded-md bg-ink px-5 text-sm font-semibold text-ivory">
          Gegevens opslaan
        </SubmitButton>
      </form>

      {prospect.scan ? <ScanProgress running={running} steps={prospect.scan.progress} /> : null}
      {prospect.scan?.error_message ? (
        <p className="rounded-2xl border border-destructive/30 bg-white px-4 py-3 text-sm text-destructive">{prospect.scan.error_message}</p>
      ) : null}

      <ProspectCompanyNameForm prospectId={prospect.id} companyName={prospect.company_name} />

      <ProspectContactEmailForm
        prospectId={prospect.id}
        email={prospect.contact?.email ?? null}
        scanFailed={prospect.status === "SCAN_FAILED" || Boolean(prospect.scan?.error_message)}
      />

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <h2 className="font-semibold">Wat valt op?</h2>
        {commercialFindings.length === 0 ? (
          <p className="mt-3 text-sm text-ink/45">
            {hasWebsite
              ? "Nog geen commerciële findings. De scan loopt of leverde te weinig signaal."
              : "Geen websitebevindingen. Die verzinnen we niet."}
          </p>
        ) : (
          <ol className="mt-4 space-y-4">
            {commercialFindings.map((finding, index) => (
              <li key={finding.id} className="border-b border-ink/6 pb-4 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">
                    {index + 1}. {FINDING_CATEGORY_LABELS[finding.category] || finding.title}
                  </span>
                  <span className="rounded-full bg-ivory px-2 py-0.5 text-[11px] font-semibold tracking-wide">
                    {finding.finding_type}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink/70">{finding.description}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <OfferCard fit={prospect.product_fit} city={prospect.city} />

      {mailError ? (
        <p className="rounded-2xl border border-destructive/30 bg-white px-4 py-3 text-sm text-destructive">{mailError}</p>
      ) : null}

      {showManualReasons ? (
        <ManualReasonsForm
          action={createManualReasonsMailAction}
          hiddenFields={{ prospectId: prospect.id }}
          email={prospect.contact?.email ?? null}
          mode={mode}
          intended={prospect.contact?.email ?? null}
          testTo={settings.testEmail}
          canSend={!blocked && Boolean(prospect.contact?.email)}
        />
      ) : null}

      <CommercialFollowUp prospect={prospect} asOf={new Date().toISOString()} />

      <SentMails mails={sentMails} />

      {draftMail ? (
        <MailEditor
          key={`${draftMail.id}-${prospect.company_name ?? ""}`}
          prospectId={prospect.id}
          mailId={draftMail.id}
          subject={draftMail.subject ?? ""}
          body={draftMail.body_text ?? ""}
          companyName={prospect.company_name}
          domain={prospect.domain}
          mode={mode}
          intended={prospect.contact?.email ?? null}
          canSend={!blocked && Boolean(prospect.contact?.email)}
          title={isShortAcquisitionKind(draftMail.kind) ? "Handmatige follow-up" : "Persoonlijke acquisitiemail"}
          layout={isShortAcquisitionKind(draftMail.kind) ? "short" : "outreach"}
          place={prospect.city}
          note={prospect.notes}
          approach={
            isShortAcquisitionKind(draftMail.kind)
              ? null
              : personalApproachForProspect({
                  companyName: prospect.company_name,
                  domain: prospect.domain,
                  place: prospect.city,
                  websiteUrl: prospect.website_url,
                  activities: prospect.activities,
                  greeting: greetingForContact(knownFirstName({ firstName: prospect.first_name, contactName: prospect.contact_name })),
                })
          }
        />
      ) : showUnreachableCreate ? (
        <form action={createUnreachableMailForm} className="relative space-y-4 rounded-2xl border border-copper/25 bg-[#FBF6F2] p-5">
          <FormBusyOverlay label="Mail klaarzetten…" />
          <input type="hidden" name="prospectId" value={prospect.id} />
          <h2 className="font-semibold">Site niet bereikbaar</h2>
          <p className="text-sm leading-6 text-ink/70">
            Kon je de website zelf ook niet openen? Zet dan een mail klaar om te helpen de site op te zetten.
          </p>
          <SubmitButton
            pendingLabel="Mail klaarzetten…"
            className="h-12 cursor-pointer rounded-md bg-copper-dark px-5 text-sm font-semibold text-ivory"
          >
            Maak mail voor onbereikbare site
          </SubmitButton>
        </form>
      ) : !hasWebsite && !showManualReasons && !sentMails.length ? (
        <form action={generateFirstMailAction} className="relative space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
          <FormBusyOverlay label="Mail klaarzetten…" />
          <input type="hidden" name="prospectId" value={prospect.id} />
          <h2 className="font-semibold">Eerste acquisitiemail</h2>
          <p className="text-sm leading-6 text-ink/70">
            Er is geen website om te analyseren. De mail blijft persoonlijk en noemt geen technische bevindingen en geen prijs.
          </p>
          <SubmitButton
            pendingLabel="Mail klaarzetten…"
            className="h-12 cursor-pointer rounded-md bg-copper-dark px-5 text-sm font-semibold text-ivory"
          >
            Maak de eerste mail
          </SubmitButton>
        </form>
      ) : showManualReasons || sentMails.length ? null : (
        <section className="rounded-2xl border border-dashed border-ink/15 p-5 text-sm text-ink/50">
          De acquisitiemail verschijnt hier zodra de scan klaar is.
        </section>
      )}

      {blocked ? (
        <p className="rounded-2xl border border-copper/30 bg-[#F3E4DD] px-4 py-3 text-sm text-copper-dark">
          Verzending is geblokkeerd{prospect.suppression ? ` (${prospect.suppression.reason})` : ""}.
        </p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <form action={updateFollowUpForm} className="relative space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
          <FormBusyOverlay label="Opvolging opslaan…" />
          <h2 className="font-semibold">Opvolging</h2>
          <input type="hidden" name="prospectId" value={prospect.id} />
          <Field id="responseStatus" label="Response status">
            <select id="responseStatus" name="responseStatus" defaultValue={prospect.response_status ?? "NO_RESPONSE"} className={fieldClass}>
              {responseStatuses.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="nextAction" label="Next action">
            <input id="nextAction" name="nextAction" defaultValue={prospect.next_action ?? ""} placeholder="Bel terug, afspraak plannen…" className={fieldClass} />
          </Field>
          <Field id="nextActionAt" label="Next action op">
            <input
              id="nextActionAt"
              name="nextActionAt"
              type="datetime-local"
              defaultValue={prospect.next_action_at ? prospect.next_action_at.slice(0, 16) : ""}
              className={fieldClass}
            />
          </Field>
          <SubmitButton
            pendingLabel="Opslaan…"
            className="h-12 cursor-pointer rounded-md bg-ink px-5 text-sm font-semibold text-ivory"
          >
            Opvolging opslaan
          </SubmitButton>
        </form>

        <div className="space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="font-semibold">Acties</h2>
          {hasWebsite ? null : (
            <form action={attachWebsiteAction} className="relative space-y-3">
              <FormBusyOverlay label="Website koppelen…" />
              <p className="text-sm leading-6 text-ink/70">
                Komt er later een website bij, dan blijft dit dezelfde prospect. Daarna start de websitecheck.
              </p>
              <input type="hidden" name="prospectId" value={prospect.id} />
              <input name="website" required placeholder="https://" className={fieldClass} />
              <SubmitButton
                pendingLabel="Website koppelen…"
                className="h-12 w-full cursor-pointer rounded-md border border-ink/15 text-sm font-semibold"
              >
                Website koppelen
              </SubmitButton>
            </form>
          )}
          {hasWebsite ? (
          <form action={rescanProspectAction} className="relative">
            <FormBusyOverlay label="Nieuwe scan starten…" />
            <input type="hidden" name="prospectId" value={prospect.id} />
            <input type="hidden" name="website" value={prospect.website_url} />
            <input type="hidden" name="email" value={prospect.contact?.email ?? ""} />
            <SubmitButton
              pendingLabel="Nieuwe scan starten…"
              className="h-12 w-full cursor-pointer rounded-md border border-ink/15 text-sm font-semibold"
            >
              Nieuwe scan uitvoeren
            </SubmitButton>
          </form>
          ) : null}
          {prospect.status !== "CONVERTED" ? (
            <form action={convertProspectForm} className="relative">
              <FormBusyOverlay label="Lead maken…" />
              <input type="hidden" name="prospectId" value={prospect.id} />
              <SubmitButton
                pendingLabel="Lead maken…"
                className="h-12 w-full cursor-pointer rounded-md bg-copper-dark text-sm font-semibold text-ivory"
              >
                Maak lead
              </SubmitButton>
            </form>
          ) : (
            <p className="text-sm text-olive">Deze prospect is al omgezet naar een lead.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <h2 className="font-semibold">Activiteit</h2>
        <ul className="mt-4 divide-y divide-ink/6">
          {prospect.activities.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span>{labelForActivity(item.event_type, item.metadata)}</span>
              <span className="text-xs text-ink/40">
                {labelForActor(item.actor_type)} · {formatNlDateTime(item.created_at)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4">
      <div className="text-xs text-ink/45">{label}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  );
}

function OfferCard({ fit, city }: { fit: ProductFit | null; city: string | null }) {
  if (!fit) return null;

  const copy = explainOutreachOffer({ fit, place: city });

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-5">
      <h2 className="text-2xl font-semibold">{copy.title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/60">{copy.text}</p>
      {copy.price ? <p className="mt-4 text-sm font-semibold">{copy.price}</p> : null}
      <p className="mt-2 text-xs text-ink/45">Dit aanbod staat niet automatisch in de eerste acquisitiemail.</p>
      {copy.reasonLabels.length ? (
        <p className="mt-2 text-xs text-ink/45">Reden: {copy.reasonLabels.join(" · ")}</p>
      ) : null}
      {city && !copy.eligible && fit === "STANDARD_FIT" ? (
        <p className="mt-2 text-xs text-ink/45">Plaats {city} geeft geen automatische korting.</p>
      ) : null}
    </section>
  );
}
