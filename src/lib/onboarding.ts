/** Onboarding na akkoord: checklist, bestanden en ready-gate per opdracht. */

export const ONBOARDING_BUCKET = "kopvast-onboarding";
export const ONBOARDING_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ONBOARDING_MAX_FILES_PER_ITEM = 12;

export const ONBOARDING_ALLOWED_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const ONBOARDING_STATUSES = [
  { value: "open", label: "Open" },
  { value: "ready", label: "Klaar" },
] as const;

export const ONBOARDING_ITEM_STATUSES = [
  { value: "missing", label: "Ontbreekt" },
  { value: "received", label: "Ontvangen" },
  { value: "not_required", label: "Niet van toepassing" },
  { value: "approved", label: "Goedgekeurd" },
  { value: "rejected", label: "Aanpassen" },
] as const;

export const ONBOARDING_ITEM_TYPES = [
  { value: "text", label: "Korte tekst" },
  { value: "textarea", label: "Tekst" },
  { value: "url", label: "Link" },
  { value: "file", label: "Bestand" },
  { value: "files", label: "Bestanden" },
] as const;

export const ONBOARDING_SECTIONS = [
  { id: "bedrijf", label: "Bedrijf" },
  { id: "merk", label: "Merk" },
  { id: "content", label: "Content" },
  { id: "techniek", label: "Techniek" },
  { id: "inspiratie", label: "Inspiratie" },
  { id: "maatwerk", label: "Maatwerk" },
] as const;

export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number]["value"];
export type OnboardingItemStatus = (typeof ONBOARDING_ITEM_STATUSES)[number]["value"];
export type OnboardingItemType = (typeof ONBOARDING_ITEM_TYPES)[number]["value"];
export type OnboardingSectionId = (typeof ONBOARDING_SECTIONS)[number]["id"];

