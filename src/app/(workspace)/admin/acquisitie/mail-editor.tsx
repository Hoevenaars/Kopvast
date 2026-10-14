"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateMailAction, saveMailAction, sendLiveMailAction } from "@/app/(workspace)/admin/acquisitie/actions";
import { MailPreview } from "@/app/(workspace)/admin/acquisitie/mail-preview";
import { areaClass, fieldClass, Field } from "@/components/form-fields";
import { applyManualOfferToMailBody, paragraphForManualDiscount } from "@/lib/acquisition/manual-offer";
import {
  APPROACH_SOURCE_LABELS,
  CONTENT_REASON_LABELS,
  GEOGRAPHIC_REASON_LABELS,
  approachSourceLabel,
  buildPersonalApproachLetter,
  replacePersonalOpening,
} from "@/lib/acquisition/outreach-policy";
import type { PersonalApproachLetter } from "@/lib/acquisition/outreach-policy";
import type {
  ApproachSourceKind,
  ContentOfferReason,
  GeographicOfferReason,
} from "@/lib/acquisition/special-offer-rules";
import type { EmailMode } from "@/lib/email-mode";

type ActionResult = { ok: boolean; message?: string; skippedDuplicate?: boolean };
type GeoChoice = Exclude<GeographicOfferReason, null>;
type ContentChoice = Exclude<ContentOfferReason, null>;
type SourceChoice = ApproachSourceKind;

const GEO_OPTIONS: Array<{ value: "" | GeoChoice; label: string }> = [
  { value: "", label: "Geen plaatselijke reden" },
  { value: "GROESBEEK", label: GEOGRAPHIC_REASON_LABELS.GROESBEEK },
  { value: "BERG_EN_DAL", label: GEOGRAPHIC_REASON_LABELS.BERG_EN_DAL },
  { value: "REGION_NIJMEGEN", label: GEOGRAPHIC_REASON_LABELS.REGION_NIJMEGEN },
];

const CONTENT_OPTIONS: Array<{ value: "" | ContentChoice; label: string }> = [
  { value: "", label: "Geen inhoudelijke reden" },
  ...(Object.entries(CONTENT_REASON_LABELS) as Array<[ContentChoice, string]>).map(([value, label]) => ({
    value,
    label,
  })),
];

