"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  pendingLabel = "Bezig…",
  className,
  disabled,
  formAction,
}: {
  children: string;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
  formAction?: ComponentProps<"button">["formAction"];
}) {
  const { pending } = useFormStatus();
  const busy = pending || disabled;
  return (
    <button type="submit" formAction={formAction} disabled={busy} className={cn(className, busy && "cursor-wait opacity-60")}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormBusyOverlay({ label = "Bezig… even geduld." }: { label?: string }) {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-ivory/80 backdrop-blur-[1px]">
      <div className="flex items-center gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold shadow-sm">
        <span className="size-4 animate-spin rounded-full border-2 border-ink/15 border-t-copper-dark" />
        {label}
      </div>
    </div>
  );
}

export function RouteBusy({ text }: { text: string }) {
  return (
    <div className="flex min-h-[42vh] flex-col items-center justify-center gap-4 rounded-2xl border border-ink/10 bg-white">
      <span className="size-7 animate-spin rounded-full border-2 border-ink/15 border-t-copper-dark" />
      <p className="text-sm text-ink/55">{text}</p>
    </div>
  );
}
