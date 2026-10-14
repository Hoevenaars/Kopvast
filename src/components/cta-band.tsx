import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { cta } from "@/lib/site";

export function CtaBand({
  title = "Benieuwd wat Kopvast voor jouw bedrijf kan betekenen?",
  primary = cta.discuss,
  secondary,
}: {
  title?: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="bg-ink text-ivory">
      <div className="container-page py-16 md:py-20">
        <h2 className="font-heading max-w-3xl text-3xl leading-tight md:text-5xl">{title}</h2>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <ButtonLink href={primary.href}>
            {primary.label}
            <ArrowRight data-icon="inline-end" />
          </ButtonLink>
          {secondary ? (
            <ButtonLink
              href={secondary.href}
              variant="outline"
              className="border-white/20 bg-transparent text-ivory hover:bg-white/10"
            >
              {secondary.label}
            </ButtonLink>
          ) : null}
        </div>
        <p className="mt-5 text-sm text-ivory/65">Vrijblijvend. Geen opdracht tot je een voorstel accepteert.</p>
      </div>
    </section>
  );
}
