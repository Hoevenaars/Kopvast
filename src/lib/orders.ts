import { DEPOSIT_INVOICE_LABEL, FINAL_INVOICE_LABEL, splitInstallments } from "@/lib/invoices";
import { products } from "@/lib/site";
import type { ProjectType } from "@/lib/product";

export const ORDER_FLOW = [
  "NEW",
  "ONBOARDING",
  "READY_FOR_PRODUCTION",
  "IN_PRODUCTION",
  "CLIENT_REVIEW",
  "CHANGES",
  "APPROVED",
  "READY_TO_LAUNCH",
  "LIVE",
  "COMPLETED",
] as const;

export const ORDER_STATUSES = [...ORDER_FLOW, "ON_HOLD"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const CRITICAL_GATES = ["ONBOARDING", "CLIENT_REVIEW", "APPROVED", "READY_TO_LAUNCH"] as const;

export type CriticalGate = (typeof CRITICAL_GATES)[number];

export const orderStatuses = [
  { value: "NEW", label: "Nieuw" },
  { value: "ONBOARDING", label: "Onboarding" },
  { value: "READY_FOR_PRODUCTION", label: "Klaar voor productie" },
  { value: "IN_PRODUCTION", label: "In productie" },
  { value: "CLIENT_REVIEW", label: "Review" },
  { value: "CHANGES", label: "Wijzigingen" },
  { value: "APPROVED", label: "Goedgekeurd" },
  { value: "READY_TO_LAUNCH", label: "Klaar voor live" },
  { value: "LIVE", label: "Live" },
  { value: "COMPLETED", label: "Afgerond" },
  { value: "ON_HOLD", label: "On hold" },
] as const;

export const orderFilters = [
  { value: "alles", label: "Alles" },
  { value: "onboarding", label: "Onboarding" },
  { value: "productie", label: "Productie" },
  { value: "review", label: "Review" },
  { value: "wijzigingen", label: "Wijzigingen" },
  { value: "klaar_voor_live", label: "Klaar voor live" },
  { value: "live", label: "Live" },
  { value: "on_hold", label: "On hold" },
] as const;

export type OrderFilter = (typeof orderFilters)[number]["value"];

export const FILTER_STATUSES: Record<Exclude<OrderFilter, "alles">, readonly OrderStatus[]> = {
  onboarding: ["NEW", "ONBOARDING"],
  productie: ["READY_FOR_PRODUCTION", "IN_PRODUCTION"],
  review: ["CLIENT_REVIEW"],
  wijzigingen: ["CHANGES"],
  klaar_voor_live: ["APPROVED", "READY_TO_LAUNCH"],
  live: ["LIVE", "COMPLETED"],
  on_hold: ["ON_HOLD"],
};

export const proposalStatuses = [
  { value: "DRAFT", label: "Concept" },
  { value: "SENT", label: "Verzonden" },
  { value: "ACCEPTED", label: "Geaccepteerd" },
  { value: "DECLINED", label: "Afgewezen" },
] as const;

export type ProposalStatus = (typeof proposalStatuses)[number]["value"];

export const ORDER_ACTIVITY = {
  ORDER_CREATED: "ORDER_CREATED",
  STATUS_CHANGED: "STATUS_CHANGED",
  NEXT_ACTION_SET: "NEXT_ACTION_SET",
  ONBOARDING_UPDATED: "ONBOARDING_UPDATED",
  PLANNING_UPDATED: "PLANNING_UPDATED",
  OVERRIDE_USED: "OVERRIDE_USED",
  WEBSITE_UPDATED: "WEBSITE_UPDATED",
} as const;

export type OrderProductType = ProjectType;

export type ProposalSnapshot = {
  productType: OrderProductType;
  productLabel: string;
  amount: number | null;
  cadence: string | null;
  priceLabel: string | null;
  includeRecurringBeheer: boolean;
  recurringAmount: number | null;
  recurringLabel: string | null;
  scope: string | null;
  companyName: string | null;
  customerName: string;
  customerEmail: string | null;
  website: string | null;
  acceptedAt: string;
};

export type OnboardingStep = {
  id: string;
  title: string;
  done: boolean;
};

export type ProposalRow = {
  id: string;
  created_at: string;
  updated_at: string;
  organization_id: string | null;
  inbound_lead_id: string | null;
  prospect_id: string | null;
  customer_name: string;
  customer_email: string | null;
  company_name: string | null;
  website: string | null;
  product_type: OrderProductType;
  title: string;
  status: ProposalStatus;
  price_amount: number | null;
  price_label: string | null;
  price_cadence: string | null;
  include_recurring_beheer: boolean;
  recurring_price_amount: number | null;
  recurring_price_label: string | null;
  scope: string | null;
  snapshot: ProposalSnapshot | Record<string, never>;
  accepted_at: string | null;
};

export type OrderRow = {
  id: string;
  created_at: string;
  updated_at: string;
  order_number: string;
  proposal_id: string;
  organization_id: string;
  inbound_lead_id: string | null;
  product_type: OrderProductType;
  product_label: string;
  status: OrderStatus;
  agreed_price_amount: number | null;
  agreed_price_label: string | null;
  agreed_price_cadence: string | null;
  include_recurring_beheer: boolean;
  recurring_price_amount: number | null;
  recurring_price_label: string | null;
  scope: string | null;
  proposal_snapshot: ProposalSnapshot;
  target_live_at: string | null;
  next_action: string | null;
  next_action_at: string | null;
  next_action_owner: string | null;
  production_notes: string | null;
  review_notes: string | null;
  visited_statuses: OrderStatus[];
};

export type OnboardingRow = {
  id: string;
  order_id: string;
  organization_id: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  progress: OnboardingStep[];
  created_at: string;
  updated_at: string;
};

export type OrderWebsiteRow = {
  id: string;
  order_id: string;
  organization_id: string;
  domain: string | null;
  status: "planned" | "building" | "review" | "live";
  created_at: string;
  updated_at: string;
};

export type InvoiceRow = {
  id: string;
  order_id: string;
  organization_id: string;
  kind: "deposit" | "final" | "recurring";
  amount: number | null;
  label: string | null;
  status: "draft" | "sent" | "paid" | "cancelled";
  created_at: string;
};

export type OrderActivityRow = {
  id: string;
  order_id: string;
  event_type: string;
  actor_type: "system" | "human";
  actor_id: string | null;
  old_status: string | null;
  new_status: string | null;
  body: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export const DEFAULT_ONBOARDING_STEPS: Omit<OnboardingStep, "done">[] = [
  { id: "gegevens", title: "Bedrijfsgegevens bevestigd" },
  { id: "logo", title: "Logo en huisstijl ontvangen" },
  { id: "fotos", title: "Foto's ontvangen" },
  { id: "teksten", title: "Teksten ontvangen" },
  { id: "domein", title: "Domein / DNS" },
];

export const NEXT_ACTION_EXAMPLES = [
  "Wachten op foto's",
  "Homepage bouwen",
  "Concept sturen",
  "Wijzigingen verwerken",
  "DNS",
  "Factuur sturen",
  "Beheercheck",
] as const;

const PRODUCT_DEFAULTS: Record<
  OrderProductType,
  { label: string; amount: number | null; cadence: string; recurring: boolean }
> = {
  website: {
    label: products.website.name,
    amount: 1495,
    cadence: products.website.cadence,
    recurring: true,
  },
  beheer: {
    label: products.beheer.name,
    amount: 199,
    cadence: products.beheer.cadence,
    recurring: false,
  },
  merkrefresh: {
    label: products.merkrefresh.name,
    amount: 995,
    cadence: products.merkrefresh.cadence,
    recurring: false,
  },
  sjablonen: {
    label: products.sjablonen.name,
    amount: 495,
    cadence: products.sjablonen.cadence,
    recurring: false,
  },
  maatwerk: {
    label: "Maatwerk",
    amount: null,
    cadence: "offerte",
    recurring: false,
  },
};

export function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.some((item) => item === value);
}

export function isOrderFilter(value: string): value is OrderFilter {
  return orderFilters.some((item) => item.value === value);
}

export function isProposalStatus(value: string): value is ProposalStatus {
  return proposalStatuses.some((item) => item.value === value);
}

export function isOrderProductType(value: string): value is OrderProductType {
  return value in PRODUCT_DEFAULTS;
}

export function productDefaults(type: OrderProductType) {
  return PRODUCT_DEFAULTS[type];
}

export function formatEuro(amount: number | null | undefined) {
  if (amount == null || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
}

export function priceLabel(amount: number | null, cadence: string | null) {
  if (amount == null) return cadence || "Offerte";
  return `${formatEuro(amount)}${cadence ? ` ${cadence}` : ""}`;
}

export function statusesForFilter(filter: OrderFilter): readonly OrderStatus[] | null {
  if (filter === "alles") return null;
  return FILTER_STATUSES[filter];
}

export function matchesOrderFilter(status: OrderStatus, filter: OrderFilter) {
  const allowed = statusesForFilter(filter);
  if (!allowed) return true;
  return allowed.includes(status);
}

export function parseVisitedStatuses(value: unknown): OrderStatus[] {
  if (!Array.isArray(value)) return ["NEW"];
  const items = value.filter((item): item is OrderStatus => typeof item === "string" && isOrderStatus(item));
  return items.length ? items : ["NEW"];
}

export function parseOnboardingProgress(value: unknown): OnboardingStep[] {
  const fallback = defaultOnboardingSteps();
  if (!Array.isArray(value) || value.length === 0) return fallback;
  const byId = new Map(
    value
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as { id?: unknown; title?: unknown; done?: unknown };
        const id = String(row.id ?? "").trim();
        if (!id) return null;
        return [id, { id, title: String(row.title ?? "").trim() || id, done: Boolean(row.done) }] as const;
      })
      .filter((item): item is readonly [string, OnboardingStep] => Boolean(item))
  );
  return fallback.map((step) => byId.get(step.id) ?? step);
}

