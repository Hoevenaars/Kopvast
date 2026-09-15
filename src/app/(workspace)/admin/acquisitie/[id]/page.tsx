import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { convertProspectForm, rescanProspectAction, updateFollowUpForm } from "@/app/(workspace)/admin/acquisitie/actions";
import { PageIntro } from "@/components/workspace/page-frame";
import { FormBusyOverlay, SubmitButton } from "@/components/workspace/form-busy";
import { fieldClass, Field } from "@/components/form-fields";
import { loadProspectDetail } from "@/lib/acquisition";
import {
  FINDING_CATEGORY_LABELS,
  formatNlDate,
  labelForContact,
  labelForFit,
  labelForMail,
  labelForStatus,
  pickCommercialFindings,
  responseStatuses,
  type ProductFit,
} from "@/lib/acquisition-constants";
import { products } from "@/lib/site";
import { getEmailMode, getTestEmail } from "@/lib/email-mode";
import { MailEditor } from "../mail-editor";
import { ScanProgress } from "../scan-progress";
import { EmailModeBanner } from "../email-mode-banner";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const prospect = await loadProspectDetail(id);
  return { title: prospect?.company_name || prospect?.domain || "Prospect", robots: { index: false, follow: false } };
}

export default async function ProspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prospect = await loadProspectDetail(id);
  if (!prospect) notFound();

  const running = ["queued", "running"].includes(prospect.scan?.status ?? "") || ["SCANNING", "ANALYSING", "VALIDATING"].includes(prospect.status);
  const commercialFindings = pickCommercialFindings(prospect.findings, 5);
  const mode = getEmailMode();
  const blocked = prospect.do_not_contact || prospect.contact_status === "BLOCKED" || prospect.contact_status === "DO_NOT_CONTACT" || Boolean(prospect.suppression);

  return (
    <div className="space-y-8">
      <PageIntro eyebrow={prospect.domain} title={prospect.company_name || prospect.domain} text={prospect.website_url} />
      <EmailModeBanner mode={mode} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Opportunity Score" value={prospect.opportunity_score == null ? "—" : `${Math.round(prospect.opportunity_score)} / 100`} />
        <Stat label="Prospectstatus" value={labelForStatus(prospect.status)} />
        <Stat label="Product Fit" value={labelForFit(prospect.product_fit)} />
        <Stat label="Contactstatus" value={labelForContact(prospect.contact_status)} />
        <Stat label="Mailstatus" value={labelForMail(prospect.mail_status)} />
        <Stat label="E-mail" value={prospect.contact?.email || "—"} />
        <Stat label="Laatste activiteit" value={formatNlDate(prospect.last_activity_at)} />
        <Stat label="Kosten" value={`€ ${prospect.total_cost.toFixed(4)}`} />
      </section>

      {prospect.scan ? <ScanProgress running={running} steps={prospect.scan.progress} /> : null}
      {prospect.scan?.error_message ? (
        <p className="rounded-2xl border border-destructive/30 bg-white px-4 py-3 text-sm text-destructive">{prospect.scan.error_message}</p>
      ) : null}

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <h2 className="font-semibold">Wat valt op?</h2>
        {commercialFindings.length === 0 ? (
          <p className="mt-3 text-sm text-ink/45">Nog geen commerciële findings. De scan loopt of leverde te weinig signaal.</p>
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

      <OfferCard fit={prospect.product_fit} />

      {prospect.mail ? (
        <MailEditor
          key={prospect.mail.id}
          prospectId={prospect.id}
          mailId={prospect.mail.id}
          subject={prospect.mail.subject ?? ""}
          body={prospect.mail.body_text ?? ""}
          mode={mode}
          intended={prospect.contact?.email ?? null}
          testTo={getTestEmail()}
          canSend={!blocked && Boolean(prospect.contact?.email)}
        />
      ) : (
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
              <span>{item.event_type}</span>
              <span className="text-xs text-ink/40">
                {item.actor_type} · {new Date(item.created_at).toLocaleString("nl-NL")}
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

function OfferCard({ fit }: { fit: ProductFit | null }) {
  if (!fit) return null;

  const copy =
    fit === "CUSTOM_FIT"
      ? {
          title: "Kopvast Maatwerk",
          text: "De website lijkt commercieel interessant, maar de benodigde functionaliteit valt waarschijnlijk buiten het vaste websitepakket.",
          price: "Op aanvraag",
        }
      : fit === "NOT_FIT"
        ? {
            title: "Geen standaard fit",
            text: "Deze website lijkt niet bij het Kopvast-aanbod te passen. Er wordt geen automatische prijs of standaardpakket voorgesteld.",
            price: null,
          }
        : fit === "REVIEW_REQUIRED"
          ? {
              title: "Beoordeling nodig",
              text: "Er is nog te weinig zekerheid voor een automatisch aanbod. Controleer de findings voordat je een mail verstuurt.",
              price: null,
            }
          : {
              title: "Kopvast Website",
              text: "Een professionele website met een duidelijke structuur, sterke presentatie en heldere route naar contact.",
              price: `Vanaf ${products.website.price} excl. btw`,
            };

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-5">
      <h2 className="text-2xl font-semibold">{copy.title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/60">{copy.text}</p>
      {copy.price ? <p className="mt-4 text-sm font-semibold">{copy.price}</p> : null}
    </section>
  );
}
