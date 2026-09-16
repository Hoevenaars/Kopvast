import { refreshClient } from "@/lib/refresh";
import {
  approvalSnapshot,
  canMarkLive,
  canResubmitReview,
  canSendToReview,
  defaultNextAction,
  emptyLaunchChecks,
  isChangeRequestStatus,
  isDeliveryProject,
  latestApproval,
  liveProductions,
  openChangeCount,
  parseApproval,
  parseChangeRequest,
  parseLaunchChecks,
  productionsByColumn,
  projectStatusForProduction,
  seedProductionFields,
  type ApprovalKind,
  type ApprovalRow,
  type ChangeRequestRow,
  type ChangeRequestStatus,
  type LaunchChecks,
  type ProductionActivityRow,
  type ProductionCard,
  type ProductionRow,
  type ProductionStatus,
} from "@/lib/production";
import { normalizeEmail, type ProjectType } from "@/lib/product";
import { loadOrganizations, updateOrganization, updateProjectStatus, type OrganizationRow, type ProjectRow } from "@/lib/workspace";
import { mutateStore, newId, nowIso, readStore } from "@/lib/workspace-store";

export type ActionErr = { ok: false; message: string };
export type ActionOk<T extends object = object> = { ok: true } & T;
export type ActionResult<T extends object = object> = ActionOk<T> | ActionErr;

function fail(message: string): ActionErr {
  return { ok: false, message };
}

export type ProductionDetail = {
  production: ProductionCard;
  organization: OrganizationRow;
  project: ProjectRow;
  changes: ChangeRequestRow[];
  approvals: ApprovalRow[];
  activity: ProductionActivityRow[];
  conceptApproval: ApprovalRow | null;
  finalApproval: ApprovalRow | null;
};

export type ProductionBoard = {
  columns: ReturnType<typeof productionsByColumn>;
  live: ProductionCard[];
  items: ProductionCard[];
};

function normalizeProduction(row: ProductionRow & { launch_checks?: unknown }): ProductionRow {
  return {
    ...row,
    preview_url: row.preview_url || null,
    review_message: row.review_message || null,
    next_action: row.next_action || null,
    blockers: row.blockers || null,
    due_at: row.due_at || null,
    live_at: row.live_at || null,
    scope: row.scope || null,
    onboarding_complete: row.onboarding_complete === true,
    launch_checks: parseLaunchChecks(row.launch_checks),
  };
}

function toCard(
  production: ProductionRow,
  org: OrganizationRow | undefined,
  project: ProjectRow | undefined,
  projects: ProjectRow[],
  changes: ChangeRequestRow[]
): ProductionCard {
  const beheerSold = projects.some((item) => item.organization_id === production.organization_id && item.type === "beheer");
  return {
    ...production,
    customer: org?.name ?? "Onbekende klant",
    order: project?.title ?? "Opdracht",
    website: org?.website ?? null,
    project_type: (project?.type ?? "website") as ProjectType,
    project_status: project?.status ?? "voorbereiding",
    beheer_sold: beheerSold,
    open_changes: openChangeCount(changes.filter((item) => item.production_id === production.id)),
    concept_approved: false,
    final_approved: false,
  };
}

function refreshCardFlags(card: ProductionCard, changes: ChangeRequestRow[], approvals: ApprovalRow[]): ProductionCard {
  const relatedChanges = changes.filter((item) => item.production_id === card.id);
  const relatedApprovals = approvals.filter((item) => item.production_id === card.id);
  const finalApproved = Boolean(latestApproval(relatedApprovals, "final"));
  const checklistDone = card.launch_checks.final_approval || finalApproved
    ? { ...card.launch_checks, final_approval: true }
    : card.launch_checks;
  return {
    ...card,
    open_changes: openChangeCount(relatedChanges),
    concept_approved: Boolean(latestApproval(relatedApprovals, "concept")),
    final_approved: finalApproved,
    next_action:
      card.next_action ||
      defaultNextAction(card.status, {
        onboardingComplete: card.onboarding_complete,
        openChanges: openChangeCount(relatedChanges),
        finalApproved,
        checklistComplete: Boolean(finalApproved) && Object.values(checklistDone).every(Boolean),
      }),
  };
}

