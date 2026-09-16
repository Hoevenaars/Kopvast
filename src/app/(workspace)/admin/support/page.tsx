import type { Metadata } from "next";
import Link from "next/link";
import { saveSupport } from "@/app/(workspace)/admin/support/actions";
import { fieldClass } from "@/components/form-fields";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import {
  labelFor,
  requestClassifications,
  requestStatuses,
  requestTypes,
  workspaceRoutes,
} from "@/lib/product";
import { formatDateNl, isOpenRequest } from "@/lib/sites";
import { loadSupportInbox } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Support",
  robots: { index: false, follow: false },
};

export default async function AdminSupportPage() {
  const inbox = await loadSupportInbox();
  const open = inbox.filter((item) => isOpenRequest(item.status));
  const closed = inbox.filter((item) => !isOpenRequest(item.status));

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Support"
        title="Support"
        text="Vragen en wijzigingen na livegang. Markeer inbegrepen werk, extra maatwerk of een extra offerte."
      />
      {inbox.length === 0 ? (
        <EmptyState title="Geen support" text="Klanten sturen verzoeken vanuit Mijn Kopvast." />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-xl text-ink">Open ({open.length})</h2>
            {open.length === 0 ? (
              <EmptyState title="Niets open" text="Nieuwe verzoeken komen hier bovenaan." />
            ) : (
              <ul className="space-y-3">
                {open.map((item) => (
                  <SupportCard key={item.id} item={item} />
                ))}
              </ul>
            )}
          </section>
          {closed.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-xl text-ink">Afgehandeld</h2>
              <ul className="space-y-3">
                {closed.map((item) => (
                  <SupportCard key={item.id} item={item} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function SupportCard({
  item,
}: {
  item: Awaited<ReturnType<typeof loadSupportInbox>>[number];
}) {
  return (
    <li className="rounded-2xl border border-ink/10 bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs text-olive">
            {labelFor(requestTypes, item.type)}
            {item.domain ? ` · ${item.domain}` : ""}
          </p>
          <h3 className="mt-1 text-base font-semibold">{item.title}</h3>
          <p className="mt-1 text-sm text-ink/45">
            {item.customerName}
            {item.createdByEmail ? ` · ${item.createdByEmail}` : ""} · {formatDateNl(item.createdAt)}
          </p>
          <p className="mt-3 text-sm leading-6 text-ink/60">{item.body}</p>
          {item.fileName ? (
            <p className="mt-2 text-xs text-ink/45">
              Bijlage:{" "}
              {item.fileUrl ? (
                <a href={item.fileUrl} className="underline underline-offset-4" target="_blank" rel="noreferrer">
                  {item.fileName}
                </a>
              ) : (
                item.fileName
              )}
            </p>
          ) : null}
        </div>
        <StatusBadge label={labelFor(requestStatuses, item.status)} tone={toneForStatus(item.status)} />
      </div>
      <form action={saveSupport} className="mt-4 grid gap-3 md:grid-cols-[14rem_1fr_auto] md:items-center">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="organizationId" value={item.organizationId} />
        <select name="status" defaultValue={item.status} className={fieldClass}>
          {requestStatuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
        <select name="classification" defaultValue={item.classification ?? ""} className={fieldClass}>
          <option value="">Indeling</option>
          {requestClassifications.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>
        <button type="submit" className="text-sm underline underline-offset-4">
          Update
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <Link href={`${workspaceRoutes.adminCustomers}/${item.organizationId}`} className="underline underline-offset-4">
          Klant
        </Link>
        {item.projectId ? (
          <Link href={`${workspaceRoutes.adminWebsites}/${item.projectId}`} className="underline underline-offset-4">
            Website
          </Link>
        ) : null}
      </div>
    </li>
  );
}
