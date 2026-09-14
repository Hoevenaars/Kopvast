import type { ReactNode } from "react";

export function PageHero({
  eyebrow,
  title,
  text,
  actions,
}: {
  eyebrow: string;
  title: string;
  text: string;
  actions?: ReactNode;
}) {
  return (
    <section className="border-b border-stone/40 bg-ivory">
      <div className="container-page max-w-4xl py-14 md:py-20">
        <p className="text-xs tracking-[0.18em] text-olive uppercase">{eyebrow}</p>
        <h1 className="font-heading mt-4 text-4xl leading-[1.12] text-ink md:text-6xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-olive md:text-lg">{text}</p>
        {actions ? <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">{actions}</div> : null}
      </div>
    </section>
  );
}
