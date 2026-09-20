import { adminStatusFromScore, statusFromScore, type ProspectStatus } from "@/lib/acquisition-constants";
import type { ScoutSource, ScoutStatus } from "./types";

export const SCOUT_SOURCE_LABELS: Record<ScoutSource, string> = {
  scout_manual: "Handmatig",
  safari_share: "Deelblad",
  camera: "Camera",
  nearby: "In de buurt",
  prospect_scanner: "Scanner",
  import: "Import",
  shortcut: "Shortcut",
  clipboard: "Klembord",
};

export function scoutSourceLabel(source: string) {
  return SCOUT_SOURCE_LABELS[source as ScoutSource] ?? source.replaceAll("_", " ");
}

export function isScoutSourceReference(value: string | null | undefined) {
  return Boolean(value?.startsWith("scout_"));
}

export function prospectStatusFromScout(status: ScoutStatus, score: number | null): ProspectStatus {
  if (status === "nieuw" || status === "scannen") return "SCANNING";
  if (status === "scan_mislukt") return "SCAN_FAILED";
  if (status === "gewonnen") return "SALES_READY";
  if (status === "afgevallen") return "WATCHLIST";
  if (score == null) return "ANALYSING";
  return adminStatusFromScore(statusFromScore(score));
}

export function mergeScoutNote(existing: string | null | undefined, note: string | null) {
  const next = note?.trim() || "";
  const current = existing?.trim() || "";
  if (!next) return current || null;
  if (!current) return next;
  if (current.includes(next)) return current;
  return `${current}\n\nScout: ${next}`;
}
