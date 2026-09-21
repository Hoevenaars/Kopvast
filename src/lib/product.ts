/** Kopvast-productarchitectuur: vier lagen, één merk. */

export const layers = {
  site: {
    id: "site",
    name: "Publieke website",
    path: "/",
    role: "Bezoekers en leads. Pakketten, websitecheck, aanvraag.",
  },
  acquire: {
    id: "acquire",
    name: "Website Refresh",
    path: null,
    role: "Interne acquisitie. Prospects, scans, scores. Geen klanttoegang.",
  },
  console: {
    id: "console",
    name: "Mijn Kopvast",
    path: "/klant",
    role: "Klanten zien website, merk, wijzigingen en support.",
  },
  admin: {
    id: "admin",
    name: "Adminconsole",
    path: "/admin",
    role: "Kopvast ziet aanvragen, klanten, mail en zet leads om.",
  },
} as const;

export const workspaceRoutes = {
  login: "/inloggen",
  verify: "/inloggen/verify",
  loginForgot: "/inloggen/wachtwoord",
  loginReset: "/inloggen/wachtwoord/nieuw",
  consoleSettings: "/klant/instellingen",
  adminSettings: "/admin/instellingen",
  console: "/klant",
  consoleWebsite: "/klant/website",
  consoleFiles: "/klant/media",
  consoleRequests: "/klant/wijzigingen",
  consoleInvoices: "/klant/facturen",
  consoleApprovals: "/klant/goedkeuringen",
  consoleSupport: "/klant/support",
  admin: "/admin",
  adminTaken: "/admin/taken",
  adminProspects: "/admin/prospects",
  adminAcquisition: "/admin/acquisitie",
  adminAcquisitionNew: "/admin/acquisitie/nieuw",
  adminScout: "/admin/scout",
  adminAanvragen: "/admin/aanvragen",
  adminAanvragenNew: "/admin/aanvragen/nieuw",
  adminVoorstellen: "/admin/voorstellen",
  adminProposals: "/admin/voorstellen",
  adminProposalsNew: "/admin/voorstellen/nieuw",
  adminLeads: "/admin/aanvragen",
  adminCustomers: "/admin/klanten",
  adminInvoices: "/admin/facturatie",
  adminProductie: "/admin/productie",
  adminOnboarding: "/admin/onboarding",
  adminOrders: "/admin/opdrachten",
  adminUsers: "/admin/gebruikers",
  adminWebsites: "/admin/websites",
  adminBeheer: "/admin/beheer",
  adminSupport: "/admin/support",
  adminMail: "/admin/mails",
  consoleOnboarding: "/klant/onboarding",
} as const;

export const organizationStatuses = [
  { value: "lead", label: "Lead" },
  { value: "onboarding", label: "Onboarding" },
  { value: "active", label: "Actief" },
  { value: "paused", label: "Gepauzeerd" },
  { value: "ended", label: "Afgerond" },
] as const;

export const projectTypes = [
  { value: "website", label: "Kopvast Website" },
  { value: "beheer", label: "Kopvast Beheer" },
  { value: "merkrefresh", label: "Merkrefresh" },
  { value: "sjablonen", label: "Sjablonenpakket" },
  { value: "maatwerk", label: "Maatwerk" },
] as const;

export const projectStatuses = [
  { value: "voorbereiding", label: "Voorbereiding" },
  { value: "in_uitvoering", label: "In uitvoering" },
  { value: "wacht_op_klant", label: "Wacht op jou" },
  { value: "opgeleverd", label: "Opgeleverd" },
  { value: "live", label: "Live" },
  { value: "gepauzeerd", label: "Gepauzeerd" },
  { value: "opgezegd", label: "Opgezegd" },
] as const;

export const beheerStatuses = [
  { value: "live", label: "Actief" },
  { value: "gepauzeerd", label: "Gepauzeerd" },
  { value: "opgezegd", label: "Opgezegd" },
] as const;

export const requestTypes = [
  { value: "wijziging", label: "Kleine wijziging" },
  { value: "vraag", label: "Vraag" },
  { value: "content", label: "Content of tekst" },
  { value: "post_launch", label: "Wijziging na livegang" },
] as const;

export const customerRequestTypes = requestTypes.filter((item) => item.value !== "post_launch");

export const requestStatuses = [
  { value: "nieuw", label: "Open" },
  { value: "in_behandeling", label: "In behandeling" },
  { value: "wacht_op_klant", label: "Wacht op klant" },
  { value: "klaar", label: "Opgelost" },
  { value: "gesloten", label: "Gesloten" },
  { value: "afgewezen", label: "Afgewezen" },
] as const;

