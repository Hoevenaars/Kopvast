import {
  blockProspectForm,
  closeProspectForm,
  prepareManualFollowUpForm,
  rescanProspectAction,
  scheduleNurtureForm,
} from "@/app/(workspace)/admin/acquisitie/actions";
import { ConfirmSubmit } from "@/components/acquisition/confirm-submit";
import { fieldClass, Field } from "@/components/form-fields";
import { FormBusyOverlay, SubmitButton } from "@/components/workspace/form-busy";
import {
  FOLLOW_UP_ACTIVITY_LABELS,
  labelForNurtureReason,
  nurtureIsDue,
  nurturePresets,
  nurtureReasons,
  showNoResponseChoices,
  showNurtureReview,
  summarizeScanChanges,
  type ScanChangeSummary,
} from "@/lib/acquisition/follow-up";
import { formatNlDate } from "@/lib/acquisition-constants";
import type { ProspectDetail } from "@/lib/acquisition";

const buttonClass = "h-12 cursor-pointer rounded-md px-4 text-sm font-semibold";

export function CommercialFollowUp({ prospect, asOf }: { prospect: ProspectDetail; asOf: string }) {
  const blocked =
    prospect.do_not_contact ||
    prospect.contact_status === "BLOCKED" ||
    prospect.contact_status === "DO_NOT_CONTACT" ||
    Boolean(prospect.suppression);
  const review =
    !blocked &&
    (showNurtureReview({ nurtureStatus: prospect.nurture_status, blocked }) ||
      nurtureIsDue(prospect.nurture_status, prospect.nurture_until, new Date(asOf)));
  const choices = showNoResponseChoices({
    autoFollowUpSentAt: prospect.auto_follow_up_sent_at,
    responseStatus: prospect.response_status,
    commercialIntent: prospect.commercial_intent,
    commercialStage: prospect.commercial_stage,
    doNotContact: prospect.do_not_contact,
    status: prospect.status,
    nurtureStatus: prospect.nurture_status,
    blocked,
  });
  const scheduled = Boolean(
    prospect.auto_follow_up_due_at && !prospect.auto_follow_up_sent_at && !prospect.auto_follow_up_cancelled_at
  );

  if (!review && !choices && !scheduled && prospect.nurture_status !== "SCHEDULED") return null;

  const comparison =
    prospect.previousScan || prospect.previousFindings.length
      ? summarizeScanChanges({
          previousFindings: prospect.previousFindings,
          nextFindings: prospect.findings,
          previousScore: prospect.previousOpportunityScore,
          nextScore: prospect.opportunity_score,
        })
      : null;

  return (
    <section className="space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
      {scheduled ? (
        <p className="text-sm text-ink/70">
          Automatische follow-up gepland op {formatNlDate(prospect.auto_follow_up_due_at)}. Er gaat precies één mail
          de deur uit, en alleen als opvolging dan nog mag.
        </p>
      ) : null}
      {prospect.nurture_status === "SCHEDULED" && prospect.nurture_until && !review ? (
        <p className="text-sm text-ink/70">
          Opnieuw benaderen op {formatNlDate(prospect.nurture_until)}. Reden: {labelForNurtureReason(prospect.nurture_reason)}.
          Er wordt dan geen mail verstuurd.
        </p>
      ) : null}
      {review ? <NurtureReview prospect={prospect} comparison={comparison} /> : null}
      {choices ? <NoResponseChoices prospectId={prospect.id} /> : null}
    </section>
  );
}

function NoResponseChoices({ prospectId }: { prospectId: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold">Geen reactie</h2>
        <p className="mt-1 text-sm text-ink/60">De automatische follow-up is verstuurd. De volgende stap is een menselijke keuze.</p>
      </div>
      <form action={prepareManualFollowUpForm} className="relative">
        <FormBusyOverlay label="Concept openen…" />
        <input type="hidden" name="prospectId" value={prospectId} />
        <input type="hidden" name="source" value="manual" />
        <SubmitButton pendingLabel="Concept openen…" className={`${buttonClass} bg-ink text-ivory`}>
          Handmatig opvolgen
        </SubmitButton>
      </form>
      <NurtureForm prospectId={prospectId} postponed={false} />
      <BlockForm prospectId={prospectId} />
    </div>
  );
}

