import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { requireSession } from "@/lib/auth";
import { loadCustomerBrand } from "@/lib/customer-brand";
import { workspaceRoutes } from "@/lib/product";

export const metadata: Metadata = { title: "Mijn merk", robots: { index: false, follow: false } };

export default async function CustomerBrandPage() {
  const session = await requireSession("customer");
  if (!session?.organizationId) redirect(workspaceRoutes.login);
  const brand = await loadCustomerBrand(session.organizationId);
  if (!brand) redirect(workspaceRoutes.login);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Mijn merk"
        title={brand.name}
        text="Logo's, kleuren, typografie en toon die je in onboarding hebt aangeleverd. Kopvast beheert de merkstructuur; jij ziet en gebruikt de bestanden."
        action={
          <Link
            href={workspaceRoutes.consoleOnboarding}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 py-3 text-sm font-semibold text-ivory"
          >
            Aanpassen in onboarding
          </Link>
        }
      />
      {!brand.hasContent ? (
        <EmptyState
          title="Nog geen merkmateriaal"
          text="Lever logo, kleuren en toon aan in onboarding. Daarna staan ze hier, en bij Media."
        />
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-ink/10 bg-white p-5">
            {brand.tagline ? <p className="text-sm text-ink/55">{brand.tagline}</p> : null}
            <dl className="grid gap-4 sm:grid-cols-2">
              <ColorRow label="Primaire kleur" color={brand.primaryColor} />
              <ColorRow label="Secundaire kleur" color={brand.secondaryColor} />
              <Row label="Kleuren" value={brand.colorsText} />
              <Row label="Typografie" value={brand.typography} />
              <Row label="Toon" value={brand.tone} />
            </dl>
            {brand.notes ? <p className="mt-4 text-sm leading-6 text-ink/60">{brand.notes}</p> : null}
          </section>
          {brand.files.length ? (
            <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
              {brand.files.map((file) => (
                <li key={file.id} className="px-5 py-4 text-sm">
                  <p className="font-medium">{file.name}</p>
                  <p className="mt-1 text-ink/45">{file.kind === "logo" ? "Logo" : file.kind === "huisstijl" ? "Huisstijl" : file.kind}</p>
                  <a href={file.href} className="mt-2 inline-block underline underline-offset-4" target="_blank" rel="noreferrer">
                    Open bestand
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ColorRow({ label, color }: { label: string; color: string | null }) {
  if (!color) return <Row label={label} value={null} />;
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:items-center">
      <dt className="text-ink/45">{label}</dt>
      <dd className="flex items-center gap-2 text-sm font-medium">
        <span className="size-6 rounded-md border border-ink/10" style={{ backgroundColor: color }} />
        {color}
      </dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_1fr]">
      <dt className="text-ink/45">{label}</dt>
      <dd className="whitespace-pre-wrap text-sm">{value}</dd>
    </div>
  );
}
