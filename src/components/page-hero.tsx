export function PageHero({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <section className="border-b border-stone/40 bg-ivory">
      <div className="container-page max-w-4xl py-16 md:py-24">
        <p className="text-xs tracking-[0.18em] text-olive uppercase">{eyebrow}</p>
        <h1 className="mt-4 font-heading text-4xl leading-[1.12] text-ink md:text-6xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-olive md:text-lg">{text}</p>
      </div>
    </section>
  );
}
