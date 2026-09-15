"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { isNavActive, navigationFor, type ShellVariant } from "@/lib/app-nav";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { AccountMenu, NotificationMenu } from "@/components/workspace/shell-menus";

type Props = {
  variant: ShellVariant;
  email?: string;
  children: ReactNode;
};

export function KopvastAppShell({ variant, email, children }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = variant === "admin";
  const navigation = navigationFor(variant);

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-ink/10 bg-ivory/95 px-4 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          <NotificationMenu variant={variant} />
          <AccountMenu variant={variant} email={email} compact />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="cursor-pointer rounded-md border border-ink/10 bg-white p-2.5"
            aria-label="Menu openen"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col bg-ink text-ivory lg:flex">
        <SidebarHeader variant={variant} />
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <Navigation navigation={navigation} pathname={pathname} />
        </nav>
        <SidebarFooter variant={variant} />
      </aside>

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-50 cursor-pointer bg-ink/35 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Menu sluiten"
          />
          <aside className="fixed inset-y-0 left-0 z-60 flex w-[290px] flex-col bg-ink text-ivory lg:hidden">
            <div className="flex items-center justify-between border-b border-ivory/10 px-5 py-5">
              <Logo light />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="cursor-pointer rounded-md p-2 hover:bg-ivory/10"
                aria-label="Menu sluiten"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <Navigation
                navigation={navigation}
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            </nav>
            <SidebarFooter variant={variant} />
          </aside>
        </>
      ) : null}

      <div className="lg:pl-[272px]">
        <Topbar variant={variant} email={email} />
        <main
          className={
            isAdmin
              ? "mx-auto min-w-0 max-w-[1600px] p-4 md:p-6 lg:p-8"
              : "mx-auto min-w-0 max-w-[1280px] p-4 md:p-6 lg:p-10"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function Navigation({
  navigation,
  pathname,
  onNavigate,
}: {
  navigation: ReturnType<typeof navigationFor>;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-1">
      {navigation.map((item) => {
        const Icon = item.icon;
        const active = isNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
              active ? "bg-ivory text-ink" : "text-ivory/65 hover:bg-ivory/10 hover:text-ivory"
            )}
          >
            <Icon className={cn("size-[18px]", active ? "text-copper-dark" : "text-ivory/45 group-hover:text-ivory/80")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function SidebarHeader({ variant }: { variant: ShellVariant }) {
  return (
    <div className="border-b border-ivory/10 px-5 py-6">
      <Logo light />
      <div className="mt-4 text-[11px] font-semibold tracking-[0.18em] text-ivory/35 uppercase">
        {variant === "admin" ? "Admin Console" : "Mijn Kopvast"}
      </div>
    </div>
  );
}

function SidebarFooter({ variant }: { variant: ShellVariant }) {
  return (
    <div className="border-t border-ivory/10 p-4">
      <div className="rounded-md bg-ivory/6 p-3">
        <div className="text-xs font-semibold text-ivory">{variant === "admin" ? site.name : "Hulp nodig?"}</div>
        <div className="mt-1 text-xs leading-5 text-ivory/45">
          {variant === "admin" ? site.tagline : "Stuur een wijzigings- of supportverzoek."}
        </div>
      </div>
    </div>
  );
}

function Topbar({ variant, email }: { variant: ShellVariant; email?: string }) {
  return (
    <header className="hidden h-[72px] items-center justify-between border-b border-ink/8 bg-ivory/90 px-8 backdrop-blur lg:flex">
      <div>
        <div className="text-sm font-medium">{variant === "admin" ? "Kopvast Admin" : "Mijn Kopvast"}</div>
        <div className="text-xs text-ink/45">
          {variant === "admin" ? "Overzicht en controle" : "Website, merk en middelen"}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <NotificationMenu variant={variant} />
        <AccountMenu variant={variant} email={email} />
      </div>
    </header>
  );
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href={light ? "#" : "/"} className="block" onClick={(event) => light && event.preventDefault()}>
      <div className={cn("text-[1.05rem] font-semibold tracking-[0.22em]", light ? "text-ivory" : "text-ink")}>
        {site.name.toUpperCase()}
      </div>
      <div className={cn("mt-0.5 text-[10px] tracking-[0.16em] uppercase", light ? "text-ivory/40" : "text-ink/45")}>
        {site.tagline}
      </div>
    </Link>
  );
}
