import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/workspace/page-frame";
import { DataList, EmptyState } from "@/components/workspace/shell";
import { loadOnboardingOverview } from "@/lib/onboarding-store";
import { workspaceRoutes } from "@/lib/product";

export const metadata: Metadata = {
  title: "Onboarding",
  robots: { index: false, follow: false },
};

export default async function AdminOnboardingPage() {
  const rows = await loadOnboardingOverview();

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Onboarding"
        title="Onboarding"
        text="Na akkoord verzamelen we hier bedrijfsgegevens, merk, content en techniek per opdracht."
      />
      {rows.length === 0 ? (
        <EmptyState
          title="Nog geen onboarding"
          text="Zet een gewonnen aanvraag om naar een klant. Website- en maatwerkopdrachten krijgen dan een checklist."
        />
      ) : (
        <DataList
          items={rows.map((row) => ({
            href: `${workspaceRoutes.adminOrders}/${row.project.id}/onboarding`,
            title: `${row.organization.name} · ${row.project.title}`,
            meta: `${row.progress.summary}${row.onboarding.override_reason ? " · override" : ""}`,
            extra: row.progress.ready ? "Klaar" : row.progress.missing[0] ? `! ${row.progress.missing[0].title}` : "Open",
          }))}
        />
      )}
      <p className="text-sm text-ink/45">
        Ontbreekt er iets? Open de opdracht. De klant vult hetzelfde in via{" "}
        <Link href={workspaceRoutes.consoleOnboarding} className="underline underline-offset-4">
          Mijn Kopvast
        </Link>
        .
      </p>
    </div>
  );
}