async function loadProjects() {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_projects").select("*").order("created_at");
    return (data ?? []) as ProjectRow[];
  }
  return (await readStore()).projects;
}

async function loadProductionRows() {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_productions").select("*").order("updated_at", { ascending: false });
    return ((data ?? []) as Array<ProductionRow & { launch_checks?: unknown }>).map(normalizeProduction);
  }
  return (await readStore()).productions.map(normalizeProduction);
}

async function loadChangeRows() {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_change_requests").select("*").order("created_at", { ascending: false });
    return (data ?? []) as ChangeRequestRow[];
  }
  return (await readStore()).changeRequests;
}

async function loadApprovalRows() {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_approvals").select("*").order("created_at", { ascending: false });
    return (data ?? []) as ApprovalRow[];
  }
  return (await readStore()).approvals;
}

async function insertProduction(fields: ReturnType<typeof seedProductionFields>) {
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_productions").insert(fields);
    if (error) console.error("[kopvast] Productie aanmaken mislukt", error.message);
    return;
  }
  await mutateStore((store) => {
    if (store.productions.some((item) => item.project_id === fields.project_id)) return;
    store.productions.unshift({
      ...fields,
      id: newId(),
      created_at: nowIso(),
      updated_at: nowIso(),
    });
  });
}

export async function ensureProductions() {
  const [projects, productions] = await Promise.all([loadProjects(), loadProductionRows()]);
  const existing = new Set(productions.map((item) => item.project_id));
  for (const project of projects) {
    if (!isDeliveryProject(project.type) || project.status === "opgezegd") continue;
    if (existing.has(project.id)) continue;
    await insertProduction(seedProductionFields(project));
  }
}

export async function loadProductionBoard(): Promise<ProductionBoard> {
  await ensureProductions();
  const [organizations, projects, productions, changes, approvals] = await Promise.all([
    loadOrganizations(),
    loadProjects(),
    loadProductionRows(),
    loadChangeRows(),
    loadApprovalRows(),
  ]);
  const orgMap = new Map(organizations.map((item) => [item.id, item]));
  const projectMap = new Map(projects.map((item) => [item.id, item]));
  const items = productions
    .map((production) =>
      refreshCardFlags(
        toCard(production, orgMap.get(production.organization_id), projectMap.get(production.project_id), projects, changes),
        changes,
        approvals
      )
    )
    .filter((item) => item.project_status !== "opgezegd");
  return {
    columns: productionsByColumn(items),
    live: liveProductions(items),
    items,
  };
}

export async function loadProductionsForOrganization(organizationId: string) {
  const board = await loadProductionBoard();
  return board.items.filter((item) => item.organization_id === organizationId);
}

export async function loadProductionDetail(id: string): Promise<ProductionDetail | null> {
  await ensureProductions();
  const supabase = refreshClient();
  const [organizations, projects, productions, changes, approvals] = await Promise.all([
    loadOrganizations(),
    loadProjects(),
    loadProductionRows(),
    loadChangeRows(),
    loadApprovalRows(),
  ]);
  const production = productions.find((item) => item.id === id);
  if (!production) return null;
  const organization = organizations.find((item) => item.id === production.organization_id);
  const project = projects.find((item) => item.id === production.project_id);
  if (!organization || !project) return null;
  const relatedChanges = changes.filter((item) => item.production_id === id);
  const relatedApprovals = approvals.filter((item) => item.production_id === id);
  const card = refreshCardFlags(toCard(production, organization, project, projects, relatedChanges), relatedChanges, relatedApprovals);
  let activity: ProductionActivityRow[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("kopvast_production_activity")
      .select("*")
      .eq("production_id", id)
      .order("created_at", { ascending: false })
      .limit(40);
    activity = (data ?? []) as ProductionActivityRow[];
  } else {
    activity = (await readStore()).productionActivity
      .filter((item) => item.production_id === id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 40);
  }
  return {
    production: card,
    organization,
    project,
    changes: relatedChanges,
    approvals: relatedApprovals,
    activity,
    conceptApproval: latestApproval(relatedApprovals, "concept"),
    finalApproval: latestApproval(relatedApprovals, "final"),
  };
}

