import Link from "next/link";
import { redirect } from "next/navigation";
import { readScoutUser } from "@/lib/scout/auth";
import { scoutPublicBase, withBase } from "@/lib/scout/base-path";
import { listLeads } from "@/lib/scout/leads";
import { SCOUT_STATUSES, SCOUT_STATUS_LABELS, isScoutStatus } from "@/lib/scout/types";

export default async function ScoutLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; score?: string }>;
}) {
  const user = await readScoutUser();
  const base = await scoutPublicBase();
  if (!user) redirect(withBase(base, "/login"));
  const params = await searchParams;
  const status = params.status && isScoutStatus(params.status) ? params.status : undefined;
  const minScore = params.score ? Number(params.score) : undefined;
  const leads = await listLeads(user.id, {
    status,
    minScore: Number.isFinite(minScore) ? minScore : undefined,
  });

  return (
    <main>
      <header className="mb-6">
        <p className="text-[11px] tracking-[0.28em] text-olive uppercase">Pipeline</p>
        <h1 className="font-heading mt-3 text-4xl text-ink">Leads</h1>
      </header>
      <form className="mb-6 flex gap-2">
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-11 flex-1 rounded-2xl border border-ink/10 bg-white px-3 text-sm"
        >
          <option value="">Alle statussen</option>
          {SCOUT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {SCOUT_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        <select name="score" defaultValue={params.score ?? ""} className="h-11 rounded-2xl border border-ink/10 bg-white px-3 text-sm">
          <option value="">Score</option>
          <option value="70">70+</option>
          <option value="80">80+</option>
          <option value="90">90+</option>
        </select>
        <button className="h-11 rounded-2xl bg-ink px-4 text-sm text-ivory">Filter</button>
      </form>
      <ul className="space-y-2">
        {leads.map((lead) => (
          <li key={lead.id}>
            <Link
              href={`${base}/leads/${lead.id}`}
              className="flex items-center justify-between rounded-2xl border border-ink/10 bg-white px-4 py-4"
            >
              <span>
                <span className="block text-base text-ink">{lead.company_name || lead.domain}</span>
                <span className="mt-1 block text-xs tracking-[0.12em] text-olive uppercase">
                  {SCOUT_STATUS_LABELS[lead.status]}
                </span>
              </span>
              <span className="text-lg tabular-nums text-ink">{lead.score ?? "—"}</span>
            </Link>
          </li>
        ))}
      </ul>
      {!leads.length ? <p className="text-sm text-olive">Nog geen leads. Push vanaf Scout een website.</p> : null}
    </main>
  );
}
