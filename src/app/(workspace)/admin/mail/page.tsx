import type { Metadata } from "next";
import { adminNav, EmptyState, WorkspaceShell } from "@/components/workspace/shell";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import { requireSession } from "@/lib/auth";
import { loadMail } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Mail",
  robots: { index: false, follow: false },
};

export default async function AdminMailPage() {
  const session = await requireSession("admin");
  const mail = await loadMail();

  return (
    <WorkspaceShell eyebrow="Adminconsole" title="Mail" email={session?.email ?? ""} nav={adminNav("mail")}>
      {mail.length === 0 ? (
        <EmptyState title="Nog geen mail" text="Bevestigingen en interne meldingen verschijnen hier." />
      ) : (
        <ul className="divide-y divide-stone/40 rounded-2xl border border-stone/50">
          {mail.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-ink">{item.subject || item.kind}</p>
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
    </WorkspaceShell>
  );
}
