import type { ProjectStatus, ProjectType } from "@/lib/product";
import { isEmail } from "@/lib/product";

export const productionStatuses = [
  { value: "ready_for_production", label: "Klaar voor productie" },
  { value: "in_production", label: "In productie" },
  { value: "client_review", label: "Klantreview" },
  { value: "changes", label: "Wijzigingen" },
  { value: "approved", label: "Goedgekeurd" },
  { value: "ready_to_launch", label: "Klaar voor livegang" },
  { value: "live", label: "Live" },
] as const;

export const productionBoardColumns = productionStatuses.filter((item) => item.value !== "live");

export const changeRequestStatuses = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In behandeling" },
  { value: "DONE", label: "Klaar" },
] as const;

export const approvalKinds = [
  { value: "concept", label: "Concept" },
  { value: "final", label: "Definitief akkoord" },
] as const;

export const launchCheckItems = [
  { key: "domain_dns", label: "Domein / DNS gereed" },
  { key: "ssl", label: "SSL actief" },
  { key: "desktop", label: "Desktop gecontroleerd" },
  { key: "mobile", label: "Mobiel gecontroleerd" },
  { key: "forms", label: "Formulieren getest" },
  { key: "form_recipients", label: "Ontvangers formulieren gecontroleerd" },
  { key: "seo", label: "Basis SEO metadata" },
  { key: "sitemap", label: "Sitemap / robots waar van toepassing" },
  { key: "not_found", label: "404 gecontroleerd" },
  { key: "favicon", label: "Favicon" },
  { key: "analytics", label: "Analytics indien afgesproken" },
  { key: "privacy", label: "Privacy/cookie inrichting indien afgesproken" },
  { key: "backup", label: "Back-up / rollback mogelijkheid" },
  { key: "final_approval", label: "Klant definitief akkoord" },
] as const;

export const deliveryProjectTypes: ProjectType[] = ["website", "maatwerk", "merkrefresh", "sjablonen"];

export type ProductionStatus = (typeof productionStatuses)[number]["value"];
export type ChangeRequestStatus = (typeof changeRequestStatuses)[number]["value"];
export type ApprovalKind = (typeof approvalKinds)[number]["value"];
export type LaunchCheckKey = (typeof launchCheckItems)[number]["key"];

export type LaunchChecks = Record<LaunchCheckKey, boolean>;

export type ProductionRow = {
  id: string;
  organization_id: string;
  project_id: string;
  status: ProductionStatus;
  preview_url: string | null;
  review_message: string | null;
  next_action: string | null;
  blockers: string | null;
  due_at: string | null;
  live_at: string | null;
  onboarding_complete: boolean;
  scope: string | null;
  launch_checks: LaunchChecks;
  created_at: string;
  updated_at: string;
};

export type ChangeRequestRow = {
  id: string;
  production_id: string;
  organization_id: string;
  page_section: string;
  body: string;
  file_url: string | null;
  file_name: string | null;
  status: ChangeRequestStatus;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
};

export type ApprovalRow = {
  id: string;
  production_id: string;
  organization_id: string;
  kind: ApprovalKind;
  name: string;
  email: string;
  snapshot: Record<string, unknown>;
  created_at: string;
};