async function writeProduction(id: string, patch: Partial<ProductionRow>) {
  const supabase = refreshClient();
  const next = { ...patch, updated_at: nowIso() };
  if (supabase) {
    const { error } = await supabase.from("kopvast_productions").update(next).eq("id", id);
    if (error) return fail(error.message);
    return { ok: true as const };
  }
  const updated = await mutateStore((store) => {
    const row = store.productions.find((item) => item.id === id);
    if (!row) return false;
    Object.assign(row, next);
    return true;
  });
  return updated ? { ok: true as const } : fail("Productie niet gevonden.");
}

async function logActivity(input: {
  productionId: string;
  organizationId: string;
  eventType: string;
  actorEmail?: string | null;
  detail?: string;
  metadata?: Record<string, unknown>;
}) {
  const row = {
    production_id: input.productionId,
    organization_id: input.organizationId,
    event_type: input.eventType,
    actor_email: input.actorEmail ? normalizeEmail(input.actorEmail) : null,
    detail: input.detail ?? null,
    metadata: input.metadata ?? {},
  };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_production_activity").insert(row);
    if (error) console.error("[kopvast] Productie-activiteit mislukt", error.message);
    return;
  }
  await mutateStore((store) => {
    store.productionActivity.unshift({ ...row, id: newId(), created_at: nowIso() });
  });
}

async function syncProject(production: ProductionRow, status: ProductionStatus) {
  await updateProjectStatus(production.project_id, projectStatusForProduction(status));
  if (status === "live") {
    const supabase = refreshClient();
    const liveAt = nowIso();
    if (supabase) {
      await supabase.from("kopvast_projects").update({ status: "live", live_at: liveAt.slice(0, 10) }).eq("id", production.project_id);
    } else {
      await mutateStore((store) => {
        const project = store.projects.find((item) => item.id === production.project_id);
        if (project) {
          project.status = "live";
          project.live_at = liveAt.slice(0, 10);
        }
      });
    }
  }
}

function nextActionFor(production: ProductionRow, changes: ChangeRequestRow[], approvals: ApprovalRow[]) {
  const finalApproved = Boolean(latestApproval(approvals, "final"));
  return defaultNextAction(production.status, {
    onboardingComplete: production.onboarding_complete,
    openChanges: openChangeCount(changes),
    finalApproved,
    checklistComplete: Object.values({ ...production.launch_checks, final_approval: finalApproved || production.launch_checks.final_approval }).every(Boolean),
  });
}

export async function saveProductionMeta(id: string, input: { scope?: string; dueAt?: string; nextAction?: string; blockers?: string }) {
  const detail = await loadProductionDetail(id);
  if (!detail) return fail("Productie niet gevonden.");
  return writeProduction(id, {
    scope: input.scope?.trim() || null,
    due_at: input.dueAt?.trim() || null,
    next_action: input.nextAction?.trim() || detail.production.next_action,
    blockers: input.blockers?.trim() || null,
  });
}

export async function markOnboardingComplete(id: string, actorEmail: string) {
  const detail = await loadProductionDetail(id);
  if (!detail) return fail("Productie niet gevonden.");
  const result = await writeProduction(id, {
    onboarding_complete: true,
    blockers: detail.production.blockers === "Onboarding incompleet" ? null : detail.production.blockers,
    next_action: defaultNextAction(detail.production.status, { onboardingComplete: true }),
  });
  if (!result.ok) return result;
  await updateOrganization(detail.organization.id, { status: "active", notes: detail.organization.notes ?? undefined });
  await logActivity({
    productionId: id,
    organizationId: detail.organization.id,
    eventType: "onboarding_complete",
    actorEmail,
    detail: "Onboarding afgerond",
  });
  return result;
}

