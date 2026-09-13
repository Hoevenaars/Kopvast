import Link from "next/link";
import { routes, site } from "@/lib/site";

const columns = [
  {
    title: "Kopvast",
    intro: true,
    links: [
      { href: routes.websites, label: "Websites" },
      { href: routes.merk, label: "Merk" },
      { href: routes.marketing, label: "Marketingmiddelen" },
      { href: routes.maatwerk, label: "Maatwerk" },
    ],
  },
  {
    title: "Starten",
    links: [
      { href: routes.websites, label: "Websitepakket" },
      { href: routes.check, label: "Websitecheck" },
      { href: routes.maatwerk, label: "Maatwerk aanvragen" },
    ],
  },
  {
    title: "Over",
    links: [
      { href: routes.over, label: "Over Kopvast" },
      { href: routes.werk, label: "Werk" },
      { href: routes.contact, label: "Contact" },
    ],
  },
  {
    title: "Juridisch",
    links: [
      { href: routes.privacy, label: "Privacy" },
      { href: routes.voorwaarden, label: "Voorwaarden" },
      { href: routes.cookies, label: "Cookies" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-stone/40 bg-ivory">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-xs tracking-[0.16em] text-stone uppercase">{column.title}</p>
            {"intro" in column && column.intro ? (
              <p className="mt-3 text-sm leading-6 text-olive">{site.tagline}</p>
            ) : null}
            <ul className="mt-4 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-ink/80 hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            {"intro" in column && column.intro ? (
              <p className="mt-5 text-sm text-olive">
                <a className="underline-offset-4 hover:underline" href={`mailto:${site.email}`}>
                  {site.email}
                </a>
              </p>
            ) : null}
          </div>
        ))}
      </div>
      <div className="border-t border-stone/40">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-olive sm:flex-row sm:items-center sm:justify-between">
          <p>
            {site.name} — {site.tagline}
          </p>
          <p>Alle bedragen exclusief btw.</p>
        </div>
      </div>
    </footer>
  );
}
