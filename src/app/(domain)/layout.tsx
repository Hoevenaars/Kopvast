import type { ReactNode } from "react";
import Link from "next/link";
import { routes, site } from "@/lib/site";

export default function DomainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-stone/40">
        <div className="container-page flex min-h-[4.25rem] items-center">
          <Link href={routes.home} className="text-[1.05rem] font-semibold tracking-[0.22em] text-ink">
            {site.name.toUpperCase()}
          </Link>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-stone/40">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-olive sm:flex-row sm:items-center sm:justify-between">
          <p>
            {site.name} — {site.tagline}
          </p>
          <p>
            <Link href={routes.privacy} className="underline-offset-4 hover:underline">
              Privacy
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}
