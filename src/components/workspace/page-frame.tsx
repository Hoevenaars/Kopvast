import type { ReactNode } from "react";

export function PageIntro({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="text-sm font-medium text-copper-dark">{eyebrow}</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-ink md:text-4xl">{title}</h1>
        {text ? <p className="mt-2 max-w-xl text-sm leading-6 text-ink/45">{text}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ComingSoon({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="space-y-8">
      <PageIntro eyebrow={eyebrow} title={title} text={text} />
      <div className="rounded-2xl border border-ink/10 bg-white p-5 md:p-6">
        <p className="text-sm leading-6 text-ink/55">
          Deze pagina is voorbereid op de volgende bouwfase. De navigatie en de schil staan vast; de
          data sluiten we later aan op Supabase.
        </p>
      </div>
    </div>
  );
}
