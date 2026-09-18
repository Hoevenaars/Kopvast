"use client";

import { useState } from "react";

export function LeadDraftTools({ subject, message }: { subject: string; message: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText([subject, "", message].filter(Boolean).join("\n"));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="h-12 rounded-2xl border border-ink/15 bg-white text-sm"
    >
      {copied ? "Gekopieerd" : "Kopiëren"}
    </button>
  );
}
