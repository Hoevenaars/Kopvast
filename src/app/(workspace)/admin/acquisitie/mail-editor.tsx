"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  regenerateMailAction,
  saveMailAction,
  sendLiveMailAction,
  sendTestMailAction,
} from "@/app/(workspace)/admin/acquisitie/actions";
import { MailPreview } from "@/app/(workspace)/admin/acquisitie/mail-preview";
import { areaClass, fieldClass, Field } from "@/components/form-fields";
import type { EmailMode } from "@/lib/email-mode";

type ActionResult = { ok: boolean; message?: string; skippedDuplicate?: boolean };

export function MailEditor({
  prospectId,
  mailId,
  subject: initialSubject,
  body: initialBody,
  companyName,
  domain,
  mode,
  intended,
  testTo,
  canSend,
}: {
  prospectId: string;
  mailId: string;
  subject: string;
  body: string;
  companyName?: string | null;
  domain: string;
  mode: EmailMode;
  intended: string | null;
  testTo: string;
  canSend: boolean;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [actionPending, startAction] = useTransition();
  const lock = useRef(false);

  function run(
    action: (formData: FormData) => Promise<ActionResult | { ok: true }>,
    extra?: Record<string, string>,
    success = "Opgeslagen.",
    pendingText = "Bezig…"
  ) {
    if (lock.current || actionPending) return;
    lock.current = true;
    setBusyLabel(pendingText);
    setMessage(null);
    const data = new FormData();
    data.set("prospectId", prospectId);
    data.set("mailId", mailId);
    data.set("subject", subject);
    data.set("body", body);
    for (const [key, value] of Object.entries(extra ?? {})) data.set(key, value);
    startAction(async () => {
      try {
        const result = await action(data);
        if (result.ok) {
          router.refresh();
          setMessage({
            ok: true,
            text: "skippedDuplicate" in result && result.skippedDuplicate ? "Deze mail is al onderweg." : success,
          });
        } else {
          setMessage({ ok: false, text: ("message" in result && result.message) || "Er ging iets mis." });
        }
      } finally {
        lock.current = false;
        setBusyLabel(null);
      }
    });
  }

  const pending = actionPending || Boolean(busyLabel);

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
      <h2 className="font-semibold">Persoonlijke acquisitiemail</h2>
      {mode === "TEST" ? (
        <div className="rounded-xl bg-[#F3E4DD] px-4 py-3 text-sm text-copper-dark">
          <p className="font-semibold">TEST MODE</p>
          <p className="mt-1">Werkelijke ontvanger: {intended || "—"}</p>
          <p>Test wordt verzonden naar: {testTo}</p>
        </div>
      ) : (
        <div className="rounded-xl bg-[#F3E4DD] px-4 py-3 text-sm text-copper-dark">
          LIVE MODE — deze mail gaat naar {intended}.
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-4">
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
              className={`${areaClass} min-h-64 lg:min-h-[28rem]`}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              disabled={pending}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(regenerateMailAction, undefined, "Nieuwe conceptmail klaar.", "Nieuwe mail maken…")}
              className="h-12 cursor-pointer rounded-md border border-ink/15 text-sm font-semibold disabled:cursor-wait disabled:opacity-50"
            >
              Opnieuw genereren
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(saveMailAction, undefined, "Concept opgeslagen.", "Concept opslaan…")}
              className="h-12 cursor-pointer rounded-md border border-ink/15 text-sm font-semibold disabled:cursor-wait disabled:opacity-50"
            >
              Concept opslaan
            </button>
            <button
              type="button"
              disabled={pending || !canSend}
              onClick={() => run(sendTestMailAction, undefined, "Testmail verstuurd.", "Testmail versturen…")}
              className="h-12 cursor-pointer rounded-md border border-ink/15 text-sm font-semibold disabled:cursor-wait disabled:opacity-50"
            >
              Testmail sturen
            </button>
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
                  undefined,
                  mode === "LIVE" ? "Mail verstuurd." : "Mail naar testadres verstuurd.",
                  "Mail versturen…"
                );
              }}
              className="h-12 cursor-pointer rounded-md bg-copper-dark text-sm font-semibold text-ivory disabled:cursor-wait disabled:opacity-50"
            >
              {mode === "LIVE" ? "Versturen" : "Versturen naar testadres"}
            </button>
          </div>
          {mode !== "LIVE" ? (
            <p className="text-xs text-ink/45">
              TEST MODE. Versturen doorloopt de echte flow, maar Resend levert af op {testTo}. LIVE zet je aan onder
              Instellingen.
            </p>
          ) : (
            <p className="text-xs text-ink/45">LIVE MODE. Versturen gaat naar {intended || "het prospectadres"}.</p>
          )}
          {message ? <p className={`text-sm ${message.ok ? "text-olive" : "text-destructive"}`}>{message.text}</p> : null}
        </div>

        <div className="lg:sticky lg:top-24">
          <h3 className="text-sm font-semibold">Preview</h3>
          <div className="mt-3 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
            <MailPreview subject={subject} body={body} companyName={companyName} domain={domain} />
          </div>
        </div>
      </div>
    </section>
  );
}
