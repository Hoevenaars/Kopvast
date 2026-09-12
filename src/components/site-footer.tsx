import Link from "next/link";
import { site } from "@/lib/site";

const columns = [
  {
    title: "Aanbod",
    links: [
      { href: "/websites", label: "Websites" },
      { href: "/merkidentiteit", label: "Merkidentiteit" },
      { href: "/sjablonen", label: "Sjablonen" },
      { href: "/kansen", label: "Websitekansen" },
    ],
  },
  {
    title: "Kopvast",
    links: [
      { href: "/werkwijze", label: "Werkwijze" },
      { href: "/resultaten", label: "Resultaten" },
      { href: "/over-ons", label: "Over ons" },
      { href: "/aanvraag", label: "Aanvraag" },
    ],
  },
  {
    title: "Juridisch",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/cookies", label: "Cookies" },
      { href: "/voorwaarden", label: "Voorwaarden" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-stone/40 bg-ivory">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.22em] text-ink">{site.name.toUpperCase()}</p>
          <p className="mt-3 max-w-xs text-sm leading-6 text-olive">{site.tagline}</p>
          <p className="mt-6 text-sm text-olive">
            <a className="underline-offset-4 hover:underline" href={`mailto:${site.email}`}>
              {site.email}
            </a>
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-xs tracking-[0.16em] text-stone uppercase">{column.title}</p>
            <ul className="mt-4 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-ink/80 hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-stone/40">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-olive sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Kopvast. Alle bedragen exclusief btw.</p>
          <p>Vaste prijzen. Duidelijke afspraken. Alles op één plek.</p>
        </div>
      </div>
    </footer>
  );
}