export function MailEditor({
  prospectId,
  mailId,
  subject: initialSubject,
  body: initialBody,
  companyName,
  domain,
  mode,
  intended,
  canSend,
  title = "Persoonlijke acquisitiemail",
  layout = "outreach",
  approach,
  note,
  place,
  municipality,
}: {
  prospectId: string;
  mailId: string;
  subject: string;
  body: string;
  companyName?: string | null;
  domain: string;
  mode: EmailMode;
  intended: string | null;
  canSend: boolean;
  title?: string;
  layout?: "outreach" | "short";
  approach?: PersonalApproachLetter | null;
  note?: string | null;
  place?: string | null;
  municipality?: string | null;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [savedSubject, setSavedSubject] = useState(initialSubject);
  const [savedBody, setSavedBody] = useState(initialBody);
  const [phase, setPhase] = useState<"concept" | "edit">("concept");
  const [geographic, setGeographic] = useState<"" | GeoChoice>("");
  const [content, setContent] = useState<"" | ContentChoice>("");
  const [launch, setLaunch] = useState(false);
  const [approachGeo, setApproachGeo] = useState<"" | GeoChoice>(approach?.geographicReason ?? "");
  const [approachContent, setApproachContent] = useState<"" | ContentChoice>(approach?.contentReason ?? "");
  const [approachEvidence, setApproachEvidence] = useState(approach?.evidence ?? "");
  const [approachSourceUrl, setApproachSourceUrl] = useState(approach?.sourceUrl ?? "");
  const [approachSourceKind, setApproachSourceKind] = useState<"" | SourceChoice>(approach?.sourceKind ?? "");
  const [opening, setOpening] = useState(approach?.opening ?? "");
  const hasWebsite = approach?.websitePresence !== "NO_WEBSITE";
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [actionPending, startAction] = useTransition();
  const lock = useRef(false);
  const approachSnapshot = useRef({
    geographic: approach?.geographicReason ?? ("" as "" | GeoChoice),
    content: approach?.contentReason ?? ("" as "" | ContentChoice),
    evidence: approach?.evidence ?? "",
    sourceUrl: approach?.sourceUrl ?? "",
    sourceKind: approach?.sourceKind ?? ("" as "" | SourceChoice),
  });

  const pending = actionPending || Boolean(busyLabel);
  const openingAxis = approachContent && approachEvidence.trim() ? "content" : approachGeo ? "geographic" : null;
  const dirty = subject !== savedSubject || body !== savedBody;

  function run(
    action: (formData: FormData) => Promise<ActionResult | { ok: true }>,
    success: string,
    pendingText: string,
    afterSuccess?: () => void
  ) {
    if (lock.current || pending) return;
    lock.current = true;
    setBusyLabel(pendingText);
    setMessage(null);
    const data = new FormData();
    data.set("prospectId", prospectId);
    data.set("mailId", mailId);
    data.set("subject", subject);
    data.set("body", body);
    if (layout !== "short" && opening.trim()) {
      data.set(
        "approach",
        JSON.stringify({
          geographicReason: approachGeo || null,
          contentReason: approachContent || null,
          evidence: approachEvidence.trim() || null,
          sourceUrl: approachSourceUrl.trim() || null,
          sourceKind: approachSourceKind || null,
          websitePresence: hasWebsite ? "HAS_WEBSITE" : "NO_WEBSITE",
          opening,
        })
      );
    }
    startAction(async () => {
      try {
        const result = await action(data);
        if (result.ok) {
          router.refresh();
          setMessage({
            ok: true,
            text: "skippedDuplicate" in result && result.skippedDuplicate ? "Deze mail is al onderweg." : success,
          });
          afterSuccess?.();
        } else {
          setMessage({ ok: false, text: ("message" in result && result.message) || "Er ging iets mis." });
        }
      } finally {
        lock.current = false;
        setBusyLabel(null);
      }
    });
  }

  function applyApproach(next: {
    geographic: "" | GeoChoice;
    content: "" | ContentChoice;
    evidence: string;
    sourceUrl: string;
    sourceKind: "" | SourceChoice;
  }) {
    const previous = approachSnapshot.current;
    if (
      previous.geographic === next.geographic &&
      previous.content === next.content &&
      previous.evidence === next.evidence &&
      previous.sourceUrl === next.sourceUrl &&
      previous.sourceKind === next.sourceKind
    ) {
      return;
    }
    approachSnapshot.current = next;
    const letter = buildPersonalApproachLetter({
      companyName,
      domain,
      place,
      municipality,
      websitePresence: hasWebsite ? "HAS_WEBSITE" : "NO_WEBSITE",
      manualReasons: {
        geographicReason: next.geographic || null,
        contentReason: next.content || null,
      },
      contentEvidence:
        next.content && next.evidence.trim()
          ? [
              {
                reason: next.content,
                evidence: next.evidence.trim(),
                confidence: 1,
                sourceUrl: next.sourceUrl.trim() || undefined,
                sourceKind: next.sourceKind || undefined,
              },
            ]
          : [],
    });
    setApproachGeo(next.geographic);
    setApproachContent(next.content);
    setApproachEvidence(next.evidence);
    setApproachSourceUrl(next.sourceUrl);
    setApproachSourceKind(next.sourceKind);
    setOpening(letter.opening);
    setBody((current) => replacePersonalOpening(current, opening, letter.opening));
    setPhase("concept");
    setMessage({
      ok: true,
      text: letter.sufficient
        ? "Aanleiding staat in de opening. Werk het concept bij om het te bewaren. Er is geen prijs toegevoegd."
        : "Nog onvoldoende bewijs. De opening blijft neutraal en er is geen prijs toegevoegd.",
    });
  }

  function applyDiscount() {
    const offer = paragraphForManualDiscount({
      geographicReason: launch ? null : geographic || null,
      contentReason: launch ? null : content || null,
      allowLaunchOffer: launch,
    });
    const applied = applyManualOfferToMailBody(body, offer.paragraph);
    if (!applied.ok) {
      setMessage({ ok: false, text: applied.message });
      return;
    }
    setBody(applied.body);
    setPhase("concept");
    setMessage({
      ok: true,
      text: offer.discounted
        ? "Korting staat in het concept. Werk het concept bij om het te bewaren."
        : "Normale prijs staat in het concept. Werk het concept bij om het te bewaren.",
    });
  }

  function saveDraft() {
    run(saveMailAction, "Concept bijgewerkt.", "Concept bijwerken…", () => {
      setSavedSubject(subject);
      setSavedBody(body);
      setPhase("concept");
    });
  }

  return (
    <section className="relative space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
      {busyLabel ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-ivory/80 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold shadow-sm">
            <span className="size-4 animate-spin rounded-full border-2 border-ink/15 border-t-copper-dark" />
            {busyLabel}
          </div>
        </div>
      ) : null}
      <div>
        <h2 id={layout === "short" ? "handmatige-mail" : undefined} className="font-semibold">
          {layout === "short" ? title : phase === "edit" ? "Concept aanpassen" : "Concept"}
        </h2>
        <p className="mt-1 text-sm text-ink/60">
          {layout === "short"
            ? "Concept op basis van de eerdere mail en website. Bekijk de preview, zet er desgewenst een korting op, pas de tekst aan en verstuur zelf. Kopvast verstuurt dit niet automatisch."
            : phase === "edit"
              ? "Pas de tekst aan en werk het concept bij. Daarna zie je de mail opnieuw, voordat je verstuurt."
              : "Dit concept gaat de deur uit. Pas het aan, kies zelf of er een korting in komt, en verstuur daarna."}
        </p>
      </div>

      {layout !== "short" ? (
        <div className="max-w-3xl space-y-3 rounded-xl border border-ink/10 bg-ivory px-4 py-4">
          <div>
            <h3 className="text-sm font-semibold">Persoonlijke aanleiding</h3>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              Dit is waarom Kopvast contact zoekt. Hooguit één plaats en één inhoudelijke reden, en bij voorkeur één
              daarvan in de opening. Een aanleiding zet geen prijs of korting in de mail.
            </p>
          </div>
          <p className="text-sm text-ink/80">
            Geselecteerd:{" "}
            {[
              approachGeo ? GEOGRAPHIC_REASON_LABELS[approachGeo] : null,
              approachContent ? CONTENT_REASON_LABELS[approachContent] : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Geen controleerbare aanleiding"}
            {openingAxis === "content"
              ? " · opening gebruikt de inhoudelijke reden"
              : openingAxis === "geographic"
                ? " · opening gebruikt de plaats"
                : " · neutrale opening"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="approach-geo" label="Plaatselijke aanleiding">
              <select
                id="approach-geo"
                className={fieldClass}
                value={approachGeo}
                disabled={pending}
                onChange={(event) =>
                  applyApproach({
                    geographic: event.target.value as "" | GeoChoice,
                    content: approachContent,
                    evidence: approachEvidence,
                    sourceUrl: approachSourceUrl,
                    sourceKind: approachSourceKind,
                  })
                }
              >
                {GEO_OPTIONS.map((option) => (
                  <option key={`approach-${option.value || "none"}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="approach-content" label="Inhoudelijke aanleiding">
              <select
                id="approach-content"
                className={fieldClass}
                value={approachContent}
                disabled={pending}
                onChange={(event) =>
                  applyApproach({
                    geographic: approachGeo,
                    content: event.target.value as "" | ContentChoice,
                    evidence: approachEvidence,
                    sourceUrl: approachSourceUrl,
                    sourceKind: approachSourceKind,
                  })
                }
              >
                {CONTENT_OPTIONS.map((option) => (
                  <option key={`approach-${option.value || "none"}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field id="approach-evidence" label="Onderbouwing">
            <textarea
              id="approach-evidence"
              className={`${areaClass} min-h-24`}
              value={approachEvidence}
              disabled={pending}
              placeholder="Alleen een controleerbaar feit. Zonder bewijs blijft de opening neutraal."
              onChange={(event) => setApproachEvidence(event.target.value)}
              onBlur={() =>
                applyApproach({
                  geographic: approachGeo,
                  content: approachContent,
                  evidence: approachEvidence,
                  sourceUrl: approachSourceUrl,
                  sourceKind: approachSourceKind,
                })
              }
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="approach-source-kind" label="Bron">
              <select
                id="approach-source-kind"
                className={fieldClass}
                value={approachSourceKind}
                disabled={pending}
                onChange={(event) => {
                  const sourceKind = event.target.value as "" | SourceChoice;
                  applyApproach({
                    geographic: approachGeo,
                    content: approachContent,
                    evidence: approachEvidence,
                    sourceUrl: approachSourceUrl,
                    sourceKind,
                  });
                }}
              >
                <option value="">Geen bron</option>
                {(Object.entries(APPROACH_SOURCE_LABELS) as Array<[SourceChoice, string]>)
                  .filter(([value]) => hasWebsite || value !== "website")
                  .map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
              </select>
            </Field>
            <Field id="approach-source-url" label="Bronadres">
              <input
                id="approach-source-url"
                className={fieldClass}
                value={approachSourceUrl}
                disabled={pending}
                placeholder="https://…"
                onChange={(event) => setApproachSourceUrl(event.target.value)}
                onBlur={() =>
                  applyApproach({
                    geographic: approachGeo,
                    content: approachContent,
                    evidence: approachEvidence,
                    sourceUrl: approachSourceUrl,
                    sourceKind: approachSourceKind,
                  })
                }
              />
            </Field>
          </div>
          <p className="text-sm text-ink/60">
            Bron:{" "}
            {approachSourceLabel({
              sourceKind: approachSourceKind || null,
              sourceUrl: approachSourceUrl,
              openingAxis,
            })}
          </p>
          {note?.trim() ? (
            <p className="text-sm leading-6 text-ink/60">
              Beschikbare notitie, nog geen automatische reden: {note.trim()}
            </p>
          ) : null}
          <Field id="approach-opening" label="Voorgestelde opening">
            <textarea
              id="approach-opening"
              className={`${areaClass} min-h-28`}
              value={opening}
              disabled={pending}
              onChange={(event) => {
                const next = event.target.value;
                setBody((current) => replacePersonalOpening(current, opening, next));
                setOpening(next);
              }}
            />
          </Field>
        </div>
      ) : null}

      {phase === "concept" ? (
        <div className="max-w-xl">
          <MailPreview subject={subject} body={body} companyName={companyName} domain={domain} layout={layout} />
        </div>
      ) : (
        <div className="max-w-3xl space-y-4">
          <Field id="subject" label="Onderwerp">
            <input
              id="subject"
              className={fieldClass}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              disabled={pending}
            />
          </Field>
          <Field id="body" label="Mailtekst">
            <textarea
              id="body"
              className={`${areaClass} min-h-64`}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              disabled={pending}
            />
          </Field>
        </div>
      )}

      {phase === "concept" ? (
        <div className="max-w-xl space-y-3 rounded-xl border border-ink/10 bg-ivory px-4 py-4">
          <div>
            <h3 className="text-sm font-semibold">Commercieel aanbod</h3>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              Apart van de persoonlijke aanleiding. Zet hier alleen een prijs in als de commerciële situatie daarom
              vraagt. Hooguit één plaats en één inhoudelijke reden. Zonder reden blijft €1.495 staan.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="geo-reason" label="Plaats">
              <select
                id="geo-reason"
                className={fieldClass}
                value={launch ? "" : geographic}
                disabled={pending || launch}
                onChange={(event) => setGeographic(event.target.value as "" | GeoChoice)}
              >
                {GEO_OPTIONS.map((option) => (
                  <option key={option.value || "none"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="content-reason" label="Inhoud">
              <select
                id="content-reason"
                className={fieldClass}
                value={launch ? "" : content}
                disabled={pending || launch}
                onChange={(event) => setContent(event.target.value as "" | ContentChoice)}
              >
                {CONTENT_OPTIONS.map((option) => (
                  <option key={option.value || "none"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <label className="flex items-start gap-2 text-sm text-ink/80">
            <input
              type="checkbox"
              className="mt-1"
              checked={launch}
              disabled={pending}
              onChange={(event) => setLaunch(event.target.checked)}
            />
            <span>Scherpe uitzondering, zonder plaats of inhoudelijke reden.</span>
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={applyDiscount}
            className="h-11 cursor-pointer rounded-md border border-ink/15 px-4 text-sm font-semibold disabled:cursor-wait disabled:opacity-50"
          >
            Korting toepassen
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {phase === "edit" ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={saveDraft}
              className="h-12 cursor-pointer rounded-md bg-copper-dark px-5 text-sm font-semibold text-ivory disabled:cursor-wait disabled:opacity-50"
            >
              Bijwerken
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setSubject(savedSubject);
                setBody(savedBody);
                setPhase("concept");
                setMessage(null);
              }}
              className="h-12 cursor-pointer rounded-md border border-ink/15 px-5 text-sm font-semibold disabled:cursor-wait disabled:opacity-50"
            >
              Annuleren
            </button>
          </>
        ) : dirty ? (
          <button
            type="button"
            disabled={pending}
            onClick={saveDraft}
            className="h-12 cursor-pointer rounded-md bg-copper-dark px-5 text-sm font-semibold text-ivory disabled:cursor-wait disabled:opacity-50"
          >
            Bijwerken
          </button>
        ) : (
          <button
            type="button"
            disabled={pending || !canSend}
            onClick={() => {
              if (mode === "LIVE") {
                const target = intended || "het prospectadres";
                if (!window.confirm(`Deze mail gaat naar ${target}. Versturen?`)) return;
              }
              run(
                sendLiveMailAction,
                mode === "LIVE" ? "Mail verstuurd." : "Mail naar het testadres verstuurd.",
                "Mail versturen…"
              );
            }}
            className="h-12 cursor-pointer rounded-md bg-copper-dark px-5 text-sm font-semibold text-ivory disabled:cursor-wait disabled:opacity-50"
          >
            {mode === "LIVE" ? "Verzenden" : "Verzenden naar testadres"}
          </button>
        )}
        {phase === "concept" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setMessage(null);
              setPhase("edit");
            }}
            className="h-12 cursor-pointer rounded-md border border-ink/15 px-5 text-sm font-semibold disabled:cursor-wait disabled:opacity-50"
          >
            Aanpassen
          </button>
        ) : null}
      </div>

      {phase === "concept" && !dirty && layout !== "short" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Het huidige concept wordt vervangen door een nieuw concept. Doorgaan?")) return;
            run(regenerateMailAction, "Nieuw concept klaar.", "Nieuw concept maken…");
          }}
          className="text-sm font-medium text-ink/55 underline-offset-2 hover:underline disabled:opacity-50"
        >
          Opnieuw genereren
        </button>
      ) : null}

      {message ? <p className={`text-sm ${message.ok ? "text-olive" : "text-destructive"}`}>{message.text}</p> : null}
    </section>
  );
}
