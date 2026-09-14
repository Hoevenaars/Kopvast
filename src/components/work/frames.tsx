import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BrowserFrame({
  url,
  children,
  className,
}: {
  url: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-stone/50 bg-ivory shadow-[0_18px_50px_-24px_rgba(18,18,18,0.45)]",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-stone/40 bg-[#ebe6da] px-3 py-2">
        <span className="size-2 rounded-full bg-[#c9c2b4]" />
        <span className="size-2 rounded-full bg-[#c9c2b4]" />
        <span className="size-2 rounded-full bg-[#c9c2b4]" />
        <span className="ml-2 flex-1 truncate rounded-md bg-ivory px-3 py-1 text-[11px] text-olive">{url}</span>
      </div>
      <div className="bg-ivory">{children}</div>
    </div>
  );
}

export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.6rem] border-[6px] border-ink bg-ivory shadow-[0_20px_40px_-20px_rgba(18,18,18,0.55)]",
        className
      )}
    >
      <div className="flex justify-center bg-ink py-1.5">
        <span className="h-1 w-10 rounded-full bg-ivory/30" />
      </div>
      {children}
    </div>
  );
}

export function ConceptLabel({ className }: { className?: string }) {
  return (
    <p className={cn("text-[11px] tracking-[0.16em] text-olive uppercase", className)}>
      Conceptcase door Kopvast
    </p>
  );
}