export async function startProduction(id: string, actorEmail: string) {
  const detail = await loadProductionDetail(id);
  if (!detail) return fail("Productie niet gevonden.");
  if (detail.production.status !== "ready_for_production") return fail("Productie is al gestart.");
  const next: ProductionStatus = "in_production";
  const result = await writeProduction(id, {
    status: next,
    next_action: defaultNextAction(next, { onboardingComplete: detail.production.onboarding_complete }),
  });
  if (!result.ok) return result;
  await syncProject(detail.production, next);
  await logActivity({
    productionId: id,
    organizationId: detail.organization.id,
    eventType: "production_started",
    actorEmail,
    detail: "Productie gestart",
  });
  return result;
}

export async function sendToClientReview(id: string, input: { previewUrl?: string; reviewMessage?: string }, actorEmail: string) {
  const parsed = canSendToReview(input);
  if (!parsed.ok) return parsed;
  const detail = await loadProductionDetail(id);
  if (!detail) return fail("Productie niet gevonden.");
  if (!["in_production", "ready_for_production", "changes", "approved"].includes(detail.production.status)) {
    return fail("Stuur naar review vanuit productie of wijzigingen.");
  }
  const next: ProductionStatus = "client_review";
  const result = await writeProduction(id, {
    status: next,
    preview_url: parsed.previewUrl,
    review_message: parsed.reviewMessage,
    next_action: defaultNextAction(next, { onboardingComplete: true }),
  });
  if (!result.ok) return result;
  await syncProject(detail.production, next);
  await logActivity({
    productionId: id,
    organizationId: detail.organization.id,
    eventType: "sent_to_review",
    actorEmail,
    detail: "Naar klantreview gestuurd",
    metadata: { preview_url: parsed.previewUrl },
  });
  return result;
}

export async function resubmitForReview(id: string, actorEmail: string) {
  const detail = await loadProductionDetail(id);
  if (!detail) return fail("Productie niet gevonden.");
  const parsed = canResubmitReview(detail.changes);
  if (!parsed.ok) return parsed;
  if (!detail.production.preview_url || !detail.production.review_message) {
    return fail("Preview-URL en reviewboodschap ontbreken.");
  }
  return sendToClientReview(
    id,
    { previewUrl: detail.production.preview_url, reviewMessage: detail.production.review_message },
    actorEmail
  );
}

export async function createChangeRequest(input: {
  productionId: string;
  organizationId: string;
  email: string;
  pageSection?: string;
  body?: string;
  fileUrl?: string;
}) {
  const parsed = parseChangeRequest(input);
  if (!parsed.ok) return parsed;
  const detail = await loadProductionDetail(input.productionId);
  if (!detail) return fail("Productie niet gevonden.");
  if (detail.organization.id !== input.organizationId) return fail("Geen toegang tot deze opdracht.");
  if (!["client_review", "changes"].includes(detail.production.status)) {
    return fail("Wijzigingen doorgeven kan tijdens de review.");
  }
  const row = {
    production_id: input.productionId,
    organization_id: input.organizationId,
    page_section: parsed.pageSection,
    body: parsed.body,
    file_url: parsed.fileUrl,
    file_name: parsed.fileUrl ? parsed.fileUrl.split("/").pop() ?? null : null,
    status: "OPEN" as const,
    created_by_email: normalizeEmail(input.email),
  };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_change_requests").insert(row);
    if (error) return fail("Wijziging opslaan is tijdelijk niet beschikbaar.");
  } else {
    await mutateStore((store) => {
      store.changeRequests.unshift({ ...row, id: newId(), created_at: nowIso(), updated_at: nowIso() });
    });
  }
  await writeProduction(input.productionId, {
    status: "changes",
    next_action: defaultNextAction("changes", { onboardingComplete: true, openChanges: 1 }),
  });
  await syncProject(detail.production, "changes");
  await logActivity({
    productionId: input.productionId,
    organizationId: input.organizationId,
    eventType: "change_requested",
    actorEmail: input.email,
    detail: parsed.pageSection,
  });
  return { ok: true as const };
}

