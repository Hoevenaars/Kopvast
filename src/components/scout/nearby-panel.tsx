"use client";

import { useState } from "react";

export function NearbyPanel() {
  const [status, setStatus] = useState<"idle" | "denied" | "ok">("idle");
  const [label, setLabel] = useState<string | null>(null);

  async function ask() {
    if (!navigator.geolocation) {
      setStatus("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus("ok");
        setLabel(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={ask} className="h-14 w-full rounded-2xl bg-ink text-sm tracking-[0.14em] text-ivory uppercase">
        Deel locatie
      </button>
      {status === "denied" ? (
        <p className="text-sm text-olive">Geen locatie. Scout werkt verder gewoon met een website-URL.</p>
      ) : null}
      {status === "ok" ? (
        <div className="rounded-3xl border border-ink/10 bg-white p-5">
          <p className="text-xs tracking-[0.16em] text-olive uppercase">Locatie bekend</p>
          <p className="mt-2 text-ink">{label}</p>
          <p className="mt-3 text-sm leading-6 text-olive">
            Bedrijven hier in de buurt volgt. Niets wordt automatisch toegevoegd; jij blijft de push doen.
          </p>
        </div>
      ) : null}
    </div>
  );
}
