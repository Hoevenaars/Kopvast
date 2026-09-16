import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { formatMissingLine, formatReceivedLine, type OnboardingProgress } from "@/lib/onboarding";

export function OnboardingProgressCard({
  progress,
  readyLabel = "Klaar voor productie",
}: {
  progress: OnboardingProgress;
  readyLabel?: string;
}) {
  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-ink/35 uppercase">Voortgang</p>
          <h2 className="mt-2 text-lg font-semibold">{progress.summary}</h2>
        </div>
        <StatusBadge
          label={progress.ready ? readyLabel : "Nog niet compleet"}
          tone={progress.ready ? "ink" : "copper"}
        />
      </div>
      <ul className="mt-4 space-y-1.5 text-sm">
        {progress.received.slice(0, 6).map((item) => (
          <li key={item.id} className="text-olive">
            {formatReceivedLine(item.title)}
          </li>
        ))}
        {progress.missing.slice(0, 6).map((item) => (
          <li key={item.id} className="text-copper-dark">
            {formatMissingLine(item.title)}
          </li>
        ))}
      </ul>
      {progress.missing.length === 0 && progress.ready ? (
        <p className="mt-4 text-sm text-ink/50">Alle verplichte onderdelen staan er. We kunnen verder.</p>
      ) : null}
    </section>
  );
}

export function OnboardingStatusLabel({ status }: { status: string }) {
  return <StatusBadge label={status} tone={toneForStatus(status)} />;
}
