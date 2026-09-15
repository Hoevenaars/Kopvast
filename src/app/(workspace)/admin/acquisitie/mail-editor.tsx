"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  previewMailAction,
  regenerateMailAction,
  saveMailAction,
  sendLiveMailAction,
  sendTestMailAction,
} from "@/app/(workspace)/admin/acquisitie/actions";
import { areaClass, fieldClass, Field } from "@/components/form-fields";
import type { EmailMode } from "@/lib/email-mode";

export function MailEditor({
  prospectId,
  mailId,
  subject: initialSubject,
  body: initialBody,
  mode,
  intended,
  testTo,
  canSend,
}: {
  prospectId: string;
  mailId: string;
  subject: string;
  body: string;
  mode: EmailMode;
  intended: string | null;
  testTo: string;
  canSend: boolean;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [html, setHtml] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        const result = await previewMailAction({ prospectId, subject, body });
        if (result.ok) setHtml(result.html);
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [prospectId, subject, body]);

  function run(
    action: (formData: FormData) => Promise<{ ok: boolean; message?: string } | { ok: true }>,
    extra?: Record<string, string>,
    success = "Opgeslagen."
  ) {
    const data = new FormData();
    data.set("prospectId", prospectId);
    data.set("mailId", mailId);
    data.set("subject", subject);
    data.set("body", body);
    for (const [key, value] of Object.entries(extra ?? {})) data.set(key, value);
    startTransition(async () => {
      const result = await action(data);
      if (result.ok) {
        router.refresh();
        setMessage(success);
      } else {
        setMessage(("message" in result && result.message) || "Er ging iets mis.");
      }
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
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

      <Field id="subject" label="Onderwerp">
        <input id="subject" className={fieldClass} value={subject} onChange={(event) => setSubject(event.target.value)} />
      </Field>
      <Field id="body" label="Mailtekst">
        <textarea id="body" className={`${areaClass} min-h-64`} value={body} onChange={(event) => setBody(event.target.value)} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(regenerateMailAction, undefined, "Nieuwe conceptmail klaar.")}
          className="h-12 rounded-md border border-ink/15 text-sm font-semibold"
        >
          Opnieuw genereren
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(saveMailAction, undefined, "Concept opgeslagen.")}
          className="h-12 rounded-md border border-ink/15 text-sm font-semibold"
        >
          Concept opslaan
        </button>
        <button
          type="button"
          disabled={pending || !canSend}
          onClick={() => run(sendTestMailAction, undefined, "Testmail verstuurd.")}
          className="h-12 rounded-md border border-ink/15 text-sm font-semibold"
        >
          Testmail sturen
        </button>
        <button
          type="button"
          disabled={pending || !canSend}
          onClick={() => run(sendLiveMailAction, undefined, mode === "LIVE" ? "Mail verstuurd." : "Mail naar testadres verstuurd.")}
          className="h-12 rounded-md bg-copper-dark text-sm font-semibold text-ivory disabled:opacity-50"
        >
          {mode === "LIVE" ? "Versturen" : "Versturen naar testadres"}
        </button>
      </div>
      {mode !== "LIVE" ? (
        <p className="text-xs text-ink/45">
          EMAIL_MODE=TEST. Versturen doorloopt de echte flow, maar Resend levert af op {testTo}.
        </p>
      ) : null}
      {message ? <p className="text-sm text-olive">{message}</p> : null}

      <div>
        <h3 className="text-sm font-semibold">Preview</h3>
        <iframe title="Preview" sandbox="" srcDoc={html} className="mt-3 h-[640px] w-full rounded-xl border border-ink/10 bg-ivory" />
      </div>
    </section>
  );
}
