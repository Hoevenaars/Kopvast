import {
  isRequestType,
  workspaceRoutes,
  type RequestType,
} from "@/lib/product";
import { formatPrice, isRecurringServiceType, recurringAmountForProjectType } from "@/lib/products";
import { products } from "@/lib/site";

export const BEHEER_CHECK_DAYS = 30;
export const OPEN_REQUEST_STATUSES = ["nieuw", "in_behandeling", "wacht_op_klant"] as const;
export const POST_LAUNCH_TYPES = ["post_launch", "wijziging", "content"] as const;

export type CatalogOrganization = {
  id: string;
  name: string;
  website: string | null;
};

export type CatalogProject = {
  id: string;
  organization_id: string;
  type: string;
  title: string;
  status: string;
  price_label: string | null;
  started_at: string | null;
  live_at: string | null;
  summary: string | null;
  primary_domain: string | null;
  preview_url: string | null;
  production_url: string | null;
  monthly_amount: number | null;
  included_note: string | null;
  last_checked_at: string | null;
  technical_note: string | null;
};

export type CatalogRequest = {
  id: string;
  organization_id: string;
  project_id: string | null;
  created_by_email: string | null;
  type: string;
  title: string;
  body: string;
  status: string;
  classification: string | null;
  file_name: string | null;
  file_url: string | null;
  created_at: string;
  updated_at: string;
};

export type HealthState = {
  label: string;
  needsAction: boolean;
};

export type WebsiteRecord = {
  id: string;
  organizationId: string;
  customerName: string;
  domain: string;
  status: string;
  liveAt: string | null;
  beheerActive: boolean;
  beheerId: string | null;
  beheerStatus: string | null;
  openSupport: number;
  health: HealthState;
  previewUrl: string | null;
  productionUrl: string | null;
  priceLabel: string | null;
  title: string;
  summary: string | null;
  technicalNote: string | null;
};

export type BeheerRecord = {
  id: string;
  websiteId: string | null;
  organizationId: string;
  customerName: string;
  domain: string;
  productType: string;
  productName: string;
  startedAt: string | null;
  monthlyAmount: number;
  status: string;
  includedNote: string | null;
  lastCheckedAt: string | null;
  openSupport: number;
  openChanges: number;
  needsAction: boolean;
  healthLabel: string;
};

export type SupportRecord = {
  id: string;
  organizationId: string;
  customerName: string;
  domain: string | null;
  projectId: string | null;
  type: string;
  title: string;
  body: string;
  status: string;
  classification: string | null;
  fileName: string | null;
  fileUrl: string | null;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string | null;
  postLaunch: boolean;
};

export type OpenSupportAction = {
  title: string;
  company: string;
  status: string;
  age: string;
  href: string;
};

export function domainFromWebsite(value: string | null | undefined) {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    return url.hostname.replace(/^www\./i, "") || null;
  } catch {
    const host = raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
    return host || null;
  }
}

export function productionUrlFromWebsite(value: string | null | undefined) {
  const raw = value?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const domain = domainFromWebsite(raw);
  return domain ? `https://${domain}` : null;
}

