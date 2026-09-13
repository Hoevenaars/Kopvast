import Link from "next/link";
import { ButtonLink } from "@/components/button-link";
import { routes } from "@/lib/site";

export default function NotFound() {
  return (
    <section className="container-page py-24 text-center">
      <p className="text-xs tracking-[0.18em] text-olive uppercase">404</p>
      <h1 className="font-heading mt-4 text-4xl text-ink">Deze pagina bestaat niet</h1>
      <p className="mx-auto mt-4 max-w-md text-olive">
        De link is kapot of de pagina is verplaatst. Ga terug naar home of bekijk het websitepakket.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <ButtonLink href={routes.home}>Naar home</ButtonLink>
        <Link href={routes.websites} className="inline-flex h-11 items-center border-b border-ink text-sm">
          Websitepakket
        </Link>
      </div>
    </section>
  );
}
