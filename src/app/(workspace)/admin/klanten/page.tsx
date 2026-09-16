import type { Metadata } from "next";
import Link from "next/link";
import { resolveReviewAction } from "@/app/(workspace)/admin/klanten/actions";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { PendingLink } from "@/components/workspace/pending-nav";
import { FormBusyOverlay, SubmitButton } from "@/components/workspace/form-busy";
import { formatNlDate } from "@/lib/acquisition-constants";
import { customerFilters, isCustomerFilter } from "@/lib/customers";
import { loadCustomerList } from "@/lib/customer-dossier";
import { workspaceRoutes } from "@/lib/product";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Klanten",
  robots: { index: false, follow: false },
};

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filter && isCustomerFilter(params.filter) ? params.filter : "alles";
  const q = params.q ?? "";
  const { items, reviews } = await loadCustomerList({ filter, q });
  const reviewGroups = groupReviews(reviews);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Klanten"
        title="Klanten"
        text="Eén dossier per organisatie. Commerciële historie blijft gekoppeld na akkoord."
      />

      {reviewGroups.length > 0 ? (
        <section className="space-y-4 rounded-2xl border border-copper/30 bg-[#F8F1EC] p-5">
          <div>
            <h2 className="font-semibold text-ink">Handmatige review</h2>
            <p className="mt-1 text-sm text-ink/55">
              Dit voorstel lijkt op een bestaande klant. We mergen niet stilzwijgend.
            </p>
          </div>
          {reviewGroups.map((group) => (
            <div key={group.proposalId} className="rounded-xl border border-ink/10 bg-white p-4">
              <p className="text-sm font-semibold">{group.title}</p>
              <p className="mt-1 text-sm text-ink/45">
                {[group.companyName, group.contactEmail].filter(Boolean).join(" · ") || "Geen extra contactgegevens"}
              </p>
              <ul className="mt-4 space-y-3">
                {group.items.map((review) => (
                  <li key={review.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm">
                      {review.candidateName}
                      <span className="text-ink/40"> · {review.reason}</span>
                    </p>
                    <form action={resolveReviewAction} className="relative">
                      <FormBusyOverlay label="Koppelen…" />
                      <input type="hidden" name="proposalId" value={review.proposal_id} />
                      <input type="hidden" name="organizationId" value={review.candidate_organization_id} />
                      <input type="hidden" name="action" value="merge" />
                      <SubmitButton className="text-sm font-semibold underline underline-offset-4">
                        Koppel aan deze klant
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
              <form action={resolveReviewAction} className="relative mt-4">
                <FormBusyOverlay label="Nieuwe klant maken…" />
                <input type="hidden" name="proposalId" value={group.proposalId} />
                <input type="hidden" name="action" value="create" />
                <SubmitButton className="text-sm font-semibold underline underline-offset-4">
                  Maak een nieuwe klant
                </SubmitButton>
              </form>
            </div>
          ))}
        </section>
      ) : null}

      <form className="flex flex-col gap-3 md:flex-row" action={workspaceRoutes.adminCustomers}>
        <input type="hidden" name="filter" value={filter} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Zoek op organisatie, contact of website"
          className="h-12 flex-1 rounded-md border border-ink/10 bg-white px-4 text-base"
        />
        <button type="submit" className="h-12 rounded-md bg-ink px-5 text-sm font-semibold text-ivory">
          Zoeken
        </button>
      </form>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {customerFilters.map((item) => {
          const href = `${workspaceRoutes.adminCustomers}?filter=${item.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
          const active = filter === item.value;
          return (
            <Link
              key={item.value}
              href={href}
              className={cn(
                "inline-flex h-11 shrink-0 items-center rounded-full px-4 text-sm font-medium",
                active ? "bg-ink text-ivory" : "border border-ink/10 bg-white text-ink/70"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Nog geen klanten"
          text="Een geaccepteerd voorstel of omgezette aanvraag landt hier als dossier, zonder duplicaten."
        />
      ) : (
        <ul className="grid gap-4">
          {items.map((item) => (
            <li key={item.organization.id}>
              <PendingLink
                href={`${workspaceRoutes.adminCustomers}/${item.organization.id}`}
                pendingLabel="Dossier openen…"
                className="block rounded-2xl border border-ink/10 bg-white p-5 transition hover:bg-[#F8F6F1]"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{item.organization.name}</h2>
                    <p className="text-sm text-ink/45">{item.contactEmail || "Geen contact"}</p>
                  </div>
                  <p className="text-xs text-ink/40">{formatNlDate(item.organization.created_at)}</p>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
                  <Meta label="Organisatie" value={item.organization.name} />
                  <Meta label="Contact" value={item.contactName || item.contactEmail || "—"} />
                  <Meta label="Website" value={hostLabel(item.website)} />
                  <Meta label="Actieve opdracht" value={item.activeOrder || "—"} />
                  <Meta label="Beheer actief" value={item.beheerActive ? "Ja" : "Nee"} />
                  <Meta label="Open actie" value={item.nextAction || "—"} />
                  <Meta label="Klant sinds" value={formatNlDate(item.organization.created_at)} />
                </dl>
              </PendingLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-ink/40 uppercase">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function hostLabel(value: string | null) {
  if (!value) return "—";
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function groupReviews(reviews: Awaited<ReturnType<typeof loadCustomerList>>["reviews"]) {
  const groups = new Map<
    string,
    {
      proposalId: string;
      title: string;
      companyName: string | null;
      contactEmail: string | null;
      items: typeof reviews;
    }
  >();
  for (const review of reviews) {
    const current = groups.get(review.proposal_id);
    if (current) {
      current.items.push(review);
      continue;
    }
    groups.set(review.proposal_id, {
      proposalId: review.proposal_id,
      title: review.proposalTitle,
      companyName: review.companyName,
      contactEmail: review.contactEmail,
      items: [review],
    });
  }
  return [...groups.values()];
}