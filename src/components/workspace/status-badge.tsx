import { cn } from "@/lib/utils";

export function StatusBadge({ label, tone = "olive" }: { label: string; tone?: "olive" | "copper" | "ink" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs",
        tone === "copper" && "bg-copper/15 text-copper-dark",
        tone === "ink" && "bg-ink/10 text-ink",
        tone === "olive" && "bg-olive/10 text-olive"
      )}
    >
      {label}
    </span>
  );
}

export function toneForStatus(status: string): "olive" | "copper" | "ink" {
  if (["nieuw", "NIEUW", "NEW", "lead", "voorbereiding", "ON_HOLD", "CHANGES"].includes(status)) return "copper";
  if (["live", "LIVE", "klaar", "OMGEZET", "active", "opgeleverd", "COMPLETED"].includes(status)) return "ink";
  return "olive";
}
