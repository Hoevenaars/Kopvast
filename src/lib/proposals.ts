import { isEmail, labelFor, projectTypes, type ProjectType } from "@/lib/product";
import { formatPrice, isRecurringServiceType, productForLine } from "@/lib/products";
import { site } from "@/lib/site";
import { proposalValidityDefault, termsPlainText, VAT_RATE } from "@/lib/terms";

export const proposalStatuses = [
  { value: "DRAFT", label: "Concept" },
  { value: "READY", label: "Klaar" },
  { value: "SENT", label: "Verzonden" },
  { value: "VIEWED", label: "Bekeken" },
  { value: "QUESTION", label: "Vraag" },
  { value: "ACCEPTED", label: "Akkoord" },
  { value: "DECLINED", label: "Afgewezen" },
  { value: "EXPIRED", label: "Verlopen" },
  { value: "SUPERSEDED", label: "Vervangen" },
] as const;

export const proposalTypes = projectTypes;

export const proposalLineKinds = [
  { value: "scope", label: "Eenmalig" },
  { value: "recurring", label: "Doorlopend" },
] as const;

export type ProposalStatus = (typeof proposalStatuses)[number]["value"];
export type ProposalType = (typeof proposalTypes)[number]["value"];
export type ProposalLineKind = (typeof proposalLineKinds)[number]["value"];

export type ProposalLineInput = {
  id?: string;
  productId?: string;
  kind: ProposalLineKind;
  title: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
};

export type ProposalLineRow = {
  id: string;
  proposal_id: string;
  kind: ProposalLineKind;
  title: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  sort_order: number;
};

export type ProposalRow = {
  id: string;
  created_at: string;
  updated_at: string;
  number: string;
  version: number;
  type: ProposalType;
  status: ProposalStatus;
  title: string;
  intro: string;
  aanleiding: string;
  scope_summary: string;
  planning: string;
  validity_text: string;
  recipient_name: string;
  recipient_email: string;
  recipient_organization: string;
  organization_id: string | null;
  inbound_lead_id: string | null;
  prospect_id: string | null;
  current_token: string | null;
  current_version_id: string | null;
  subtotal_cents: number;
  recurring_monthly_cents: number;
  vat_cents: number;
  total_cents: number;
  sent_at: string | null;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  question_text: string | null;
  question_at: string | null;
  accepted_at: string | null;
  accepted_by_name: string | null;
  accepted_by_email: string | null;
  accepted_snapshot: ProposalSnapshot | null;
  handed_off_at: string | null;
  created_by_email: string | null;
};

export type ProposalVersionRow = {
  id: string;
  proposal_id: string;
  version: number;
  token: string;
  snapshot: ProposalSnapshot;
  sent_at: string;
  first_viewed_at: string | null;
  created_at: string;
};

export type ProposalActivityRow = {
  id: string;
  proposal_id: string;
  event_type: string;
  actor_type: string;
  actor_email: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type ProposalSnapshotLine = {
  id: string;
  productId?: string;
  kind: ProposalLineKind;
  title: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
};

export type ProposalTotals = {
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  recurringMonthlyCents: number;
  recurringVatCents: number;
  vatRate: number;
};

export type ProposalSnapshot = {
  number: string;
  version: number;
  type: ProposalType;
  title: string;
  intro: string;
  aanleiding: string;
  scopeSummary: string;
  planning: string;
  validity: string;
  terms: string;
  organization: string;
  recipientName: string;
  recipientEmail: string;
  lines: ProposalSnapshotLine[];
  totals: ProposalTotals;
  sentAt: string;
  publicToken?: string;
};

export type ProposalDraftInput = {
  title: string;
  intro: string;
  aanleiding: string;
  scopeSummary: string;
  planning: string;
  validityText: string;
  recipientName: string;
  recipientEmail: string;
  recipientOrganization: string;
  type: string;
  lines: ProposalLineInput[];
};

export const PROPOSAL_ACTIVITY = {
  CREATED: "proposal_created",
  SAVED: "proposal_saved",
  SENT: "proposal_sent",
  VIEWED: "proposal_viewed",
  QUESTION: "proposal_question",
  ACCEPTED: "proposal_accepted",
  HANDOFF: "proposal_handoff",
} as const;

export function isProposalStatus(value: string): value is ProposalStatus {
  return proposalStatuses.some((item) => item.value === value);
}

export function isProposalType(value: string): value is ProposalType {
  return proposalTypes.some((item) => item.value === value);
}

export function isProposalLineKind(value: string): value is ProposalLineKind {
  return proposalLineKinds.some((item) => item.value === value);
}

export function proposalStatusLabel(status: string) {
  return labelFor(proposalStatuses, status);
}

export function formatProposalNumber(year: number, seq: number) {
  return `KOP-${year}-${String(seq).padStart(4, "0")}`;
}

export function nextProposalNumber(existing: string[], at = new Date()) {
  const year = at.getFullYear();
  const prefix = `KOP-${year}-`;
  let max = 0;
  for (const value of existing) {
    if (!value.startsWith(prefix)) continue;
    const seq = Number(value.slice(prefix.length));
    if (Number.isFinite(seq)) max = Math.max(max, seq);
  }
  return formatProposalNumber(year, max + 1);
}

export function centsToEuros(cents: number) {
  return Math.round(cents) / 100;
}

export function eurosToCents(value: number | string | null | undefined) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

export function versionPublicToken(version: Pick<ProposalVersionRow, "token" | "snapshot">) {
  if (version.token) return version.token;
  const token = version.snapshot?.publicToken;
  return typeof token === "string" ? token : "";
}

export function parseMoneyToCents(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, "").replace(/^€/, "");
  if (!trimmed) return null;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export function parseQuantity(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return 1;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100) / 100;
}

