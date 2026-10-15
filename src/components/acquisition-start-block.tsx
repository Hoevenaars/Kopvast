import { AcquisitionStartForm } from "@/components/acquisition-start-form";
import { startLandingCopy, type AcquisitionStartParams } from "@/lib/acquisition-start";

export function AcquisitionStartCopy({
  params,
  heading: Heading = "h2",
}: {
  params: AcquisitionStartParams;
  heading?: "h1" | "h2";
}) {
  const copy = startLandingCopy(params);
  const who = params.company || params.website;

  return (
    <div>
      <p className="text-xs tracking-[0.18em] text-olive uppercase">{copy.eyebrow}</p>
      <Heading className="font-heading mt-4 text-3xl leading-tight text-ink md:text-5xl">{copy.title}</Heading>
      <p className="mt-5 text-base leading-7 text-olive">{copy.text}</p>
      {who ? (
        <p className="mt-4 text-sm leading-6 text-olive">
          We herkennen {who}. Je hoeft alleen te bevestigen dat je verder wilt praten.
        </p>
      ) : null}
      <ul className="mt-8 space-y-3 text-sm leading-6 text-olive">
        <li>Geen koopverplichting in deze stap.</li>
        <li>Geen prijs uit een link of formulier.</li>
        <li>Een voorstel volgt pas nadat de vraag helder is.</li>
      </ul>
    </div>
  );
}

export function AcquisitionStartBlock({
  params,
  className = "border-y border-stone/40 bg-[#f7f4ec]",
}: {
  params: AcquisitionStartParams;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="container-page grid gap-10 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <AcquisitionStartCopy params={params} />
        <AcquisitionStartForm {...params} />
      </div>
    </section>
  );
}
