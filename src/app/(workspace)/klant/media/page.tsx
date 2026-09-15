import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { requireSession } from "@/lib/auth";
import { assetKinds, labelFor, workspaceRoutes } from "@/lib/product";
import { loadCustomerWorkspace } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Media",
  robots: { index: false, follow: false },
};

export default async function CustomerMediaPage() {
  const session = await requireSession("customer");
  if (!session?.organizationId) redirect(workspaceRoutes.login);
  const workspace = await loadCustomerWorkspace(session.organizationId);
  if (!workspace) redirect(workspaceRoutes.login);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Media"
        title="Bestanden en beeld"
        text="Logo, huisstijl en andere middelen die bij je website horen."
      />
      {workspace.assets.length === 0 ? (
        <EmptyState title="Nog geen bestanden" text="Zodra er een logo, huisstijl of andere middelen zijn, komen ze hier." />
      ) : (
        <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
          {workspace.assets.map((asset) => (
            <li key={asset.id} className="px-5 py-4">
              <p className="text-sm font-medium">{asset.name}</p>
              <p className="mt-1 text-sm text-olive">{labelFor(assetKinds, asset.kind)}</p>
              {asset.note ? <p className="mt-1 text-sm text-ink/45">{asset.note}</p> : null}
              {asset.url ? (
                <a href={asset.url} className="mt-2 inline-block text-sm underline underline-offset-4" target="_blank" rel="noreferrer">
                  Open bestand
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
