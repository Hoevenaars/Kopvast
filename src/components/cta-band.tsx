import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { cta } from "@/lib/site";

export function CtaBand({
  title = "Klaar om je bedrijf sterker neer te zetten?",
  note = "Vaste prijzen · Heldere afspraken · Premium uitvoering",
}: {
  title?: string;
  note?: string;
}) {
  return (
    <section className="bg-ink text-ivory">
      <div className="container-page py-16 md:py-20">
        <h2 className="font-heading max-w-3xl text-3xl leading-tight md:text-5xl">{title}</h2>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <ButtonLink href={cta.package.href}>
            {cta.package.label}
            <ArrowRight data-icon="inline-end" />
          </ButtonLink>
          <ButtonLink
            href={cta.custom.href}
            variant="outline"
            className="border-white/20 bg-transparent text-ivory hover:bg-white/10"
          >
            {cta.custom.label}
          </ButtonLink>
        </div>
        <p className="mt-5 text-sm text-ivory/65">{note}</p>
      </div>
    </section>
  );
}
