import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/workspace/page-frame";
import { loadAutomationOverview } from "@/lib/automations";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Automations", robots: { index: false, follow: false } };

export default async function AdminAutomationsPage() {
  const overview = await loadAutomationOverview();
  const attention = overview.lanes.reduce((sum, lane) => sum + lane.count, 0);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Automations"
        title="Automations"
        text="Geen tweede motor. Dit is alleen zicht op scan, analyse, mailqueue en opvolging die al bestaan."
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Uitzonderingen" value={String(attention)} warning={attention > 0} />
        <Metric label="Website Refresh" value={overview.configured ? "Gekoppeld" : "Lokaal"} warning={!overview.configured} />
        <Metric label="OpenAI" value={overview.openaiConfigured ? "Beschikbaar" : "Handmatig"} warning={!overview.openaiConfigured} />
      </section>

      {!overview.configured ? (
        <p className="rounded-2xl border border-ink/10 bg-white px-5 py-6 text-sm text-ink/55">
          Zonder Website Refresh is er geen live queue. Scans, mails en aanvraagacties verschijnen hier zodra de service role staat.
        </p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {overview.lanes.map((lane) => (
            <section key={lane.key} className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
              <div className="flex items-start justify-between gap-4 border-b border-ink/8 px-5 py-4">
                <div>
                  <h2 className="font-semibold">{lane.label}</h2>
                  <p className="mt-1 text-sm text-ink/45">{lane.description}</p>
                </div>
                <Link href={lane.href} className="text-sm font-medium underline underline-offset-4">
                  Open
                </Link>
              </div>
              {lane.items.length === 0 ? (
                <p className="px-5 py-5 text-sm text-ink/45">Niets in deze queue.</p>
              ) : (
                <ul className="divide-y divide-ink/6">
                  {lane.items.map((item) => (
                    <li key={item.id}>
                      <Link href={item.href} className="flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-[#F8F6F1]">
                        <div>
                          <p className="text-sm font-semibold">{item.title}</p>
                          <p className="mt-1 text-xs text-ink/45">{item.detail}</p>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            lane.status === "attention" ? "bg-[#F3E4DD] text-copper-dark" : "bg-[#EDF0E9] text-olive"
                          )}
                        >
                          {item.status}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5">
      <div className="text-sm text-ink/45">{label}</div>
      <div className={cn("mt-4 text-2xl font-semibold tracking-tight", warning ? "text-copper-dark" : "text-ink")}>
        {value}
      </div>
    </div>
  );
}
