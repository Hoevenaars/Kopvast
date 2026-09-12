"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { dienstLinks, nav, site } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dienstenOpen, setDienstenOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-stone/40 bg-ivory/95 backdrop-blur-md">
      <div className="container-page flex h-[4.25rem] items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="text-[1.05rem] font-semibold tracking-[0.22em] text-ink">
            {site.name.toUpperCase()}
          </span>
          <span className="hidden h-8 w-px bg-stone/80 sm:block" />
          <span className="hidden max-w-[9rem] text-[0.62rem] leading-3.5 tracking-[0.14em] text-olive uppercase sm:block">
            Scherp denken.
            <br />
            Sterk uitvoeren.
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          <div
            className="relative"
            onMouseEnter={() => setDienstenOpen(true)}
            onMouseLeave={() => setDienstenOpen(false)}
          >
            <button
              type="button"
              className={cn(
                "text-sm text-ink/80 transition-colors hover:text-ink",
                pathname.startsWith("/websites") ||
                  pathname.startsWith("/merkidentiteit") ||
                  pathname.startsWith("/sjablonen")
                  ? "text-ink"
                  : ""
              )}
              aria-expanded={dienstenOpen}
              onClick={() => setDienstenOpen((value) => !value)}
            >
              Diensten
            </button>
            {dienstenOpen ? (
              <div className="absolute top-full left-0 pt-3">
                <div className="w-[22rem] rounded-xl border border-stone/50 bg-ivory p-3 shadow-lg">
                  {dienstLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block rounded-lg px-3 py-2.5 hover:bg-muted"
                      onClick={() => setDienstenOpen(false)}
                    >
                      <p className="text-sm font-medium text-ink">{item.title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-olive">{item.text}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          {nav.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm text-ink/80 transition-colors hover:text-ink",
                pathname.startsWith(item.href) ? "text-ink" : ""
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink href="/kansen" className="max-sm:px-3">
            <span className="sm:hidden">Kansen</span>
            <span className="hidden sm:inline">Bekijk je kansen</span>
            <ArrowRight data-icon="inline-end" />
          </ButtonLink>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-md text-ink lg:hidden"
            aria-label={open ? "Menu sluiten" : "Menu openen"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-stone/40 bg-ivory lg:hidden">
          <nav className="container-page flex flex-col gap-1 py-4">
            {dienstLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-1 py-2 text-sm"
                onClick={() => setOpen(false)}
              >
                {item.title}
              </Link>
            ))}
            {nav.slice(1).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-1 py-2 text-sm"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/kansen" className="rounded-md px-1 py-2 text-sm" onClick={() => setOpen(false)}>
              Websitekansen
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
