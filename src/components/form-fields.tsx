import type { ReactNode } from "react";

export const fieldClass =
  "h-11 w-full min-w-0 rounded-md border border-stone bg-ivory px-3 text-base text-ink outline-none placeholder:text-olive/70 focus-visible:border-copper focus-visible:ring-3 focus-visible:ring-copper/30";

export const areaClass =
  "min-h-32 w-full rounded-md border border-stone bg-ivory px-3 py-2 text-base text-ink outline-none placeholder:text-olive/70 focus-visible:border-copper focus-visible:ring-3 focus-visible:ring-copper/30";

export function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}

export function StepNav({
  step,
  total,
  onBack,
  nextLabel = "Volgende",
  pending = false,
}: {
  step: number;
  total: number;
  onBack?: () => void;
  nextLabel?: string;
  pending?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      {step > 0 && onBack ? (
        <button type="button" onClick={onBack} className="text-sm text-ink underline-offset-4 hover:underline">
          Terug
        </button>
      ) : (
        <span />
      )}
      <p className="text-xs text-olive">
        Stap {step + 1} van {total}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center rounded-md bg-copper-dark px-5 text-sm text-ivory disabled:opacity-60"
      >
        {pending ? "Versturen…" : nextLabel}
      </button>
    </div>
  );
}
