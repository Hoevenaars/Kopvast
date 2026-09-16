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
  admin: "/admin",
  adminTaken: "/admin/taken",
  adminProspects: "/admin/prospects",
  adminAcquisition: "/admin/acquisitie",
  adminAcquisitionNew: "/admin/acquisitie/nieuw",
  adminLeads: "/admin/leads",
  adminCustomers: "/admin/klanten",
  adminOrders: "/admin/opdrachten",
  adminUsers: "/admin/gebruikers",
  adminMail: "/admin/mails",
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
  { value: "opgezegd", label: "Opgezegd" },
] as const;

export const requestTypes = [
  { value: "wijziging", label: "Kleine wijziging" },
  { value: "vraag", label: "Vraag" },
  { value: "content", label: "Content of tekst" },
] as const;

export const requestStatuses = [
  { value: "nieuw", label: "Nieuw" },
  { value: "in_behandeling", label: "In behandeling" },
  { value: "wacht_op_klant", label: "Wacht op klant" },
  { value: "klaar", label: "Klaar" },
  { value: "afgewezen", label: "Afgewezen" },
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
  { value: "MAATWERK_REVIEW", label: "Maatwerk" },
  { value: "IN_GESPREK", label: "In gesprek" },
  { value: "GEWONNEN", label: "Gewonnen" },
  { value: "OMGEZET", label: "Klant" },
  { value: "AFGEWEZEN", label: "Afgewezen" },
] as const;

export type OrganizationStatus = (typeof organizationStatuses)[number]["value"];
export type ProjectType = (typeof projectTypes)[number]["value"];
export type ProjectStatus = (typeof projectStatuses)[number]["value"];
export type RequestType = (typeof requestTypes)[number]["value"];
export type RequestStatus = (typeof requestStatuses)[number]["value"];
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
