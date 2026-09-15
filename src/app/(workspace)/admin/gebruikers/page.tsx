import type { Metadata } from "next";
import Link from "next/link";
import { AccessToggle } from "@/components/workspace/access-toggle";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { workspaceRoutes } from "@/lib/product";
import { loadMembers, loadOrganizations } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Gebruikers",
  robots: { index: false, follow: false },
};

export default async function AdminUsersPage() {
  const [members, organizations] = await Promise.all([loadMembers(), loadOrganizations()]);
  const orgName = new Map(organizations.map((org) => [org.id, org.name]));

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Gebruikers"
        title="Gebruikers"
        text="Zet toegang tot Mijn Kopvast aan of uit. Uit betekent: deze persoon kan niet inloggen."
      />
      {members.length === 0 ? (
        <EmptyState title="Nog geen gebruikers" text="Zet een aanvraag om naar een klant. Daarna verschijnt hier de gebruiker." />
      ) : (
        <ul className="divide-y divide-ink/10 overflow-hidden rounded-2xl border border-ink/10 bg-white">
          {members.map((member) => (
            <li key={member.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">{member.name}</p>
                <p className="mt-1 text-sm text-ink/45">{member.email}</p>
                {orgName.get(member.organization_id) ? (
                  <Link
                    href={`${workspaceRoutes.adminCustomers}/${member.organization_id}`}
                    className="mt-1 inline-block text-xs text-olive underline-offset-4 hover:underline"
                  >
                    {orgName.get(member.organization_id)}
                  </Link>
                ) : null}
              </div>
              <AccessToggle
                memberId={member.id}
                organizationId={member.organization_id}
                enabled={member.access_enabled}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
