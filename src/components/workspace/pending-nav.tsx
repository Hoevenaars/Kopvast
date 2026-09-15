"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function PendingOverlay({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-white/80 text-sm font-semibold transition-opacity",
        pending ? "opacity-100" : "opacity-0"
      )}
      aria-hidden={!pending}
    >
      <span className="flex items-center gap-2">
        <span className={cn("size-4 rounded-full border-2 border-ink/15 border-t-copper-dark", pending && "animate-spin")} />
        {label}
      </span>
    </span>
  );
}

export function PendingLink({
  href,
  className,
  children,
  pendingLabel = "Openen…",
}: {
  href: string;
  className?: string;
  children: ReactNode;
  pendingLabel?: string;
}) {
  return (
    <Link href={href} className={cn("relative", className)}>
      {children}
      <PendingOverlay label={pendingLabel} />
    </Link>
  );
}
