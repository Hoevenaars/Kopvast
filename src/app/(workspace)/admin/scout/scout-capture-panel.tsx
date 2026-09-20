import { SCOUT_STATUS_LABELS } from "@/lib/scout/types";
import { scoutSourceLabel, type AdminScoutCapture } from "@/lib/scout/crm";
import { formatNlDate } from "@/lib/acquisition-constants";

export function ScoutCapturePanel({ capture }: { capture: AdminScoutCapture }) {
  return (
    <section className="space-y-5 rounded-2xl border border-copper/25 bg-[#FBF6F2] p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-copper-dark uppercase">Kopvast Scout</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">Vanaf de telefoon</h2>
          <p className="mt-1 text-sm text-ink/55">
            {scoutSourceLabel(capture.source)} · {SCOUT_STATUS_LABELS[capture.status]}
            {capture.score != null ? ` · Score ${capture.score}` : ""}
          </p>
        </div>
        <p className="text-xs text-ink/40">{formatNlDate(capture.created_at)}</p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <Item label="Opmerking" value={capture.note || "Geen opmerking"} />
        <Item label="Waarom interessant" value={capture.why_interesting || "Scan loopt of is nog niet klaar."} />
        <Item label="Grootste kans" value={capture.biggest_opportunity || "—"} />
        <Item
          label="Contact"
          value={[capture.email || "geen e-mail", capture.phone || "geen telefoon"].join(" · ")}
        />
      </dl>

      {capture.opportunities.length ? (
        <ul className="space-y-2 text-sm text-ink/70">
          {capture.opportunities.map((item) => (
            <li key={item.title}>
              <span className="font-medium text-ink">{item.title}.</span> {item.detail}
            </li>
          ))}
        </ul>
      ) : null}

      {capture.draft_subject || capture.draft_message ? (
        <div className="rounded-xl border border-ink/8 bg-white p-4">
          <p className="text-[11px] tracking-[0.18em] text-olive uppercase">Scout-concept</p>
          <p className="mt-2 font-semibold text-ink">{capture.draft_subject || "Zonder onderwerp"}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/70">{capture.draft_message}</p>
          <p className="mt-3 text-xs text-olive">
            {capture.draft_status === "approved"
              ? "Goedgekeurd in Scout. Er is niets automatisch verstuurd."
              : "Concept. Versturen blijft handmatig vanuit Acquisitie."}
          </p>
        </div>
      ) : capture.last_error ? (
        <p className="text-sm text-destructive">{capture.last_error}</p>
      ) : null}
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-ink/40 uppercase">{label}</dt>
      <dd className="mt-1 text-sm leading-6 text-ink">{value}</dd>
    </div>
  );
}
