import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { listAcquisitionProspects } from "@/lib/acquisition";
import {
  acquisitionFilters,
  acquisitionSorts,
  formatNlDate,
  isAcquisitionFilter,
  isAcquisitionSort,
  labelForFit,
  labelForMail,
  labelForResponse,
  labelForStatus,
} from "@/lib/acquisition-constants";
import { resolveEmailSettings } from "@/lib/email-mode";
import { workspaceRoutes } from "@/lib/product";
import { cn } from "@/lib/utils";
import { EmailModeBanner } from "./email-mode-banner";
import { PendingLink } from "@/components/workspace/pending-nav";

export const metadata: Metadata = { title: "Acquisitie", robots: { index: false, follow: false } };

export default async function AcquisitionOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filter && isAcquisitionFilter(params.filter) ? params.filter : "alles";
  const sort = params.sort && isAcquisitionSort(params.sort) ? params.sort : "activiteit";
  const q = params.q ?? "";
  const { items, configured, error } = await listAcquisitionProspects({ filter, q, sort });
  const settings = await resolveEmailSettings();
  const mode = settings.mode;

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Acquisitie"
        title="Acquisitie"
        text="Vind commerciële kansen, scan websites en benader interessante bedrijven vanuit één plek."
        action={
          <Link
            href={workspaceRoutes.adminAcquisitionNew}
            className="inline-flex h-12 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-ivory"
          >
            + Nieuwe prospect
          </Link>
        }
      />
      <EmailModeBanner mode={mode} testTo={settings.testEmail} />

      {!configured ? (
        <EmptyState
          title="Website Refresh is niet gekoppeld"
          text="Zet WEBSITE_REFRESH_SUPABASE_URL en WEBSITE_REFRESH_SERVICE_ROLE_KEY om prospects te scannen en te mailen."
        />
      ) : (
        <>
          <form className="flex flex-col gap-3 md:flex-row" action={workspaceRoutes.adminAcquisition}>
            <input type="hidden" name="filter" value={filter} />
            <input
              name="q"
              defaultValue={q}
              placeholder="Zoek op bedrijf, domein of e-mail"
              className="h-12 flex-1 rounded-md border border-ink/10 bg-white px-4 text-base"
            />
            <select name="sort" defaultValue={sort} className="h-12 rounded-md border border-ink/10 bg-white px-3 text-sm">
              {acquisitionSorts.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button type="submit" className="h-12 rounded-md bg-ink px-5 text-sm font-semibold text-ivory">
              Zoeken
            </button>
          </form>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {acquisitionFilters.map((item) => {
              const href = `${workspaceRoutes.adminAcquisition}?filter=${item.value}&sort=${sort}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
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

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {items.length === 0 ? (
            <EmptyState
              title="Tijd voor acquisitie"
              text="De testomgeving is leeg. Plak een website en een e-mailadres. Kopvast scant en maakt de mail klaar."
            />
          ) : (
            <ul className="grid gap-4">
              {items.map((item) => (
                <li key={item.id}>
                  <PendingLink
                    href={`${workspaceRoutes.adminAcquisition}/${item.id}`}
                    pendingLabel="Prospect openen…"
                    className="block rounded-2xl border border-ink/10 bg-white p-5 transition hover:bg-[#F8F6F1]"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold">{item.company_name || item.domain}</h2>
                        <p className="text-sm text-ink/45">{item.domain}</p>
                        <p className="mt-1 text-sm text-ink/55">{item.email || "Geen e-mail"}</p>
                      </div>
                      <p className="text-xs text-ink/40">{formatNlDate(item.last_activity_at || item.created_at)}</p>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
                      <Meta label="Score" value={item.opportunity_score == null ? "—" : `${Math.round(item.opportunity_score)} / 100`} />
                      <Meta label="Fit" value={labelForFit(item.product_fit)} />
                      <Meta label="Status" value={labelForStatus(item.status)} />
                      <Meta label="Mail" value={labelForMail(item.mail_status)} />
                      <Meta label="Response" value={labelForResponse(item.response_status)} />
                      <Meta label="Laatste activiteit" value={formatNlDate(item.last_activity_at)} />
                    </dl>
                  </PendingLink>
                </li>
              ))}
            </ul>
          )}
        </>
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
