import type { ReactNode } from "react";
import Link from "next/link";
import { workspaceRoutes } from "@/lib/product";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export function WorkspaceShell({
  eyebrow,
  title,
  email,
  nav,
  children,
}: {
  eyebrow: string;
  title: string;
  email: string;
  nav: Array<{ href: string; label: string; current?: boolean }>;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-ivory">
      <header className="border-b border-stone/40">
        <div className="container-page flex min-h-[4.25rem] items-center justify-between gap-4 py-2">
          <div>
            <Link href="/" className="text-[1.05rem] font-semibold tracking-[0.22em] text-ink">
              {site.name.toUpperCase()}
            </Link>
            <p className="mt-1 text-[0.68rem] tracking-[0.14em] text-olive uppercase">{eyebrow}</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-olive sm:inline">{email}</span>
            <form action="/inloggen/uitloggen" method="post">
              <button type="submit" className="text-ink underline-offset-4 hover:underline">
                Uitloggen
              </button>
            </form>
          </div>
        </div>
        <nav className="container-page flex gap-5 overflow-x-auto pb-3 text-sm">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap pb-1",
                item.current ? "border-b border-ink text-ink" : "text-olive hover:text-ink"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="container-page flex-1 py-10">
        <h1 className="font-heading text-3xl text-ink md:text-4xl">{title}</h1>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

export function adminNav(current: string) {
  return [
    { href: workspaceRoutes.admin, label: "Overzicht", current: current === "overzicht" },
    { href: workspaceRoutes.adminLeads, label: "Aanvragen", current: current === "aanvragen" },
    { href: workspaceRoutes.adminCustomers, label: "Klanten", current: current === "klanten" },
    { href: workspaceRoutes.adminMail, label: "Mail", current: current === "mail" },
  ];
}

export function consoleNav(current: string) {
  return [
    { href: workspaceRoutes.console, label: "Overzicht", current: current === "overzicht" },
    { href: workspaceRoutes.consoleFiles, label: "Bestanden", current: current === "bestanden" },
    { href: workspaceRoutes.consoleRequests, label: "Verzoeken", current: current === "verzoeken" },
  ];
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone/70 p-8">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-olive">{text}</p>
    </div>
  );
}

export function DataList({
  items,
}: {
  items: Array<{ href?: string; title: string; meta: string; extra?: string }>;
}) {
  return (
    <ul className="divide-y divide-stone/40 rounded-2xl border border-stone/50">
      {items.map((item) => (
        <li key={`${item.title}-${item.meta}`}>
          {item.href ? (
            <Link href={item.href} className="block px-5 py-4 hover:bg-muted/40">
              <Row {...item} />
            </Link>
          ) : (
            <div className="px-5 py-4">
              <Row {...item} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function Row({ title, meta, extra }: { title: string; meta: string; extra?: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-sm text-olive">{meta}</p>
      </div>
      {extra ? <p className="text-xs text-olive">{extra}</p> : null}
    </div>
  );
}
