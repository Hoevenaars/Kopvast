"use client";

import { useState } from "react";

function looksLikeWebsite(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 500) return null;
  if (/\s/.test(trimmed) && !/^https?:\/\//i.test(trimmed)) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:/i.test(trimmed)) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function ClipboardBanner({ onUse }: { onUse: (url: string) => void }) {
  const [found, setFound] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  async function readClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setFound(looksLikeWebsite(text));
    } catch {
      setFound(null);
    }
  }

  if (hidden) return null;

  if (!found) {
    return (
      <button
        type="button"
        onClick={readClipboard}
        className="text-left text-sm text-olive underline-offset-4 hover:underline"
      >
        Website vanaf klembord overnemen
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
      <p className="text-xs tracking-[0.16em] text-olive uppercase">Website gevonden</p>
      <p className="mt-1 break-all text-sm text-ink">{found}</p>
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={() => {
            onUse(found);
            setHidden(true);
          }}
          className="text-sm font-medium text-copper-dark"
        >
          Gebruik deze website
        </button>
        <button type="button" onClick={() => setHidden(true)} className="text-sm text-olive">
          Negeren
        </button>
      </div>
    </div>
  );
}
