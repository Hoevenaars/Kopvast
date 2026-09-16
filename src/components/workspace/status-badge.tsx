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
  if (["OVERDUE", "NOT_INVOICED", "nieuw", "NIEUW", "lead", "voorbereiding"].includes(status)) return "copper";
  if (["PAID", "live", "klaar", "OMGEZET", "active", "opgeleverd"].includes(status)) return "ink";
  return "olive";
}
