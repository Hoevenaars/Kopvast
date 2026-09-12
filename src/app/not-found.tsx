import Link from "next/link";
import { ButtonLink } from "@/components/button-link";

export default function NotFound() {
  return (
    <section className="container-page py-24 text-center">
      <p className="text-xs tracking-[0.18em] text-olive uppercase">404</p>
      <h1 className="mt-4 font-heading text-4xl text-ink">Deze pagina bestaat niet</h1>
      <p className="mx-auto mt-4 max-w-md text-olive">
        De link is kapot of de pagina is verplaatst. Ga terug naar home of toets je website.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <ButtonLink href="/">Naar home</ButtonLink>
        <Link href="/kansen" className="inline-flex h-11 items-center border-b border-ink text-sm">
          Websitekansen
        </Link>
      </div>
    </section>
  );
}