export type OnboardingRow = {
  id: string;
  organization_id: string;
  project_id: string;
  status: OnboardingStatus;
  ready_at: string | null;
  override_reason: string | null;
  overridden_by: string | null;
  overridden_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OnboardingItemRow = {
  id: string;
  onboarding_id: string;
  section: OnboardingSectionId;
  key: string;
  title: string;
  help_text: string | null;
  item_type: OnboardingItemType;
  required: boolean;
  custom: boolean;
  status: OnboardingItemStatus;
  value_text: string | null;
  note: string | null;
  admin_note: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type OnboardingFileRow = {
  id: string;
  onboarding_id: string;
  item_id: string;
  organization_id: string;
  project_id: string;
  storage_key: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
};

export type OnboardingTemplateItem = {
  section: OnboardingSectionId;
  key: string;
  title: string;
  help_text: string;
  item_type: OnboardingItemType;
  required: boolean;
};

export const DEFAULT_ONBOARDING_ITEMS: OnboardingTemplateItem[] = [
  {
    section: "bedrijf",
    key: "officiele_naam",
    title: "Officiële naam",
    help_text: "De naam zoals die op de site en in de footer moet staan.",
    item_type: "text",
    required: true,
  },
  {
    section: "bedrijf",
    key: "contact",
    title: "Contactgegevens",
    help_text: "Naam, e-mail en telefoon van de vaste contactpersoon.",
    item_type: "textarea",
    required: true,
  },
  {
    section: "bedrijf",
    key: "adres",
    title: "Adres",
    help_text: "Bezoek- of postadres voor colofon en footer.",
    item_type: "textarea",
    required: true,
  },
  {
    section: "bedrijf",
    key: "kvk",
    title: "KVK",
    help_text: "Optioneel. Alleen het nummer, geen inlog.",
    item_type: "text",
    required: false,
  },
  {
    section: "bedrijf",
    key: "btw",
    title: "BTW",
    help_text: "Optioneel. Alleen het nummer.",
    item_type: "text",
    required: false,
  },
  {
    section: "merk",
    key: "logo",
    title: "Logo",
    help_text: "Lever een scherp bestand. SVG, PNG of PDF mag.",
    item_type: "file",
    required: true,
  },
  {
    section: "merk",
    key: "kleuren",
    title: "Kleuren",
    help_text: "Huiskleuren, hex of omschrijving. Geen wachtwoorden.",
    item_type: "textarea",
    required: true,
  },
  {
    section: "merk",
    key: "huisstijl",
    title: "Huisstijl",
    help_text: "Handboek, templates of extra merkmateriaal.",
    item_type: "files",
    required: false,
  },
  {
    section: "merk",
    key: "fonts",
    title: "Fonts",
    help_text: "Namen van lettertypes. Lever geen gelicentieerde fontbestanden met geheime keys.",
    item_type: "textarea",
    required: false,
  },
  {
    section: "merk",
    key: "tone",
    title: "Tone of voice",
    help_text: "Hoe jullie klinken. Wat wel, wat niet.",
    item_type: "textarea",
    required: true,
  },
  {
    section: "content",
    key: "paginas",
    title: "Pagina's",
    help_text: "Welke pagina's de site moet hebben.",
    item_type: "textarea",
    required: true,
  },
  {
    section: "content",
    key: "teksten",
    title: "Teksten",
    help_text: "Aanleveren per pagina, of als bijlage.",
    item_type: "textarea",
    required: true,
  },
  {
    section: "content",
    key: "fotos",
    title: "Foto's",
    help_text: "Echte beelden. Geen stock als jullie dat niet willen.",
    item_type: "files",
    required: true,
  },
  {
    section: "content",
    key: "team",
    title: "Team",
    help_text: "Namen, rollen en foto's van mensen die op de site komen.",
    item_type: "textarea",
    required: false,
  },
  {
    section: "content",
    key: "testimonials",
    title: "Echte testimonials",
    help_text: "Alleen quotes die jullie mogen gebruiken.",
    item_type: "textarea",
    required: false,
  },
  {
    section: "content",
    key: "cta",
    title: "CTA en contactdata",
    help_text: "Wat bezoekers moeten doen, plus het juiste telefoonnummer en e-mailadres.",
    item_type: "textarea",
    required: true,
  },
  {
    section: "techniek",
    key: "domein",
    title: "Domein",
    help_text: "Het gewenste of bestaande domein.",
    item_type: "text",
    required: true,
  },
  {
    section: "techniek",
    key: "hosting",
    title: "Hosting",
    help_text: "Waar de site nu staat, als die er al is.",
    item_type: "text",
    required: false,
  },
  {
    section: "techniek",
    key: "dns",
    title: "DNS",
    help_text: "Wie het domein beheert en of wij records mogen zetten.",
    item_type: "textarea",
    required: true,
  },
  {
    section: "techniek",
    key: "analytics",
    title: "Analytics",
    help_text: "Alleen een meet-ID zoals G-XXXX. Geen accountsleutels.",
    item_type: "text",
    required: false,
  },
  {
    section: "techniek",
    key: "formulieren",
    title: "Formulieren",
    help_text: "Welke formulieren je nodig hebt en waar ze naartoe moeten.",
    item_type: "textarea",
    required: false,
  },
  {
    section: "techniek",
    key: "integraties",
    title: "Integraties",
    help_text: "Welke systemen. Geen wachtwoorden, tokens of API-sleutels.",
    item_type: "textarea",
    required: false,
  },
  {
    section: "inspiratie",
    key: "voorbeeldsites",
    title: "Voorbeeldsites",
    help_text: "Links naar sites die in de buurt komen.",
    item_type: "url",
    required: false,
  },
  {
    section: "inspiratie",
    key: "voorkeuren",
    title: "Voorkeuren",
    help_text: "Wat je graag terugziet.",
    item_type: "textarea",
    required: false,
  },
  {
    section: "inspiratie",
    key: "niet_gewenst",
    title: "Niet gewenst",
    help_text: "Wat we moeten laten.",
    item_type: "textarea",
    required: false,
  },
];

export const MAATWERK_ONBOARDING_ITEMS: OnboardingTemplateItem[] = [
  {
    section: "maatwerk",
    key: "scope",
    title: "Scope en extra wensen",
    help_text: "Wat dit maatwerk extra nodig heeft boven de standaard checklist.",
    item_type: "textarea",
    required: true,
  },
];

const SECRET_PATTERN =
  /sk-[a-zA-Z0-9]{10,}|api[_-]?key\s*[:=]|secret\s*[:=]|token\s*[:=]\s*[^\s]{12,}|bearer\s+[a-z0-9\-._~+/]+=*|-----BEGIN [A-Z ]*PRIVATE KEY-----|postgres(?:ql)?:\/\/\S+:\S+@|mysql:\/\/\S+:\S+@|mongodb(?:\+srv)?:\/\/\S+:\S+@|aws_secret_access_key|password\s*[:=]\s*\S+/i;

export function isOnboardingStatus(value: string): value is OnboardingStatus {
  return ONBOARDING_STATUSES.some((item) => item.value === value);
}

export function isOnboardingItemStatus(value: string): value is OnboardingItemStatus {
  return ONBOARDING_ITEM_STATUSES.some((item) => item.value === value);
}

export function isOnboardingItemType(value: string): value is OnboardingItemType {
  return ONBOARDING_ITEM_TYPES.some((item) => item.value === value);
}

export function isOnboardingSection(value: string): value is OnboardingSectionId {
  return ONBOARDING_SECTIONS.some((item) => item.id === value);
}

export function projectNeedsOnboarding(type: string) {
  return type === "website" || type === "maatwerk";
}

export function templatesForProjectType(type: string): OnboardingTemplateItem[] {
  if (type === "maatwerk") return [...DEFAULT_ONBOARDING_ITEMS, ...MAATWERK_ONBOARDING_ITEMS];
  return DEFAULT_ONBOARDING_ITEMS;
}

export function itemSatisfiesReady(status: OnboardingItemStatus) {
  return status === "received" || status === "not_required" || status === "approved";
}

export function itemHasInput(item: Pick<OnboardingItemRow, "value_text" | "item_type">, fileCount: number) {
  const text = item.value_text?.trim() ?? "";
  if (item.item_type === "file" || item.item_type === "files") return fileCount > 0 || Boolean(text);
  return Boolean(text);
}

export function nextItemStatus(input: {
  current: OnboardingItemStatus;
  required: boolean;
  notRequired: boolean;
  hasInput: boolean;
}): OnboardingItemStatus {
  if (input.notRequired) return "not_required";
  if (input.current === "rejected" && !input.hasInput) return "rejected";
  if (input.hasInput) {
    if (input.current === "approved") return "approved";
    return "received";
  }
  return "missing";
}

export type OnboardingProgress = {
  completed: number;
  total: number;
  ready: boolean;
  missing: Array<{ id: string; title: string }>;
  received: Array<{ id: string; title: string }>;
  summary: string;
};

export function onboardingProgress(
  onboarding: Pick<OnboardingRow, "status" | "override_reason">,
  items: Array<Pick<OnboardingItemRow, "id" | "title" | "required" | "status">>
): OnboardingProgress {
  const required = items.filter((item) => item.required);
  const completedItems = required.filter((item) => itemSatisfiesReady(item.status));
  const missing = required
    .filter((item) => !itemSatisfiesReady(item.status))
    .map((item) => ({ id: item.id, title: item.title }));
  const received = required
    .filter((item) => itemSatisfiesReady(item.status))
    .map((item) => ({ id: item.id, title: item.title }));
  const total = required.length;
  const completed = completedItems.length;
  const gated = total === 0 || completed === total;
  const ready = Boolean(onboarding.override_reason) || onboarding.status === "ready" || gated;
  const summary =
    total === 0 ? "Onboarding 0/0 compleet" : `Onboarding ${completed}/${total} compleet`;
  return { completed, total, ready, missing, received, summary };
}

export function deriveOnboardingStatus(input: {
  overrideReason: string | null | undefined;
  items: Array<Pick<OnboardingItemRow, "required" | "status">>;
  now: string;
}): { status: OnboardingStatus; ready_at: string | null } {
  if (input.overrideReason?.trim()) {
    return { status: "ready", ready_at: input.now };
  }
  const required = input.items.filter((item) => item.required);
  const gated = required.length === 0 || required.every((item) => itemSatisfiesReady(item.status));
  return gated ? { status: "ready", ready_at: input.now } : { status: "open", ready_at: null };
}

export function containsSecret(value: string | null | undefined) {
  if (!value) return false;
  return SECRET_PATTERN.test(value);
}

export function sanitizeFileName(name: string) {
  const base = name.split(/[/\\]/).pop()?.trim() || "bestand";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^[.-]+|[.-]+$/g, "");
  const trimmed = cleaned.slice(0, 80) || "bestand";
  return trimmed.toLowerCase();
}

export function onboardingStorageKey(input: {
  organizationId: string;
  projectId: string;
  itemId: string;
  fileId: string;
  fileName: string;
}) {
  const parts = [input.organizationId, input.projectId, input.itemId, input.fileId].map((part) => {
    const value = String(part).trim();
    if (!value || value.includes("/") || value.includes("..") || value.includes("\\")) {
      throw new Error("Ongeldige opslagsleutel.");
    }
    return value;
  });
  return `onboarding/${parts.join("/")}/${sanitizeFileName(input.fileName)}`;
}

export function isAllowedOnboardingMime(mime: string) {
  const normalized = mime.trim().toLowerCase();
  return ONBOARDING_ALLOWED_MIME.includes(normalized as (typeof ONBOARDING_ALLOWED_MIME)[number]);
}

export function validateOnboardingFile(input: { name: string; mime: string; size: number }) {
  if (!input.name.trim()) return { ok: false as const, message: "Bestand heeft geen naam." };
  if (input.size <= 0) return { ok: false as const, message: "Bestand is leeg." };
  if (input.size > ONBOARDING_MAX_FILE_BYTES) {
    return { ok: false as const, message: "Bestand is groter dan 10 MB." };
  }
  if (!isAllowedOnboardingMime(input.mime)) {
    return { ok: false as const, message: "Dit bestandstype is niet toegestaan." };
  }
  return { ok: true as const, name: sanitizeFileName(input.name) };
}

export function validateOnboardingText(value: string) {
  if (containsSecret(value)) {
    return {
      ok: false as const,
      message: "Zet geen wachtwoorden, tokens of API-sleutels in onboarding. Die horen niet in gewone tekst.",
    };
  }
  return { ok: true as const, value: value.trim() };
}

export function buildOnboardingRecords(input: {
  projectId: string;
  organizationId: string;
  projectType: string;
  now: string;
  newId: () => string;
}): { onboarding: OnboardingRow; items: OnboardingItemRow[] } {
  const onboardingId = input.newId();
  const templates = templatesForProjectType(input.projectType);
  const onboarding: OnboardingRow = {
    id: onboardingId,
    organization_id: input.organizationId,
    project_id: input.projectId,
    status: "open",
    ready_at: null,
    override_reason: null,
    overridden_by: null,
    overridden_at: null,
    created_at: input.now,
    updated_at: input.now,
  };
  const items = templates.map((template, index) => ({
    id: input.newId(),
    onboarding_id: onboardingId,
    section: template.section,
    key: template.key,
    title: template.title,
    help_text: template.help_text,
    item_type: template.item_type,
    required: template.required,
    custom: false,
    status: "missing" as const,
    value_text: null,
    note: null,
    admin_note: null,
    sort_order: index,
    created_at: input.now,
    updated_at: input.now,
  }));
  return { onboarding, items };
}

export function parseCustomItemInput(input: {
  title?: string;
  section?: string;
  itemType?: string;
  required?: boolean;
  helpText?: string;
}) {
  const title = (input.title ?? "").trim();
  if (title.length < 3) return { ok: false as const, message: "Geef een duidelijke titel." };
  const section = input.section ?? "maatwerk";
  if (!isOnboardingSection(section)) return { ok: false as const, message: "Onbekende sectie." };
  const itemType = input.itemType ?? "textarea";
  if (!isOnboardingItemType(itemType)) return { ok: false as const, message: "Onbekend veldtype." };
  const help = validateOnboardingText(input.helpText ?? "");
  if (!help.ok) return help;
  return {
    ok: true as const,
    title,
    section,
    itemType,
    required: Boolean(input.required),
    helpText: help.value || null,
    key: `custom-${sanitizeFileName(title).slice(0, 40) || "item"}`,
  };
}

export function formatMissingLine(title: string) {
  return `! ${title} ontbreekt`;
}

export function formatReceivedLine(title: string) {
  return `✓ ${title}`;
}

export function progressLines(progress: OnboardingProgress, limit = 4) {
  const received = progress.received.slice(0, limit).map((item) => formatReceivedLine(item.title));
  const missing = progress.missing.slice(0, limit).map((item) => formatMissingLine(item.title));
  return [progress.summary, ...received, ...missing];
}

export function sectionLabel(id: string) {
  return ONBOARDING_SECTIONS.find((item) => item.id === id)?.label ?? id;
}

export function itemsBySection(items: OnboardingItemRow[]) {
  return ONBOARDING_SECTIONS.map((section) => ({
    ...section,
    items: items.filter((item) => item.section === section.id).sort((a, b) => a.sort_order - b.sort_order),
  })).filter((section) => section.items.length > 0);
}