export function defaultOnboardingSteps(): OnboardingStep[] {
  return DEFAULT_ONBOARDING_STEPS.map((step) => ({ ...step, done: false }));
}

export function onboardingStatusFromProgress(progress: OnboardingStep[]): OnboardingRow["status"] {
  const done = progress.filter((step) => step.done).length;
  if (done === 0) return "OPEN";
  if (done >= progress.length) return "DONE";
  return "IN_PROGRESS";
}

export function flowIndex(status: OrderStatus) {
  if (status === "ON_HOLD") return -1;
  if (status === "CHANGES") return ORDER_FLOW.indexOf("CLIENT_REVIEW");
  return ORDER_FLOW.indexOf(status);
}

export function skippedCriticalGates(from: OrderStatus, to: OrderStatus, visited: OrderStatus[] = []) {
  if (from === to || to === "ON_HOLD") return [] as CriticalGate[];
  const seen = new Set(visited.includes(from) ? visited : [...visited, from]);
  const fromIndex = flowIndex(from);
  const toIndex = flowIndex(to);
  if (toIndex < 0 || fromIndex < 0) return [] as CriticalGate[];
  if (toIndex <= fromIndex + 1) return [] as CriticalGate[];
  return CRITICAL_GATES.filter((gate) => {
    const index = flowIndex(gate);
    return index > fromIndex && index < toIndex && !seen.has(gate);
  });
}

