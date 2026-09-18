"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Binoculars, FileText, Inbox } from "lucide-react";

const items = [
  { href: "/", label: "Scout", icon: Binoculars, match: (path: string, base: string) => path === base || path === `${base}` || path === "/" || path === "/scout" },
  { href: "/leads", label: "Leads", icon: Inbox, match: (path: string) => path.includes("/leads") },
  { href: "/concepten", label: "Concepten", icon: FileText, match: (path: string) => path.includes("/concepten") },
];

export function ScoutBottomNav({ base }: { base: string }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-ivory/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-lg grid-cols-3">
        {items.map((item) => {
          const href = item.href === "/" ? base || "/" : `${base}${item.href}`;
          const active = item.match(pathname, base || "/");
          const Icon = item.icon;
          return (
            <li key={item.label}>
              <Link
                href={href}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] tracking-[0.14em] uppercase ${
                  active ? "text-ink" : "text-olive/70"
                }`}
              >
                <Icon className="size-5" strokeWidth={active ? 2.2 : 1.7} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