export function formatEuro(cents: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function lineAmountCents(quantity: number, unitPriceCents: number) {
  return Math.round(quantity * unitPriceCents);
}

export function totalsFromLines(
  lines: Array<{ kind: string; quantity: number; unitPriceCents: number }>,
  vatRate = VAT_RATE
): ProposalTotals {
  const subtotalCents = lines
    .filter((line) => line.kind === "scope")
    .reduce((sum, line) => sum + lineAmountCents(line.quantity, line.unitPriceCents), 0);
  const recurringMonthlyCents = lines
    .filter((line) => line.kind === "recurring")
    .reduce((sum, line) => sum + lineAmountCents(line.quantity, line.unitPriceCents), 0);
  const vatCents = Math.round(subtotalCents * vatRate);
  const recurringVatCents = Math.round(recurringMonthlyCents * vatRate);
  return {
    subtotalCents,
    vatCents,
    totalCents: subtotalCents + vatCents,
    recurringMonthlyCents,
    recurringVatCents,
    vatRate,
  };
}

export function proposalPublicPath(token: string) {
  return `/voorstel/${encodeURIComponent(token)}`;
}

export function proposalPublicUrl(token: string) {
  return `${site.url}${proposalPublicPath(token)}`;
}

export function defaultProposalTitle(organization: string) {
  const name = organization.trim();
  return name ? `Voorstel voor ${name}` : "Voorstel";
}

export function normalizeProposalLines(lines: ProposalLineInput[]): ProposalLineInput[] {
  return lines
    .map((line) => ({
      ...line,
      title: line.title.trim(),
      description: line.description.trim(),
      quantity: line.quantity > 0 ? line.quantity : 1,
      unitPriceCents: Math.max(0, Math.round(line.unitPriceCents)),
      kind: line.kind === "recurring" ? ("recurring" as const) : ("scope" as const),
    }))
    .filter((line) => line.title.length > 0);
}

export function evaluateProposalSend(input: {
  email: string;
  lines: ProposalLineInput[];
}): string[] {
  const issues: string[] = [];
  if (!isEmail(input.email)) issues.push("Er is geen geldig e-mailadres.");
  const lines = normalizeProposalLines(input.lines);
  if (!lines.some((line) => line.kind === "scope")) {
    issues.push("Voeg minstens één regel in de scope toe.");
  }
  const totals = totalsFromLines(lines);
  if (totals.subtotalCents <= 0) issues.push("Het eenmalige bedrag moet groter zijn dan nul.");
  return issues;
}

export function snapshotContent(input: {
  number: string;
  version: number;
  type: ProposalType;
  title: string;
  intro: string;
  aanleiding: string;
  scopeSummary: string;
  planning: string;
  validity: string;
  organization: string;
  recipientName: string;
  recipientEmail: string;
  lines: ProposalLineInput[];
  sentAt: string;
  terms?: string;
}): ProposalSnapshot {
  const lines = normalizeProposalLines(input.lines).map((line, index) => ({
    id: line.id || `line-${index + 1}`,
    ...(line.productId ? { productId: line.productId } : {}),
    kind: line.kind,
    title: line.title,
    description: line.description,
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    amountCents: lineAmountCents(line.quantity, line.unitPriceCents),
  }));
  return {
    number: input.number,
    version: input.version,
    type: input.type,
    title: input.title.trim() || defaultProposalTitle(input.organization),
    intro: input.intro.trim(),
    aanleiding: input.aanleiding.trim(),
    scopeSummary: input.scopeSummary.trim(),
    planning: input.planning.trim(),
    validity: input.validity.trim() || proposalValidityDefault,
    terms: input.terms ?? termsPlainText(),
    organization: input.organization.trim(),
    recipientName: input.recipientName.trim(),
    recipientEmail: input.recipientEmail.trim(),
    lines,
    totals: totalsFromLines(lines),
    sentAt: input.sentAt,
  };
}

export function snapshotFingerprint(snapshot: Pick<ProposalSnapshot, "title" | "intro" | "aanleiding" | "scopeSummary" | "planning" | "validity" | "organization" | "recipientName" | "recipientEmail" | "type" | "lines">) {
  return JSON.stringify({
    title: snapshot.title,
    intro: snapshot.intro,
    aanleiding: snapshot.aanleiding,
    scopeSummary: snapshot.scopeSummary,
    planning: snapshot.planning,
    validity: snapshot.validity,
    organization: snapshot.organization,
    recipientName: snapshot.recipientName,
    recipientEmail: snapshot.recipientEmail,
    type: snapshot.type,
    lines: snapshot.lines.map((line) => ({
      kind: line.kind,
      title: line.title,
      description: line.description,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      ...(line.productId ? { productId: line.productId } : {}),
    })),
  });
}

export function hasUnsentDraftChanges(draft: ProposalSnapshot, sent: ProposalSnapshot | null) {
  if (!sent) return true;
  return snapshotFingerprint(draft) !== snapshotFingerprint(sent);
}

export function isCurrentProposalVersion(proposal: Pick<ProposalRow, "version">, version: Pick<ProposalVersionRow, "version">) {
  return proposal.version === version.version;
}

export function canAcceptProposal(input: {
  proposal: Pick<ProposalRow, "status" | "version">;
  version: Pick<ProposalVersionRow, "version">;
}) {
  if (input.proposal.status === "ACCEPTED") return { ok: true as const, already: true };
  if (!isCurrentProposalVersion(input.proposal, input.version)) {
    return { ok: false as const, message: "Alleen de actuele versie kan worden geaccepteerd." };
  }
  if (!["SENT", "VIEWED", "QUESTION"].includes(input.proposal.status)) {
    return { ok: false as const, message: "Dit voorstel kan nu niet worden geaccepteerd." };
  }
  return { ok: true as const, already: false };
}

export function projectsFromSnapshot(snapshot: ProposalSnapshot) {
  const scope = snapshot.lines.filter((line) => line.kind === "scope");
  const recurring = snapshot.lines.filter((line) => line.kind === "recurring");
  const mainType: ProjectType =
    snapshot.type === "website" || snapshot.type === "merkrefresh" || snapshot.type === "sjablonen"
      ? snapshot.type
      : "maatwerk";
  const projects: Array<{
    type: ProjectType;
    title: string;
    status: "voorbereiding";
    price_label: string;
    summary: string;
    monthly_amount: number | null;
    included_note: string | null;
  }> = [];
  if (snapshot.totals.subtotalCents > 0) {
    projects.push({
      type: mainType,
      title: snapshot.title || defaultProposalTitle(snapshot.organization),
      status: "voorbereiding",
      price_label: `${formatEuro(snapshot.totals.subtotalCents)} eenmalig, excl. btw`,
      summary: snapshot.scopeSummary || scope.map((line) => line.title).join(", ") || `Uit voorstel ${snapshot.number}`,
      monthly_amount: null,
      included_note: null,
    });
  }
  for (const line of recurring) {
    if (line.amountCents <= 0) continue;
    const product = productForLine(line);
    const type: ProjectType =
      product && isRecurringServiceType(product.projectType) ? product.projectType : "beheer";
    const monthly = centsToEuros(line.amountCents);
    projects.push({
      type,
      title: line.title || product?.name || "Kopvast Beheer",
      status: "voorbereiding",
      price_label: `${formatPrice(monthly)} per maand, excl. btw`,
      summary: line.description || line.title || `Doorlopend bij voorstel ${snapshot.number}`,
      monthly_amount: monthly,
      included_note: product?.description ?? (line.description || null),
    });
  }
  if (!recurring.length && snapshot.totals.recurringMonthlyCents > 0) {
    const monthly = centsToEuros(snapshot.totals.recurringMonthlyCents);
    projects.push({
      type: "beheer",
      title: "Kopvast Beheer",
      status: "voorbereiding",
      price_label: `${formatPrice(monthly)} per maand, excl. btw`,
      summary: `Beheer bij voorstel ${snapshot.number}`,
      monthly_amount: monthly,
      included_note: null,
    });
  }
  return projects;
}

export function parseProposalLinesJson(raw: string): ProposalLineInput[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const lines: ProposalLineInput[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const kind = isProposalLineKind(String(row.kind ?? "")) ? (row.kind as ProposalLineKind) : "scope";
      const title = String(row.title ?? "").trim();
      const quantity = typeof row.quantity === "number" ? row.quantity : parseQuantity(String(row.quantity ?? "1"));
      const unitPriceCents =
        typeof row.unitPriceCents === "number"
          ? row.unitPriceCents
          : parseMoneyToCents(String(row.unitPrice ?? row.price ?? "0"));
      if (!title || quantity == null || unitPriceCents == null) continue;
      const id = String(row.id ?? "").trim();
      const productId = String(row.productId ?? "").trim();
      lines.push({
        ...(id ? { id } : {}),
        ...(productId ? { productId } : {}),
        kind,
        title,
        description: String(row.description ?? "").trim(),
        quantity,
        unitPriceCents,
      });
    }
    return lines;
  } catch {
    return [];
  }
}

export function formatNlDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" });
}

export function formatNlDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("nl-NL");
}
