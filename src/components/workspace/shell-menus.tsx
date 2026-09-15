"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, UserRound } from "lucide-react";
import { loadAdminNotificationsAction } from "@/app/(workspace)/admin/notifications";
import type { NotificationItem } from "@/lib/notifications";
import type { ShellVariant } from "@/lib/app-nav";
import { cn } from "@/lib/utils";

export function NotificationMenu({ variant }: { variant: ShellVariant }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(variant === "admin" ? null : []);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== "admin") return;
    let cancelled = false;
    loadAdminNotificationsAction()
      .then((next) => {
        if (!cancelled) setItems(next);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [variant]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const count = items?.length ?? 0;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative cursor-pointer rounded-md border border-ink/10 bg-white p-2.5 hover:bg-ivory"
        aria-label="Meldingen"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="size-[18px]" />
        {count > 0 ? (
          <span className="absolute -top-1 -right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-copper-dark px-1 text-[10px] font-semibold text-ivory">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-ink/10 bg-white shadow-lg">
          <div className="border-b border-ink/8 px-4 py-3">
            <p className="text-sm font-semibold">Meldingen</p>
            <p className="mt-0.5 text-xs text-ink/45">
              {variant === "admin" ? "Wat nu aandacht nodig heeft." : "Updates over je website en verzoeken."}
            </p>
          </div>
          {items === null ? (
            <p className="px-4 py-5 text-sm text-ink/45">Meldingen laden…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-5 text-sm text-ink/45">Geen meldingen. Nieuwe acties verschijnen hier.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="border-b border-ink/6 last:border-0">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 text-left hover:bg-[#F8F6F1]"
                  >
                    <span className="text-sm font-semibold">{item.title}</span>
                    <span className="mt-1 block text-xs text-ink/45">{item.detail}</span>
                    <span className="mt-1 block text-[11px] font-semibold text-copper-dark">{item.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function AccountMenu({
  variant,
  email,
  compact = false,
}: {
  variant: ShellVariant;
  email?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const initial = (email?.[0] ?? (variant === "admin" ? "K" : "M")).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-md border border-ink/10 bg-white hover:bg-ivory",
          compact ? "p-1.5" : "px-3 py-2"
        )}
        aria-label={variant === "admin" ? "Admin-menu" : "Accountmenu"}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div className="flex size-8 items-center justify-center rounded-full bg-olive text-xs font-semibold text-ivory">
          {initial}
        </div>
        {compact ? null : (
          <>
            <div className="text-left">
              <div className="text-xs font-semibold">{variant === "admin" ? "Admin" : "Account"}</div>
              <div className="max-w-40 truncate text-[11px] text-ink/45">
                {email || (variant === "admin" ? "Kopvast" : "Mijn omgeving")}
              </div>
            </div>
            <ChevronDown className={cn("size-4 text-ink/35 transition", open && "rotate-180")} />
          </>
        )}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-ink/10 bg-white py-1 shadow-lg"
        >
          {email ? <p className="truncate px-3 py-2 text-[11px] text-ink/40">{email}</p> : null}
          <form action="/inloggen/wisselen" method="post">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-ivory"
            >
              <UserRound className="size-4 text-ink/40" />
              Account wisselen
            </button>
          </form>
          <form action="/inloggen/uitloggen" method="post">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-ivory"
            >
              <LogOut className="size-4 text-ink/40" />
              Uitloggen
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
