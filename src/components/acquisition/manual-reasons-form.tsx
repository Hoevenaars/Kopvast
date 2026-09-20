"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MANUAL_MAIL_REASONS, manualReasonLabel, type ManualReasonCategory } from "@/lib/acquisition/manual-reasons";
import type { EmailMode } from "@/lib/email-mode";
import { cn } from "@/lib/utils";

type Result = { ok: boolean; message?: string };

export function ManualReasonsForm({
  action,
  hiddenFields,
  email,
  mode,
  intended,
  testTo,
  canSend,
  variant = "admin",
}: {
  action: (formData: FormData) => Promise<Result | void>;
  hiddenFields: Record<string, string>;
  email: string | null;
  mode: EmailMode;
  intended: string | null;
  testTo: string;
  canSend: boolean;
  variant?: "admin" | "scout";
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<ManualReasonCategory[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle(category: ManualReasonCategory) {
    setSelected((current) => {
      if (current.includes(category)) return current.filter((item) => item !== category);
      if (current.length >= 2) return current;
      return [...current, category];
    });
  }

  function run(intent: "send" | "draft") {
    if (pending) return;
    if (selected.length !== 2) {
      setMessage("Kies precies twee redenen.");
      return;
    }
    if (!email) {
      setMessage("Voeg eerst een e-mailadres toe.");
      return;
    }
    if (intent === "send" && !canSend) {
      setMessage("Verzenden is geblokkeerd voor dit contact.");
      return;
    }
    if (intent === "send" && mode === "LIVE") {
      const target = intended || "het prospectadres";
      if (!window.confirm(`Deze mail gaat naar ${target}. Versturen?`)) return;
    }
    setMessage(null);
    const data = new FormData();
    for (const [key, value] of Object.entries(hiddenFields)) data.set(key, value);
    for (const reason of selected) data.append("reason", reason);
    data.set("intent", intent);
    start(async () => {
      const result = await action(data);
      if (!result) {
        router.refresh();
        return;
      }
      if (result.ok) {
        router.refresh();
        setMessage(intent === "send" ? "Mail is gemaakt en verstuurd." : "Conceptmail staat klaar.");
      } else {
        setMessage(result.message || "Er ging iets mis.");
      }
    });
  }

  const scout = variant === "scout";
  const ready = selected.length === 2 && Boolean(email);

  return (
    <section
      className={
        scout
          ? "space-y-4"
          : "space-y-4 rounded-2xl border border-ink/10 bg-white p-5"
      }
    >
      <div>
        <h2 className={scout ? "text-xs tracking-[0.18em] text-olive uppercase" : "font-semibold"}>
          Site wel bekeken?
        </h2>
        <p className={scout ? "mt-2 text-sm leading-6 text-olive" : "mt-1 text-sm leading-6 text-ink/70"}>
          De scan lukte niet, maar als je de website zelf hebt gezien: klik twee redenen. Daarna maken we de
          gewone acquisitiemail en versturen we die.
        </p>
      </div>

      <div className={scout ? "grid gap-2" : "grid gap-2 sm:grid-cols-2"}>
        {MANUAL_MAIL_REASONS.map((reason) => {
          const active = selected.includes(reason.category);
          const locked = !active && selected.length >= 2;
          return (
            <button
              key={reason.category}
              type="button"
              disabled={pending || locked}
              aria-pressed={active}
              onClick={() => toggle(reason.category)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left transition",
                active
                  ? "border-copper-dark bg-[#FBF6F2]"
                  : "border-ink/10 bg-white",
                locked && "opacity-50",
                pending && "cursor-wait"
              )}
            >
              <span className="block text-sm font-semibold text-ink">{manualReasonLabel(reason.category)}</span>
              <span className="mt-1 block text-sm leading-6 text-ink/65">{reason.title}</span>
            </button>
          );
        })}
      </div>

      {!email ? (
        <p className="text-sm text-destructive">Voeg eerst een e-mailadres toe.</p>
      ) : mode === "TEST" ? (
        <p className={scout ? "text-xs text-olive" : "text-xs text-ink/45"}>
          TEST MODE. Versturen doorloopt de echte flow, maar Resend levert af op {testTo}.
        </p>
      ) : (
        <p className={scout ? "text-xs text-olive" : "text-xs text-ink/45"}>
          LIVE MODE. Versturen gaat naar {intended || "het prospectadres"}.
        </p>
      )}

      <div className={scout ? "flex flex-col gap-2" : "grid gap-3 sm:grid-cols-2"}>
        <button
          type="button"
          disabled={pending || !ready || !canSend}
          onClick={() => run("send")}
          className={
            scout
              ? "h-12 rounded-2xl bg-copper-dark text-sm text-ivory disabled:cursor-wait disabled:opacity-50"
              : "h-12 cursor-pointer rounded-md bg-copper-dark text-sm font-semibold text-ivory disabled:cursor-wait disabled:opacity-50"
          }
        >
          {pending ? "Bezig…" : "Mail maken en versturen"}
        </button>
        <button
          type="button"
          disabled={pending || !ready}
          onClick={() => run("draft")}
          className={
            scout
              ? "h-12 rounded-2xl border border-ink/15 bg-white text-sm disabled:cursor-wait disabled:opacity-50"
              : "h-12 cursor-pointer rounded-md border border-ink/15 text-sm font-semibold disabled:cursor-wait disabled:opacity-50"
          }
        >
          Alleen concept maken
        </button>
      </div>
      {selected.length > 0 && selected.length < 2 ? (
        <p className={scout ? "text-sm text-olive" : "text-sm text-ink/55"}>Nog één reden kiezen.</p>
      ) : null}
      {message ? <p className={scout ? "text-sm text-ink" : "text-sm text-olive"}>{message}</p> : null}
    </section>
  );
}
