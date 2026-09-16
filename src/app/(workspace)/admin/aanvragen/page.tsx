import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { PendingLink } from "@/components/workspace/pending-nav";
import { listAanvragen, organizationLabel, websiteLabel } from "@/lib/aanvragen";
import {
  aanvraagFilters,
  isAanvraagFilter,
  requestBron,
} from "@/lib/aanvragen-model";
import { formatNlDate, labelForFit } from "@/lib/acquisition-constants";
import { labelFor, leadStatuses, workspaceRoutes } from "@/lib/product";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Aanvragen", robots: { index: false, follow: false } };

export default async function AdminAanvragenPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filter && isAanvraagFilter(params.filter) ? params.filter : "alles";
  const q = params.q ?? "";
  const { items } = await listAanvragen({ filter, q });

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Aanvragen"
        title="Aanvragen"
        text="Alle inbound aanvragen op één plek: kwalificeren, nagesprek vastleggen en een voorstel maken."
        action={
          <Link
            href={workspaceRoutes.adminAanvragenNew}
            className="inline-flex h-12 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-ivory"
          >
            + Handmatige aanvraag
          </Link>
        }
      />

      <form className="flex flex-col gap-3 md:flex-row" action={workspaceRoutes.adminAanvragen}>
        <input type="hidden" name="filter" value={filter} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Zoek op organisatie, naam, mail of domein"
          className="h-12 flex-1 rounded-md border border-ink/10 bg-white px-4 text-base"
        />
        <button type="submit" className="h-12 rounded-md bg-ink px-5 text-sm font-semibold text-ivory">
          Zoeken
        </button>
      </form>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {aanvraagFilters.map((item) => {
          const href = `${workspaceRoutes.adminAanvragen}?filter=${item.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
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
          title="Geen aanvragen"
          text="Nieuwe website- of maatwerkaanvragen komen hier binnen. Een formulierinzending mag hier nooit onvindbaar blijven."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
          <div className="hidden grid-cols-[1.2fr_1fr_0.9fr_0.9fr_0.8fr_0.8fr_1fr_0.7fr] gap-3 border-b border-ink/8 px-5 py-3 text-[11px] tracking-wide text-ink/40 uppercase lg:grid">
            <span>Organisatie</span>
            <span>Contact</span>
            <span>Website</span>
            <span>Bron</span>
            <span>Product fit</span>
            <span>Status</span>
            <span>Volgende actie</span>
            <span>Datum</span>
          </div>
          <ul className="divide-y divide-ink/6">
            {items.map((item) => (
              <li key={item.id}>
                <PendingLink
                  href={`${workspaceRoutes.adminAanvragen}/${item.id}`}
                  pendingLabel="Aanvraag openen…"
                  className="block px-5 py-4 transition hover:bg-[#F8F6F1]"
                >
                  <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_0.9fr_0.9fr_0.8fr_0.8fr_1fr_0.7fr] lg:items-center">
                    <div>
                      <p className="font-semibold">{organizationLabel(item)}</p>
                      <p className="mt-0.5 text-sm text-ink/45 lg:hidden">{item.name} · {item.email}</p>
                    </div>
                    <p className="hidden text-sm text-ink/70 lg:block">
                      {item.name}
                      <span className="mt-0.5 block text-ink/45">{item.email}</span>
                    </p>
                    <p className="text-sm text-ink/70">{websiteLabel(item)}</p>
                    <p className="text-sm text-ink/70">{requestBron(item)}</p>
                    <p className="text-sm font-medium">{labelForFit(item.product_fit)}</p>
                    <p className="text-sm font-medium">{labelFor(leadStatuses, item.status)}</p>
                    <p className="text-sm text-ink/70">{item.next_action || "—"}</p>
                    <p className="text-sm text-ink/45">{formatNlDate(item.created_at)}</p>
                  </div>
                </PendingLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
