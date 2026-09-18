"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cameraInterpretAction } from "@/app/(scout)/scout/actions";

export function CameraCapture({ base }: { base: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<{ companyName: string | null; website: string | null; text: string } | null>(
    null
  );

  return (
    <div className="space-y-5">
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setMessage(null);
          const data = new FormData(event.currentTarget);
          const result = await cameraInterpretAction(data);
          setBusy(false);
          if (!result.ok) {
            setMessage(result.message);
            return;
          }
          setSuggestion(result.suggestion);
        }}
        className="space-y-4"
      >
        <label className="block">
          <span className="text-xs tracking-[0.18em] text-olive uppercase">Foto</span>
          <input
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            capture="environment"
            required
            className="mt-2 block w-full text-sm"
          />
        </label>
        <button
          disabled={busy}
          className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-ink text-sm tracking-[0.14em] text-ivory uppercase disabled:opacity-60"
        >
          {busy ? "Lezen…" : "Maak foto"}
        </button>
      </form>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      {suggestion ? (
        <div className="rounded-3xl border border-ink/10 bg-white p-5">
          <p className="text-xs tracking-[0.16em] text-olive uppercase">Voorstel — bevestig eerst</p>
          <p className="mt-2 text-lg text-ink">{suggestion.companyName || "Onbekend bedrijf"}</p>
          <p className="mt-1 break-all text-sm text-olive">{suggestion.website || "Geen website herkend"}</p>
          <p className="mt-3 text-sm leading-6 text-olive">{suggestion.text}</p>
          {suggestion.website ? (
            <button
              type="button"
              onClick={() =>
                router.push(`${base}/?url=${encodeURIComponent(suggestion.website || "")}&source=camera`)
              }
              className="mt-4 h-12 w-full rounded-2xl bg-copper-dark text-sm text-ivory"
            >
              Bevestig en ga naar Scout
            </button>
          ) : (
            <p className="mt-4 text-sm text-olive">Vul zelf de website in op Scout. Niets is automatisch toegevoegd.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