export async function updateChangeRequestStatus(id: string, status: string, actorEmail: string) {
  if (!isChangeRequestStatus(status)) return fail("Onbekende status.");
  const supabase = refreshClient();
  let productionId: string | null = null;
  if (supabase) {
    const { data, error } = await supabase
      .from("kopvast_change_requests")
      .update({ status, updated_at: nowIso() })
      .eq("id", id)
      .select("production_id")
      .maybeSingle();
    if (error || !data) return fail(error?.message ?? "Wijziging niet gevonden.");
    productionId = data.production_id as string;
  } else {
    productionId = await mutateStore((store) => {
      const row = store.changeRequests.find((item) => item.id === id);
      if (!row) return null;
      row.status = status as ChangeRequestStatus;
      row.updated_at = nowIso();
      return row.production_id;
    });
    if (!productionId) return fail("Wijziging niet gevonden.");
  }
  const detail = await loadProductionDetail(productionId);
  if (detail) {
    await writeProduction(productionId, {
      next_action: nextActionFor(detail.production, detail.changes, detail.approvals),
    });
    await logActivity({
      productionId,
      organizationId: detail.organization.id,
      eventType: "change_status",
      actorEmail,
      detail: status,
    });
  }
  return { ok: true as const, productionId };
}

export async function recordApproval(input: {
  productionId: string;
  organizationId: string;
  kind: ApprovalKind;
  name?: string;
  email: string;
}) {
  const parsed = parseApproval({ name: input.name, email: input.email });
  if (!parsed.ok) return parsed;
  const detail = await loadProductionDetail(input.productionId);
  if (!detail) return fail("Productie niet gevonden.");
  if (detail.organization.id !== input.organizationId) return fail("Geen toegang tot deze opdracht.");
  if (input.kind === "concept" && detail.production.status !== "client_review") {
    return fail("Er staat geen concept ter review.");
  }
  if (input.kind === "final" && !["approved", "ready_to_launch"].includes(detail.production.status)) {
    return fail("Geef eerst akkoord op het concept.");
  }
  const snapshot = approvalSnapshot(detail.production);
  const row = {
    production_id: input.productionId,
    organization_id: input.organizationId,
    kind: input.kind,
    name: parsed.name,
    email: parsed.email,
    snapshot,
  };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_approvals").insert(row);
    if (error) return fail("Akkoord opslaan is tijdelijk niet beschikbaar.");
  } else {
    await mutateStore((store) => {
      store.approvals.unshift({ ...row, id: newId(), created_at: nowIso() });
    });
  }

  if (input.kind === "concept") {
    await writeProduction(input.productionId, {
      status: "approved",
      next_action: defaultNextAction("approved", { onboardingComplete: true, finalApproved: false }),
    });
    await syncProject(detail.production, "approved");
  } else {
    const checks = { ...detail.production.launch_checks, final_approval: true };
    const next = Object.values(checks).every(Boolean) ? "ready_to_launch" : "approved";
    await writeProduction(input.productionId, {
      status: next,
      launch_checks: checks,
      next_action: defaultNextAction(next, { onboardingComplete: true, finalApproved: true, checklistComplete: next === "ready_to_launch" }),
    });
    await syncProject(detail.production, next);
  }
  await logActivity({
    productionId: input.productionId,
    organizationId: input.organizationId,
    eventType: input.kind === "final" ? "final_approved" : "concept_approved",
    actorEmail: parsed.email,
    detail: `${parsed.name} gaf ${input.kind === "final" ? "definitief akkoord" : "akkoord op het concept"}`,
    metadata: snapshot,
  });
  return { ok: true as const };
}

