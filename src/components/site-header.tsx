"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { cta, nav, routes, site } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-stone/40 bg-ivory/95 backdrop-blur-md">
      <div className="container-page flex min-h-[4.25rem] items-center justify-between gap-4 py-2">
        <Link href={routes.home} className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="text-[1.05rem] font-semibold tracking-[0.22em] text-ink">
            {site.name.toUpperCase()}
          </span>
          <span className="hidden h-8 w-px bg-stone/80 md:block" />
          <span className="hidden text-[0.68rem] leading-4 tracking-[0.12em] text-olive uppercase md:block">
            {site.tagline}
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm text-ink/75 transition-colors hover:text-ink",
                pathname === item.href || pathname.startsWith(`${item.href}/`) ? "text-ink" : ""
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink href={cta.package.href} className="max-sm:px-3">
            <span className="sm:hidden">Websitepakket</span>
            <span className="hidden sm:inline">{cta.package.label}</span>
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
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-1 py-2 text-sm"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link href={routes.check} className="rounded-md px-1 py-2 text-sm" onClick={() => setOpen(false)}>
              Websitecheck
            </Link>
            <Link href={routes.maatwerk} className="rounded-md px-1 py-2 text-sm" onClick={() => setOpen(false)}>
              Maatwerk
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
