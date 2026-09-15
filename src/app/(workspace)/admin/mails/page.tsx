import type { Metadata } from "next";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { loadMail } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Mails",
  robots: { index: false, follow: false },
};

export default async function AdminMailPage() {
  const mail = await loadMail();

  return (
    <div className="space-y-8">
      <PageIntro eyebrow="Mails" title="Mail" text="Bevestigingen, interne meldingen en later outreach via Resend." />
      {mail.length === 0 ? (
        <EmptyState title="Nog geen mail" text="Bevestigingen en interne meldingen verschijnen hier." />
      ) : (
        <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
          {mail.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">{item.subject || item.kind}</p>
                <p className="text-sm text-olive">
                  {item.to_email} · {new Date(item.created_at).toLocaleString("nl-NL")}
                </p>
                {item.last_error ? <p className="mt-1 text-xs text-destructive">{item.last_error}</p> : null}
              </div>
              <StatusBadge label={item.status} tone={toneForStatus(item.status)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