export async function saveLaunchCheck(id: string, key: string, checked: boolean, actorEmail: string) {
  const detail = await loadProductionDetail(id);
  if (!detail) return fail("Productie niet gevonden.");
  if (!(key in emptyLaunchChecks())) return fail("Onbekend checklist-item.");
  const checks: LaunchChecks = {
    ...detail.production.launch_checks,
    [key]: checked,
    final_approval: Boolean(detail.finalApproval) || (key === "final_approval" ? checked : detail.production.launch_checks.final_approval),
  };
  if (detail.finalApproval) checks.final_approval = true;
  const nextStatus = Object.values(checks).every(Boolean) && detail.finalApproval
    ? "ready_to_launch"
    : detail.production.status === "ready_to_launch"
      ? "approved"
      : detail.production.status;
  const result = await writeProduction(id, {
    launch_checks: checks,
    status: nextStatus,
    next_action: defaultNextAction(nextStatus, {
      onboardingComplete: true,
      finalApproved: Boolean(detail.finalApproval),
      checklistComplete: Object.values(checks).every(Boolean),
    }),
  });
  if (!result.ok) return result;
  if (nextStatus !== detail.production.status) await syncProject(detail.production, nextStatus);
  await logActivity({
    productionId: id,
    organizationId: detail.organization.id,
    eventType: "launch_check",
    actorEmail,
    detail: `${key}: ${checked ? "ja" : "nee"}`,
  });
  return result;
}

export async function markProductionLive(id: string, actorEmail: string) {
  const detail = await loadProductionDetail(id);
  if (!detail) return fail("Productie niet gevonden.");
  const allowed = canMarkLive({
    status: detail.production.status,
    finalApproved: Boolean(detail.finalApproval),
    checks: { ...detail.production.launch_checks, final_approval: true },
  });
  if (!allowed.ok) return allowed;
  const liveAt = nowIso();
  const result = await writeProduction(id, {
    status: "live",
    live_at: liveAt,
    launch_checks: { ...detail.production.launch_checks, final_approval: true },
    next_action: defaultNextAction("live", { onboardingComplete: true, finalApproved: true, checklistComplete: true }),
    blockers: null,
  });
  if (!result.ok) return result;
  await syncProject(detail.production, "live");
  await updateOrganization(detail.organization.id, { status: "active", notes: detail.organization.notes ?? undefined });
  if (detail.production.beheer_sold) await activateBeheer(detail.organization.id, liveAt);
  await logActivity({
    productionId: id,
    organizationId: detail.organization.id,
    eventType: "marked_live",
    actorEmail,
    detail: "Website live gezet",
    metadata: { live_at: liveAt, beheer: detail.production.beheer_sold },
  });
  return { ok: true as const, liveAt };
}

async function activateBeheer(organizationId: string, liveAt: string) {
  const supabase = refreshClient();
  if (supabase) {
    await supabase
      .from("kopvast_projects")
      .update({ status: "live", live_at: liveAt.slice(0, 10) })
      .eq("organization_id", organizationId)
      .eq("type", "beheer");
    return;
  }
  await mutateStore((store) => {
    for (const project of store.projects) {
      if (project.organization_id === organizationId && project.type === "beheer") {
        project.status = "live";
        project.live_at = liveAt.slice(0, 10);
      }
    }
  });
}

export async function productionNotifications() {
  const board = await loadProductionBoard();
  return board.items
    .filter((item) => item.status !== "live" && item.status !== "client_review")
    .slice(0, 6)
    .map((item) => ({
      id: `prod-${item.id}`,
      title: item.next_action || item.order,
      detail: `${item.customer}${item.blockers ? ` · ${item.blockers}` : ""}`,
      href: `/admin/productie/${item.id}`,
      status: item.status === "ready_to_launch" || item.status === "changes" ? "Actie nodig" : "Productie",
    }));
}