export function evaluateStatusChange(input: {
  from: OrderStatus;
  to: string;
  visited?: OrderStatus[];
  override?: boolean;
}):
  | { ok: true; status: OrderStatus; skipped: CriticalGate[]; override: boolean }
  | { ok: false; message: string; skipped: CriticalGate[] } {
  if (!isOrderStatus(input.to)) return { ok: false, message: "Onbekende status.", skipped: [] };
  const skipped = skippedCriticalGates(input.from, input.to, input.visited ?? []);
  if (skipped.length && !input.override) {
    return {
      ok: false,
      message: `Je slaat een kritieke stap over (${skipped.map((item) => labelForOrderStatus(item)).join(", ")}). Bevestig de override om door te gaan.`,
      skipped,
    };
  }
  return { ok: true, status: input.to, skipped, override: Boolean(skipped.length && input.override) };
}

export function labelForOrderStatus(status: string) {
  return orderStatuses.find((item) => item.value === status)?.label ?? status;
}

export function recordVisited(visited: OrderStatus[], status: OrderStatus) {
  if (visited.includes(status)) return visited;
  return [...visited, status];
}

export function nextOrderNumber(existing: string[], at = new Date()) {
  const year = at.getFullYear();
  const prefix = `KV-${year}-`;
  let max = 0;
  for (const number of existing) {
    if (!number.startsWith(prefix)) continue;
    const seq = Number(number.slice(prefix.length));
    if (Number.isInteger(seq) && seq > max) max = seq;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export function buildProposalSnapshot(
  proposal: Pick<
    ProposalRow,
    | "product_type"
    | "customer_name"
    | "customer_email"
    | "company_name"
    | "website"
    | "price_amount"
    | "price_cadence"
    | "price_label"
    | "include_recurring_beheer"
    | "recurring_price_amount"
    | "recurring_price_label"
    | "scope"
  >,
  acceptedAt: string
): ProposalSnapshot {
  const defaults = productDefaults(proposal.product_type);
  const amount = proposal.price_amount ?? defaults.amount;
  const cadence = proposal.price_cadence ?? defaults.cadence;
  const includeRecurring = proposal.include_recurring_beheer ?? defaults.recurring;
  const recurringAmount = includeRecurring ? (proposal.recurring_price_amount ?? 199) : null;
  return {
    productType: proposal.product_type,
    productLabel: defaults.label,
    amount,
    cadence,
    priceLabel: proposal.price_label || priceLabel(amount, cadence),
    includeRecurringBeheer: includeRecurring,
    recurringAmount,
    recurringLabel: includeRecurring
      ? proposal.recurring_price_label || priceLabel(recurringAmount, products.beheer.cadence)
      : null,
    scope: proposal.scope,
    companyName: proposal.company_name,
    customerName: proposal.customer_name,
    customerEmail: proposal.customer_email,
    website: proposal.website,
    acceptedAt,
  };
}

export function defaultNextAction(status: OrderStatus, at = new Date()) {
  const dueDays = status === "LIVE" || status === "COMPLETED" ? 0 : 7;
  const due = new Date(at.getTime() + dueDays * 24 * 60 * 60 * 1000);
  const examples: Partial<Record<OrderStatus, string>> = {
    NEW: "Wachten op foto's",
    ONBOARDING: "Wachten op foto's",
    READY_FOR_PRODUCTION: "Homepage bouwen",
    IN_PRODUCTION: "Homepage bouwen",
    CLIENT_REVIEW: "Concept sturen",
    CHANGES: "Wijzigingen verwerken",
    APPROVED: "DNS",
    READY_TO_LAUNCH: "DNS",
    LIVE: "Factuur sturen",
    COMPLETED: "Beheercheck",
    ON_HOLD: "Opdracht hervatten",
  };
  return {
    text: examples[status] ?? "Wachten op foto's",
    at: due.toISOString().slice(0, 10),
  };
}

export function parseNextActionInput(input: { text?: string; at?: string; owner?: string }) {
  const text = (input.text ?? "").trim();
  const owner = (input.owner ?? "").trim();
  const at = (input.at ?? "").trim();
  if (!text) return { ok: false as const, message: "Zet de volgende actie op papier." };
  if (text.length < 3) return { ok: false as const, message: "De volgende actie is te kort." };
  if (at && Number.isNaN(new Date(`${at}T12:00:00`).getTime())) {
    return { ok: false as const, message: "De datum van de volgende actie klopt niet." };
  }
  return {
    ok: true as const,
    text,
    at: at || null,
    owner: owner || null,
  };
}

export function parseAmount(value: string) {
  const trimmed = value.trim().replace(/\s/g, "").replace("€", "");
  if (!trimmed) return null;
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

export function invoicePlan(snapshot: ProposalSnapshot) {
  const invoices: Array<{ kind: InvoiceRow["kind"]; amount: number | null; label: string }> = [];
  if (snapshot.amount != null && snapshot.amount > 0) {
    const halves = splitInstallments(snapshot.amount);
    invoices.push({ kind: "deposit", amount: halves.deposit, label: DEPOSIT_INVOICE_LABEL });
    invoices.push({ kind: "final", amount: halves.final, label: FINAL_INVOICE_LABEL });
  }
  if (snapshot.includeRecurringBeheer && snapshot.recurringAmount != null) {
    invoices.push({
      kind: "recurring",
      amount: snapshot.recurringAmount,
      label: snapshot.recurringLabel || "Kopvast Beheer maandelijks",
    });
  }
  return invoices;
}

export function websiteStatusForOrder(status: OrderStatus): OrderWebsiteRow["status"] {
  if (status === "LIVE" || status === "COMPLETED") return "live";
  if (status === "CLIENT_REVIEW" || status === "CHANGES" || status === "APPROVED") return "review";
  if (status === "IN_PRODUCTION" || status === "READY_FOR_PRODUCTION" || status === "READY_TO_LAUNCH") return "building";
  return "planned";
}

export type MaterializeInput = {
  proposal: ProposalRow;
  organizationId: string;
  existingOrderNumbers: string[];
  existing?: {
    order?: OrderRow | null;
    onboarding?: OnboardingRow | null;
    website?: OrderWebsiteRow | null;
    invoices?: InvoiceRow[];
  };
  now?: Date;
  newId?: () => string;
  actorEmail: string;
  targetLiveAt?: string | null;
};

export type MaterializeResult = {
  already: boolean;
  proposalPatch: Partial<ProposalRow>;
  order: OrderRow;
  onboarding: OnboardingRow;
  website: OrderWebsiteRow;
  invoices: InvoiceRow[];
  activity: OrderActivityRow | null;
};

export function materializeAcceptedProposal(input: MaterializeInput): MaterializeResult {
  const now = input.now ?? new Date();
  const iso = now.toISOString();
  const newId = input.newId ?? (() => crypto.randomUUID());
  const snapshot =
    input.proposal.snapshot && "productType" in input.proposal.snapshot && input.proposal.snapshot.productType
      ? (input.proposal.snapshot as ProposalSnapshot)
      : buildProposalSnapshot(input.proposal, input.proposal.accepted_at || iso);

  const existingOrder = input.existing?.order ?? null;
  const already = Boolean(existingOrder);
  const order =
    existingOrder ??
    ({
      id: newId(),
      created_at: iso,
      updated_at: iso,
      order_number: nextOrderNumber(input.existingOrderNumbers, now),
      proposal_id: input.proposal.id,
      organization_id: input.organizationId,
      inbound_lead_id: input.proposal.inbound_lead_id,
      product_type: snapshot.productType,
      product_label: snapshot.productLabel,
      status: "NEW",
      agreed_price_amount: snapshot.amount,
      agreed_price_label: snapshot.priceLabel,
      agreed_price_cadence: snapshot.cadence,
      include_recurring_beheer: snapshot.includeRecurringBeheer,
      recurring_price_amount: snapshot.recurringAmount,
      recurring_price_label: snapshot.recurringLabel,
      scope: snapshot.scope,
      proposal_snapshot: snapshot,
      target_live_at: input.targetLiveAt ?? null,
      next_action: defaultNextAction("NEW", now).text,
      next_action_at: defaultNextAction("NEW", now).at,
      next_action_owner: null,
      production_notes: null,
      review_notes: null,
      visited_statuses: ["NEW"],
    } satisfies OrderRow);

  const onboarding =
    input.existing?.onboarding ??
    ({
      id: newId(),
      order_id: order.id,
      organization_id: input.organizationId,
      status: "OPEN",
      progress: defaultOnboardingSteps(),
      created_at: iso,
      updated_at: iso,
    } satisfies OnboardingRow);

  const website =
    input.existing?.website ??
    ({
      id: newId(),
      order_id: order.id,
      organization_id: input.organizationId,
      domain: snapshot.website,
      status: websiteStatusForOrder(order.status),
      created_at: iso,
      updated_at: iso,
    } satisfies OrderWebsiteRow);

  const invoices =
    input.existing?.invoices && input.existing.invoices.length
      ? input.existing.invoices
      : invoicePlan(snapshot).map((item) => ({
          id: newId(),
          order_id: order.id,
          organization_id: input.organizationId,
          kind: item.kind,
          amount: item.amount,
          label: item.label,
          status: "draft" as const,
          created_at: iso,
        }));

  const activity = already
    ? null
    : ({
        id: newId(),
        order_id: order.id,
        event_type: ORDER_ACTIVITY.ORDER_CREATED,
        actor_type: "human",
        actor_id: input.actorEmail,
        old_status: null,
        new_status: "NEW",
        body: `Opdracht ${order.order_number} aangemaakt vanuit geaccepteerd voorstel.`,
        metadata: { proposalId: input.proposal.id, snapshot },
        created_at: iso,
      } satisfies OrderActivityRow);

  return {
    already,
    proposalPatch: {
      organization_id: input.organizationId,
      status: "ACCEPTED",
      accepted_at: input.proposal.accepted_at || iso,
      snapshot,
      updated_at: iso,
    },
    order: already
      ? order
      : {
          ...order,
          next_action: order.next_action || defaultNextAction("NEW", now).text,
          next_action_at: order.next_action_at || defaultNextAction("NEW", now).at,
        },
    onboarding,
    website,
    invoices,
    activity,
  };
}