export function parseEuroAmount(label: string | null | undefined) {
  if (!label) return null;
  const match = label.replace(/\s/g, "").match(/€([\d.,]+)/);
  if (!match) return null;
  const raw = match[1];
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw.replace(/\./g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

export function defaultBeheerAmount() {
  return recurringAmountForProjectType("beheer") ?? parseEuroAmount(products.beheer.price) ?? 199;
}

export function isWebsiteProject(project: Pick<CatalogProject, "type">) {
  return project.type === "website" || project.type === "maatwerk";
}

export function isBeheerProject(project: Pick<CatalogProject, "type">) {
  return project.type === "beheer";
}

export function isBeheerActive(project: Pick<CatalogProject, "type" | "status">) {
  return isBeheerProject(project) && project.status === "live";
}

export function isOpenRequest(status: string) {
  return (OPEN_REQUEST_STATUSES as readonly string[]).includes(status);
}

export function isPostLaunchRequest(type: string) {
  return type === "post_launch";
}

export function monthlyAmountFor(project: Pick<CatalogProject, "type" | "monthly_amount" | "price_label">) {
  if (project.monthly_amount != null && Number.isFinite(Number(project.monthly_amount))) {
    return Number(project.monthly_amount);
  }
  if (!isRecurringServiceType(project.type)) return 0;
  return parseEuroAmount(project.price_label) ?? recurringAmountForProjectType(project.type) ?? 0;
}

export function recurringStatusLabel(status: string) {
  if (status === "live") return "Actief";
  if (status === "gepauzeerd") return "Gepauzeerd";
  if (status === "opgezegd") return "Opgezegd";
  return "In afwachting";
}

export function formatEuro(amount: number) {
  return formatPrice(amount);
}

export function formatDateNl(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("nl-NL");
}

export function ageShort(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const hours = Math.max(0, Math.round((now - then) / 3_600_000));
  if (hours < 24) return `${hours}u`;
  return `${Math.round(hours / 24)}d`;
}

export function todayDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function checkIsStale(lastCheckedAt: string | null | undefined, now = new Date()) {
  if (!lastCheckedAt) return true;
  const checked = new Date(lastCheckedAt);
  if (Number.isNaN(checked.getTime())) return true;
  const elapsed = now.getTime() - checked.getTime();
  return elapsed > BEHEER_CHECK_DAYS * 24 * 60 * 60 * 1000;
}

export function resolveRequestType(input: {
  type?: string;
  websiteIsLive?: boolean;
  source?: "support" | "wijziging";
}): RequestType {
  if (input.source === "support") {
    return input.websiteIsLive ? "post_launch" : "vraag";
  }
  const raw = input.type ?? "wijziging";
  const type = isRequestType(raw) ? raw : "wijziging";
  if (type === "wijziging" && input.websiteIsLive) return "post_launch";
  return type;
}

export function websiteHealth(input: {
  status: string;
  openSupport: number;
  beheerActive: boolean;
  lastCheckedAt: string | null;
  now?: Date;
}): HealthState {
  if (input.openSupport > 0) {
    return { label: "Open support", needsAction: true };
  }
  if (input.status === "live" && input.beheerActive && checkIsStale(input.lastCheckedAt, input.now)) {
    return { label: "Check nodig", needsAction: true };
  }
  if (input.status === "gepauzeerd") {
    return { label: "Gepauzeerd", needsAction: true };
  }
  if (input.status !== "live" && input.status !== "opgezegd") {
    return { label: "Nog niet live", needsAction: false };
  }
  return { label: "In orde", needsAction: false };
}

export function displayDomain(project: CatalogProject, organization?: CatalogOrganization | null) {
  return (
    project.primary_domain ||
    domainFromWebsite(project.production_url) ||
    domainFromWebsite(organization?.website) ||
    "—"
  );
}

function requestsForOrg(requests: CatalogRequest[], organizationId: string) {
  return requests.filter((item) => item.organization_id === organizationId);
}

export function buildWebsiteCatalog(
  organizations: CatalogOrganization[],
  projects: CatalogProject[],
  requests: CatalogRequest[],
  now = new Date()
): WebsiteRecord[] {
  const orgs = new Map(organizations.map((item) => [item.id, item]));
  return projects
    .filter(isWebsiteProject)
    .map((project) => {
      const organization = orgs.get(project.organization_id);
      const beheer = projects.find(
        (item) => item.organization_id === project.organization_id && isBeheerProject(item)
      );
      const openSupport = requestsForOrg(requests, project.organization_id).filter((item) =>
        isOpenRequest(item.status)
      ).length;
      const beheerActive = beheer ? isBeheerActive(beheer) : false;
      return {
        id: project.id,
        organizationId: project.organization_id,
        customerName: organization?.name ?? "Onbekende klant",
        domain: displayDomain(project, organization),
        status: project.status,
        liveAt: project.live_at,
        beheerActive,
        beheerId: beheer?.id ?? null,
        beheerStatus: beheer?.status ?? null,
        openSupport,
        health: websiteHealth({
          status: project.status,
          openSupport,
          beheerActive,
          lastCheckedAt: beheer?.last_checked_at ?? null,
          now,
        }),
        previewUrl: project.preview_url,
        productionUrl: project.production_url || productionUrlFromWebsite(organization?.website),
        priceLabel: project.price_label,
        title: project.title,
        summary: project.summary,
        technicalNote: project.technical_note,
      };
    })
    .sort((a, b) => a.customerName.localeCompare(b.customerName, "nl"));
}

export function buildBeheerCatalog(
  organizations: CatalogOrganization[],
  projects: CatalogProject[],
  requests: CatalogRequest[],
  now = new Date()
): BeheerRecord[] {
  const websites = buildWebsiteCatalog(organizations, projects, requests, now);
  const orgs = new Map(organizations.map((item) => [item.id, item]));
  return projects.filter((project) => isRecurringServiceType(project.type)).map((project) => {
    const organization = orgs.get(project.organization_id);
    const website = websites.find((item) => item.organizationId === project.organization_id) ?? null;
    const orgRequests = requestsForOrg(requests, project.organization_id);
    const openSupport = orgRequests.filter((item) => isOpenRequest(item.status)).length;
    const openChanges = orgRequests.filter(
      (item) => isOpenRequest(item.status) && (POST_LAUNCH_TYPES as readonly string[]).includes(item.type)
    ).length;
    const health = websiteHealth({
      status: project.status === "live" ? website?.status ?? "live" : project.status,
      openSupport,
      beheerActive: project.status === "live" && isRecurringServiceType(project.type),
      lastCheckedAt: project.last_checked_at,
      now,
    });
    return {
      id: project.id,
      websiteId: website?.id ?? null,
      organizationId: project.organization_id,
      customerName: organization?.name ?? "Onbekende klant",
      domain: website?.domain ?? displayDomain(project, organization),
      productType: project.type,
      productName: project.title,
      startedAt: project.started_at,
      monthlyAmount: monthlyAmountFor(project),
      status: project.status,
      includedNote: project.included_note,
      lastCheckedAt: project.last_checked_at,
      openSupport,
      openChanges,
      needsAction: health.needsAction,
      healthLabel: health.label,
    };
  });
}

export function beheerSummary(records: BeheerRecord[]) {
  const managed = records.filter((item) => item.status === "live");
  const mrr = managed.reduce((sum, item) => sum + item.monthlyAmount, 0);
  const needsAction = managed.filter((item) => item.needsAction);
  const healthy = managed.filter((item) => !item.needsAction);
  const count = (type: string) => managed.filter((item) => item.productType === type).length;
  return {
    managedCount: managed.length,
    hostingCount: count("hosting"),
    hostingPlusCount: count("hosting_plus"),
    beheerCount: count("beheer"),
    mrr,
    needsActionCount: needsAction.length,
    healthyCount: healthy.length,
    needsAction,
    healthy,
  };
}

export function buildSupportInbox(
  organizations: CatalogOrganization[],
  projects: CatalogProject[],
  requests: CatalogRequest[]
): SupportRecord[] {
  const orgs = new Map(organizations.map((item) => [item.id, item]));
  const websites = projects.filter(isWebsiteProject);
  return [...requests]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((request) => {
      const organization = orgs.get(request.organization_id);
      const website =
        websites.find((item) => item.id === request.project_id) ??
        websites.find((item) => item.organization_id === request.organization_id);
      return {
        id: request.id,
        organizationId: request.organization_id,
        customerName: organization?.name ?? "Onbekende klant",
        domain: website ? displayDomain(website, organization) : domainFromWebsite(organization?.website),
        projectId: request.project_id,
        type: request.type,
        title: request.title,
        body: request.body,
        status: request.status,
        classification: request.classification,
        fileName: request.file_name,
        fileUrl: request.file_url,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
        createdByEmail: request.created_by_email,
        postLaunch: isPostLaunchRequest(request.type),
      };
    });
}

export function openSupportActions(inbox: SupportRecord[], now = Date.now()): OpenSupportAction[] {
  return inbox
    .filter((item) => isOpenRequest(item.status))
    .map((item) => ({
      title: item.title,
      company: item.customerName,
      status: "Open support",
      age: ageShort(item.createdAt, now),
      href: workspaceRoutes.adminSupport,
    }));
}

export function customerWebsiteOptions(projects: CatalogProject[], organization: CatalogOrganization | null) {
  return projects.filter(isWebsiteProject).map((project) => ({
    id: project.id,
    label: displayDomain(project, organization),
    live: project.status === "live",
  }));
}

export function hasLiveWebsite(projects: CatalogProject[]) {
  return projects.some((project) => isWebsiteProject(project) && project.status === "live");
}
