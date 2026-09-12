import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/button-link";

export function CtaBand({
  eyebrow = "Klaar om te groeien?",
  title = "Ontdek waar je merk vandaag nog terrein laat liggen.",
  action = "Bekijk je websitekansen",
  href = "/kansen",
  note = "Vrijblijvend en binnen twee minuten geregeld.",
}: {
  eyebrow?: string;
  title?: string;
  action?: string;
  href?: string;
  note?: string;
}) {
  return (
    <section className="bg-olive text-ivory">
      <div className="container-page flex flex-col gap-8 py-16 md:flex-row md:items-center md:justify-between md:py-20">
        <div className="max-w-xl">
          <p className="text-xs tracking-[0.18em] text-stone uppercase">{eyebrow}</p>
          <h2 className="mt-3 font-heading text-3xl leading-tight md:text-4xl">{title}</h2>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <ButtonLink href={href}>
            {action}
            <ArrowRight data-icon="inline-end" />
          </ButtonLink>
          <p className="text-sm text-ivory/75">{note}</p>
        </div>
      </div>
    </section>
  );
}
