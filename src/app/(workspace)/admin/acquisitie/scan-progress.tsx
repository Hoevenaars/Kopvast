"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ScanProgressStep } from "@/lib/acquisition-constants";
import { SCAN_STEPS } from "@/lib/acquisition-constants";

export function ScanProgress({ running, steps }: { running: boolean; steps: ScanProgressStep[] }) {
  const router = useRouter();

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => router.refresh(), 2500);
    return () => window.clearInterval(timer);
  }, [running, router]);

  const display = SCAN_STEPS.map((step) => steps.find((item) => item.key === step.key) ?? { ...step, status: "pending" as const });

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-5">
      <h2 className="font-semibold">Website analyseren</h2>
      <p className="mt-1 text-sm text-ink/45">{running ? "Scan draait op de achtergrond." : "Laatste scanstatus."}</p>
      <ol className="mt-5 space-y-3">
        {display.map((step) => (
          <li key={step.key} className="flex items-start gap-3 text-sm">
            <span className="mt-0.5 w-5 text-center font-semibold">
              {step.status === "done" ? "✓" : step.status === "failed" ? "!" : "·"}
            </span>
            <span className={step.status === "pending" ? "text-ink/40" : "text-ink"}>
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
