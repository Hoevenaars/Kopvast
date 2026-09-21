import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { requireSession } from "@/lib/auth";
import { loadCustomerPages } from "@/lib/customer-brand";
import { workspaceRoutes } from "@/lib/product";

export const metadata: Metadata = { title: "Pagina's", robots: { index: false, follow: false } };

export default async function CustomerPagesPage() {
  const session = await requireSession("customer");
  if (!session?.organizationId) redirect(workspaceRoutes.login);
  const pages = await loadCustomerPages(session.organizationId);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Pagina's"
        title="Pagina's"
        text="Geen vrije pagebuilder. De onderdelen staan vast: jij levert de inhoud in onboarding en vraagt tekstwijzigingen aan via wijzigingen."
        action={
          <Link
            href={workspaceRoutes.consoleRequests}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 py-3 text-sm font-semibold text-ivory"
          >
            Tekst wijzigen
          </Link>
        }
      />
      {pages.outline ? (
        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="font-semibold">Afgesproken pagina's</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink/70">{pages.outline}</p>
          <Link href={workspaceRoutes.consoleOnboarding} className="mt-4 inline-block text-sm underline underline-offset-4">
            Aanpassen in onboarding
          </Link>
        </section>
      ) : (
        <EmptyState
          title="Nog geen pagina-overzicht"
          text="Zet in onboarding welke pagina's de site moet hebben. Tekst op de live site wijzig je via een verzoek."
        />
      )}
    </div>
  );
}
