import {
  PERSONAL_APPROACH_DISCOUNT_RULES,
  PERSONAL_APPROACH_INTRO,
  PERSONAL_APPROACH_MAIL_RULES,
  PERSONAL_APPROACH_TITLE,
} from "@/lib/acquisition/outreach-policy";

export function OutreachRulesCard() {
  return (
    <section className="space-y-5 rounded-2xl border border-ink/10 bg-white p-5 md:p-6">
      <div>
        <h2 className="font-semibold">{PERSONAL_APPROACH_TITLE}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/45">{PERSONAL_APPROACH_INTRO}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <RuleList title="Scherpe, persoonlijke mail" items={PERSONAL_APPROACH_MAIL_RULES} />
        <RuleList title="Korting alleen met reden" items={PERSONAL_APPROACH_DISCOUNT_RULES} />
      </div>
    </section>
  );
}

function RuleList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ol className="mt-3 list-decimal space-y-2.5 pl-5">
        {items.map((item) => (
          <li key={item} className="text-sm leading-6 text-ink/70">
            {item}
          </li>
        ))}
      </ol>
    </div>
  );
}