export type ProductionActivityRow = {
  id: string;
  production_id: string;
  organization_id: string;
  event_type: string;
  actor_email: string | null;
  detail: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ProductionCard = ProductionRow & {
  customer: string;
  order: string;
  website: string | null;
  project_type: ProjectType;
  project_status: ProjectStatus;
  beheer_sold: boolean;
  open_changes: number;
  concept_approved: boolean;
  final_approved: boolean;
};

export function isProductionStatus(value: string): value is ProductionStatus {
  return productionStatuses.some((item) => item.value === value);
}

export function isChangeRequestStatus(value: string): value is ChangeRequestStatus {
  return changeRequestStatuses.some((item) => item.value === value);
}

export function isApprovalKind(value: string): value is ApprovalKind {
  return approvalKinds.some((item) => item.value === value);
}

export function isDeliveryProject(type: string): type is ProjectType {
  return deliveryProjectTypes.includes(type as ProjectType);
}

export function emptyLaunchChecks(): LaunchChecks {
  return Object.fromEntries(launchCheckItems.map((item) => [item.key, false])) as LaunchChecks;
}

export function parseLaunchChecks(value: unknown): LaunchChecks {
  const base = emptyLaunchChecks();
  if (!value || typeof value !== "object") return base;
  const record = value as Record<string, unknown>;
  for (const item of launchCheckItems) {
    base[item.key] = record[item.key] === true;
  }
  return base;
}

export function launchCheckStats(checks: LaunchChecks) {
  const total = launchCheckItems.length;
  const done = launchCheckItems.filter((item) => checks[item.key]).length;
  return { total, done, complete: done === total };
}

export function defaultNextAction(
  status: ProductionStatus,
  flags: {
    onboardingComplete: boolean;
    openChanges?: number;
    finalApproved?: boolean;
    checklistComplete?: boolean;
  }
) {
  if (!flags.onboardingComplete && status === "ready_for_production") return "Rond onboarding af";
  switch (status) {
    case "ready_for_production":
      return "Start productie";
    case "in_production":
      return "Stuur naar klantreview";
    case "client_review":
      return "Wacht op klantakkoord";
    case "changes":
      return flags.openChanges ? "Werk openstaande wijzigingen af" : "Stuur opnieuw ter review";
    case "approved":
      if (!flags.finalApproved) return "Vraag definitief akkoord";
      if (!flags.checklistComplete) return "Werk livegang-checklist af";
      return "Markeer als live";
    case "ready_to_launch":
      return "Markeer als live";
    case "live":
      return "Factuur / beheercheck";
  }
}

export function defaultBlockers(onboardingComplete: boolean) {
  return onboardingComplete ? null : "Onboarding incompleet";
}

export function projectStatusForProduction(status: ProductionStatus): ProjectStatus {
  if (status === "ready_for_production") return "voorbereiding";
  if (status === "in_production") return "in_uitvoering";
  if (status === "client_review" || status === "changes") return "wacht_op_klant";
  if (status === "approved" || status === "ready_to_launch") return "opgeleverd";
  return "live";
}

export function orderStatusForProduction(status: ProductionStatus) {
  if (status === "ready_for_production") return "READY_FOR_PRODUCTION";
  if (status === "in_production") return "IN_PRODUCTION";
  if (status === "client_review") return "CLIENT_REVIEW";
  if (status === "changes") return "CHANGES";
  if (status === "approved") return "APPROVED";
  if (status === "ready_to_launch") return "READY_TO_LAUNCH";
  return "LIVE";
}

export function productionsByColumn(items: ProductionCard[]) {
  return productionBoardColumns.map((column) => ({
    ...column,
    items: items.filter((item) => item.status === column.value),
  }));
}

export function liveProductions(items: ProductionCard[]) {
  return items
    .filter((item) => item.status === "live")
    .sort((a, b) => (b.live_at || b.updated_at).localeCompare(a.live_at || a.updated_at));
}

export function allChangesDone(changes: Array<{ status: string }>) {
  return changes.length > 0 && changes.every((item) => item.status === "DONE");
}

export function openChangeCount(changes: Array<{ status: string }>) {
  return changes.filter((item) => item.status !== "DONE").length;
}

export function latestApproval(approvals: ApprovalRow[], kind: ApprovalKind) {
  return approvals.filter((item) => item.kind === kind).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

export function checklistComplete(checks: LaunchChecks, finalApproved: boolean) {
  const next = { ...checks, final_approval: finalApproved || checks.final_approval };
  return launchCheckStats(next).complete;
}

export function canSendToReview(input: { previewUrl?: string; reviewMessage?: string }) {
  const previewUrl = (input.previewUrl ?? "").trim();
  const reviewMessage = (input.reviewMessage ?? "").trim();
  if (!isHttpUrl(previewUrl)) return { ok: false as const, message: "Zet een preview-URL klaar (https://…)." };
  if (reviewMessage.length < 8) return { ok: false as const, message: "Schrijf een korte reviewboodschap voor de klant." };
  return { ok: true as const, previewUrl, reviewMessage };
}

export function canResubmitReview(changes: Array<{ status: string }>) {
  if (!changes.length) return { ok: false as const, message: "Er staan geen wijzigingen klaar." };
  if (!allChangesDone(changes)) return { ok: false as const, message: "Rond eerst alle wijzigingen af." };
  return { ok: true as const };
}

export function canMarkLive(input: {
  status: ProductionStatus;
  finalApproved: boolean;
  checks: LaunchChecks;
}) {
  if (!input.finalApproved) return { ok: false as const, message: "De klant moet eerst definitief akkoord geven." };
  if (!checklistComplete(input.checks, true)) {
    return { ok: false as const, message: "Werk de livegang-checklist af." };
  }
  if (input.status === "live") return { ok: false as const, message: "Deze website is al live." };
  return { ok: true as const };
}

export function nextStatusAfterChecklist(input: {
  status: ProductionStatus;
  finalApproved: boolean;
  checks: LaunchChecks;
}): ProductionStatus {
  if (input.status === "live") return "live";
  if (input.finalApproved && checklistComplete(input.checks, true) && (input.status === "approved" || input.status === "ready_to_launch")) {
    return "ready_to_launch";
  }
  if (input.status === "ready_to_launch" && !(input.finalApproved && checklistComplete(input.checks, true))) {
    return "approved";
  }
  return input.status;
}

export function parseChangeRequest(input: { pageSection?: string; body?: string; fileUrl?: string }) {
  const pageSection = (input.pageSection ?? "").trim();
  const body = (input.body ?? "").trim();
  const fileUrl = (input.fileUrl ?? "").trim();
  if (pageSection.length < 2) return { ok: false as const, message: "Noem de pagina of het onderdeel." };
  if (body.length < 8) return { ok: false as const, message: "Beschrijf de wijziging." };
  if (fileUrl && !isHttpUrl(fileUrl)) return { ok: false as const, message: "Bestandslink moet met http beginnen." };
  return { ok: true as const, pageSection, body, fileUrl: fileUrl || null };
}

export function parseApproval(input: { name?: string; email?: string }) {
  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim().toLowerCase();
  if (name.length < 2) return { ok: false as const, message: "Vul je naam in." };
  if (!isEmail(email)) return { ok: false as const, message: "Vul een geldig e-mailadres in." };
  return { ok: true as const, name, email };
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function seedProductionFields(project: {
  id: string;
  organization_id: string;
  summary: string | null;
  due_at: string | null;
}) {
  return {
    organization_id: project.organization_id,
    project_id: project.id,
    status: "ready_for_production" as const,
    preview_url: null,
    review_message: null,
    next_action: defaultNextAction("ready_for_production", { onboardingComplete: false }),
    blockers: defaultBlockers(false),
    due_at: project.due_at,
    live_at: null,
    onboarding_complete: false,
    scope: project.summary,
    launch_checks: emptyLaunchChecks(),
  };
}

export function approvalSnapshot(production: Pick<ProductionRow, "id" | "preview_url" | "scope" | "status" | "project_id">) {
  return {
    production_id: production.id,
    project_id: production.project_id,
    preview_url: production.preview_url,
    scope: production.scope,
    status: production.status,
  };
}

export function customerAttention(productions: ProductionCard[]) {
  const items: Array<{ title: string; href: string }> = [];
  for (const item of productions) {
    if (item.status === "client_review") {
      items.push({ title: `Concept van ${item.order} wacht op akkoord`, href: "/klant/goedkeuringen" });
    } else if (item.status === "changes") {
      items.push({ title: `Wijzigingen voor ${item.order} staan open`, href: "/klant/goedkeuringen" });
    } else if ((item.status === "approved" || item.status === "ready_to_launch") && !item.final_approved) {
      items.push({ title: `Geef definitief akkoord voor ${item.order}`, href: "/klant/goedkeuringen" });
    }
  }
  return items;
}

export function formatDueLabel(value: string | null | undefined) {
  if (!value) return "Geen datum";
  return new Date(`${value}T00:00:00`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
