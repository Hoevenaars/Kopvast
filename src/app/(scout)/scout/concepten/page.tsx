import Link from "next/link";
import { redirect } from "next/navigation";
import { readScoutUser } from "@/lib/scout/auth";
import { scoutPublicBase, withBase } from "@/lib/scout/base-path";
import { getDraft, listConceptLeads } from "@/lib/scout/leads";

export default async function ScoutConceptsPage() {
  const user = await readScoutUser();
  const base = await scoutPublicBase();
  if (!user) redirect(withBase(base, "/login"));
  const leads = await listConceptLeads(user.id);

  const cards = await Promise.all(
    leads.map(async (lead) => ({
      lead,
      draft: await getDraft(lead.id),
    }))
  );

  return (
    <main>
      <header className="mb-8">
        <p className="text-[11px] tracking-[0.28em] text-olive uppercase">Inbox</p>
        <h1 className="font-heading mt-3 text-4xl text-ink">Concepten</h1>
      </header>
      <ul className="space-y-4">
        {cards.map(({ lead, draft }) => (
          <li key={lead.id} className="rounded-3xl border border-ink/10 bg-white p-5">
            <p className="text-xs tracking-[0.16em] text-olive uppercase">{lead.domain}</p>
            <h2 className="mt-1 text-xl text-ink">{lead.company_name || lead.domain}</h2>
            <p className="mt-3 line-clamp-4 text-sm leading-6 text-olive">{draft?.message || "Concept wordt klaargezet."}</p>
            <Link href={`${base}/leads/${lead.id}`} className="mt-4 inline-flex text-sm font-medium text-copper-dark">
              Bekijken en goedkeuren
            </Link>
          </li>
        ))}
      </ul>
      {!cards.length ? <p className="text-sm text-olive">Nog geen concepten klaar.</p> : null}
    </main>
  );
}