function NurtureReview({
  prospect,
  comparison,
}: {
  prospect: ProspectDetail;
  comparison: ScanChangeSummary | null;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold">Opnieuw beoordelen</h2>
        <p className="mt-1 text-sm text-ink/60">
          {prospect.company_name || prospect.domain} is aan de beurt. Er gaat niets automatisch de deur uit.
        </p>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Item label="Organisatie" value={prospect.company_name || prospect.domain} />
        <Item label="Website" value={prospect.website_url} />
        <Item label="Laatste contact" value={formatNlDate(prospect.last_contacted_at)} />
        <Item label="Reden" value={labelForNurtureReason(prospect.nurture_reason)} />
        <Item label="Notitie" value={prospect.nurture_note || "—"} />
        <Item label="Vorige scan" value={prospect.previousScan ? formatNlDate(prospect.previousScan.completed_at || prospect.previousScan.started_at) : "—"} />
      </dl>
      {comparison ? (
        <div className="rounded-xl bg-ivory p-4 text-sm leading-6">
          <p className="font-semibold">Vorige scan → nieuwe scan</p>
          {comparison.scoreLine ? <p className="mt-2">{comparison.scoreLine}</p> : null}
          <p className="mt-2">{comparison.angle}</p>
          {comparison.same.length ? <p className="mt-2 text-ink/60">Nog hetzelfde: {comparison.same.join(", ")}.</p> : null}
          {comparison.changed.length ? <p className="mt-1 text-ink/60">Veranderd: {comparison.changed.join(", ")}.</p> : null}
        </div>
      ) : null}
      {prospect.findings.length ? (
        <div>
          <h3 className="text-sm font-semibold">Laatste findings</h3>
          <ul className="mt-2 space-y-2 text-sm text-ink/70">
            {prospect.findings.slice(0, 3).map((finding) => (
              <li key={finding.id}>{finding.title}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {prospect.mails.length ? (
        <div>
          <h3 className="text-sm font-semibold">Eerdere mails</h3>
          <ul className="mt-2 space-y-2 text-sm text-ink/70">
            {prospect.mails.slice(0, 4).map((mail) => (
              <li key={mail.id}>
                {mail.subject || "Mail"} · {mail.status}
                {mail.sent_at ? ` · ${formatNlDate(mail.sent_at)}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {prospect.activities.length ? (
        <div>
          <h3 className="text-sm font-semibold">Contacthistorie</h3>
          <ul className="mt-2 space-y-2 text-sm text-ink/70">
            {prospect.activities.slice(0, 5).map((item) => (
              <li key={item.id}>
                {FOLLOW_UP_ACTIVITY_LABELS[item.event_type] || item.event_type} · {formatNlDate(item.created_at)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <form action={rescanProspectAction} className="relative">
        <FormBusyOverlay label="Nieuwe scan starten…" />
        <input type="hidden" name="prospectId" value={prospect.id} />
        <input type="hidden" name="website" value={prospect.website_url} />
        <input type="hidden" name="email" value={prospect.contact?.email ?? ""} />
        <SubmitButton pendingLabel="Website opnieuw scannen…" className={`${buttonClass} border border-ink/15`}>
          Website opnieuw scannen
        </SubmitButton>
      </form>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <form action={prepareManualFollowUpForm} className="relative">
          <FormBusyOverlay label="Concept openen…" />
          <input type="hidden" name="prospectId" value={prospect.id} />
          <input type="hidden" name="source" value="nurture" />
          <SubmitButton pendingLabel="Concept openen…" className={`${buttonClass} bg-ink text-ivory`}>
            Maak nieuwe mail
          </SubmitButton>
        </form>
        <form action={closeProspectForm} className="relative">
          <FormBusyOverlay label="Sluiten…" />
          <input type="hidden" name="prospectId" value={prospect.id} />
          <SubmitButton pendingLabel="Sluiten…" className={`${buttonClass} border border-ink/15`}>
            Sluiten
          </SubmitButton>
        </form>
      </div>
      <NurtureForm prospectId={prospect.id} postponed reason={prospect.nurture_reason} note={prospect.nurture_note} />
      <BlockForm prospectId={prospect.id} />
    </div>
  );
}

function NurtureForm({
  prospectId,
  postponed,
  reason,
  note,
}: {
  prospectId: string;
  postponed: boolean;
  reason?: string | null;
  note?: string | null;
}) {
  return (
    <form action={scheduleNurtureForm} className="relative space-y-4">
      <FormBusyOverlay label="Datum opslaan…" />
      <input type="hidden" name="prospectId" value={prospectId} />
      {postponed ? <input type="hidden" name="postponed" value="1" /> : null}
      <h3 className="text-sm font-semibold">{postponed ? "Uitstellen" : "Later opnieuw benaderen"}</h3>
      <Field id={`preset-${prospectId}-${postponed ? "later" : "nu"}`} label="Wanneer">
        <select id={`preset-${prospectId}-${postponed ? "later" : "nu"}`} name="preset" defaultValue="4w" className={fieldClass}>
          {nurturePresets.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field id={`customDate-${prospectId}-${postponed ? "later" : "nu"}`} label="Eigen datum">
        <input id={`customDate-${prospectId}-${postponed ? "later" : "nu"}`} name="customDate" type="date" className={fieldClass} />
      </Field>
      <Field id={`reason-${prospectId}-${postponed ? "later" : "nu"}`} label="Reden">
        <select
          id={`reason-${prospectId}-${postponed ? "later" : "nu"}`}
          name="reason"
          defaultValue={reason || "NO_RESPONSE"}
          className={fieldClass}
        >
          {nurtureReasons.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field id={`note-${prospectId}-${postponed ? "later" : "nu"}`} label="Notitie">
        <textarea
          id={`note-${prospectId}-${postponed ? "later" : "nu"}`}
          name="note"
          defaultValue={note || ""}
          rows={3}
          className={fieldClass}
        />
      </Field>
      <SubmitButton pendingLabel="Opslaan…" className={`${buttonClass} border border-ink/15`}>
        {postponed ? "Uitstellen" : "Later opnieuw benaderen"}
      </SubmitButton>
    </form>
  );
}

function BlockForm({ prospectId }: { prospectId: string }) {
  return (
    <form action={blockProspectForm} className="relative">
      <FormBusyOverlay label="Blokkeren…" />
      <input type="hidden" name="prospectId" value={prospectId} />
      <ConfirmSubmit
        label="Niet meer benaderen"
        confirm="Dit bedrijf niet meer benaderen? Automatische en handmatige acquisitiemail stopt tot je de blokkade opheft."
        className={`${buttonClass} border border-destructive/30 text-destructive`}
      />
    </form>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-ink/40 uppercase">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
