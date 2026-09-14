import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { consoleNav, EmptyState, WorkspaceShell } from "@/components/workspace/shell";
import { requireSession } from "@/lib/auth";
import { assetKinds, labelFor, workspaceRoutes } from "@/lib/product";
import { loadCustomerWorkspace } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Bestanden",
  robots: { index: false, follow: false },
};

export default async function ConsoleFilesPage() {
  const session = await requireSession("customer");
  if (!session?.organizationId) redirect(workspaceRoutes.login);
  const workspace = await loadCustomerWorkspace(session.organizationId);
  if (!workspace) redirect(workspaceRoutes.login);

  return (
    <WorkspaceShell
      eyebrow="Klantconsole"
      title="Bestanden en merkassets"
      email={session.email}
      nav={consoleNav("bestanden")}
    >
      <p className="max-w-2xl text-sm leading-6 text-olive">
        Logo, huisstijl en andere middelen die bij je website horen. Kopvast plaatst ze hier zodra ze
        klaar zijn.
      </p>
      {workspace.assets.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Nog geen bestanden"
            text="Zodra er een logo, huisstijl of andere middelen zijn, komen ze hier te staan."
          />
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-stone/40 rounded-2xl border border-stone/50">
          {workspace.assets.map((asset) => (
            <li key={asset.id} className="px-5 py-4">
              <p className="text-sm font-medium text-ink">{asset.name}</p>
              <p className="mt-1 text-sm text-olive">{labelFor(assetKinds, asset.kind)}</p>
              {asset.note ? <p className="mt-1 text-sm text-olive">{asset.note}</p> : null}
              {asset.url ? (
                <a href={asset.url} className="mt-2 inline-block text-sm underline underline-offset-4" target="_blank" rel="noreferrer">
                  Open bestand
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </WorkspaceShell>
  );
}