export const requestClassifications = [
  { value: "inbegrepen", label: "Inbegrepen wijziging" },
  { value: "extra_werk", label: "Extra werk / maatwerk" },
  { value: "offerte_nodig", label: "Extra offerte nodig" },
] as const;

export const assetKinds = [
  { value: "logo", label: "Logo" },
  { value: "huisstijl", label: "Huisstijl" },
  { value: "foto", label: "Fotografie" },
  { value: "tekst", label: "Tekst" },
  { value: "bestand", label: "Bestand" },
  { value: "link", label: "Link" },
] as const;

export const leadStatuses = [
  { value: "NIEUW", label: "Nieuw" },
  { value: "MAATWERK_REVIEW", label: "Review nodig" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "PROPOSAL_NEEDED", label: "Voorstel nodig" },
  { value: "IN_GESPREK", label: "In gesprek" },
  { value: "GEWONNEN", label: "Gewonnen" },
  { value: "VERLOREN", label: "Verloren" },
  { value: "OMGEZET", label: "Klant" },
  { value: "AFGEWEZEN", label: "Verloren" },
] as const;

export type OrganizationStatus = (typeof organizationStatuses)[number]["value"];
export type ProjectType = (typeof projectTypes)[number]["value"];
export type ProjectStatus = (typeof projectStatuses)[number]["value"];
export type BeheerStatus = (typeof beheerStatuses)[number]["value"];
export type RequestType = (typeof requestTypes)[number]["value"];
export type RequestStatus = (typeof requestStatuses)[number]["value"];
export type RequestClassification = (typeof requestClassifications)[number]["value"];
export type AssetKind = (typeof assetKinds)[number]["value"];
export type LeadStatus = (typeof leadStatuses)[number]["value"];

export function labelFor<T extends { value: string; label: string }>(
  items: readonly T[],
  value: string | null | undefined
) {
  return items.find((item) => item.value === value)?.label ?? value ?? "—";
}

export function isRequestType(value: string): value is RequestType {
  return requestTypes.some((item) => item.value === value);
}

export function isRequestStatus(value: string): value is RequestStatus {
  return requestStatuses.some((item) => item.value === value);
}

export function isRequestClassification(value: string): value is RequestClassification {
  return requestClassifications.some((item) => item.value === value);
}

export function isBeheerStatus(value: string): value is BeheerStatus {
  return beheerStatuses.some((item) => item.value === value);
}

export function isProjectType(value: string): value is ProjectType {
  return projectTypes.some((item) => item.value === value);
}

export function isProjectStatus(value: string): value is ProjectStatus {
  return projectStatuses.some((item) => item.value === value);
}

export function isOrganizationStatus(value: string): value is OrganizationStatus {
  return organizationStatuses.some((item) => item.value === value);
}

export function isLeadStatus(value: string): value is LeadStatus {
  return leadStatuses.some((item) => item.value === value);
}

export function isAssetKind(value: string): value is AssetKind {
  return assetKinds.some((item) => item.value === value);
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function defaultAdminEmails() {
  const fromEnv = (process.env.KOPVAST_ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => normalizeEmail(item))
    .filter(Boolean);
  return fromEnv.length ? fromEnv : ["contact@kopvast.nl"];
}

export function isAdminEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (defaultAdminEmails().includes(normalized)) return true;
  return normalized.endsWith("@kopvast.nl");
}

export function memberHasAccess(member: { access_enabled?: boolean | null } | null) {
  if (!member) return false;
  return member.access_enabled !== false;
}

export function destinationForRole(role: "admin" | "customer") {
  return role === "admin" ? workspaceRoutes.admin : workspaceRoutes.console;
}

export function customerOnboardingLoginPath() {
  return `${workspaceRoutes.login}?next=${workspaceRoutes.consoleOnboarding}`;
}

export function customerPortalAfterPublicAccept(input: {
  currentRole?: "admin" | "customer" | null;
  organizationId?: string | null;
  member: { organization_id: string; access_enabled?: boolean | null } | null;
}): { createSession: boolean; destination: string | null } {
  if (input.currentRole === "admin") {
    return { createSession: false, destination: null };
  }
  if (
    input.organizationId &&
    memberHasAccess(input.member) &&
    input.member?.organization_id === input.organizationId
  ) {
    return { createSession: true, destination: workspaceRoutes.consoleOnboarding };
  }
  return { createSession: false, destination: customerOnboardingLoginPath() };
}
