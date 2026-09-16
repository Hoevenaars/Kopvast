import type { ReactNode } from "react";
import Link from "next/link";
import { site } from "@/lib/site";

export default function ProposalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-ivory">
      <header className="border-b border-stone/40">
        <div className="container-page flex h-16 max-w-3xl items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-[0.18em] uppercase">
            {site.name}
          </Link>
          <p className="text-xs text-olive">{site.tagline}</p>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
