import type { SupabaseClient } from "@supabase/supabase-js";
import { refreshClient } from "@/lib/refresh";
import {
  convertLead,
  defaultProjectsForLead,
  emptyProjectFields,
  loadLead,
  loadOrganization,
  loadOrganizations,
  loadProjects,
  type LeadRow,
  type OrganizationRow,
} from "@/lib/workspace";
import { isEmail, normalizeEmail, workspaceRoutes, type ProjectType } from "@/lib/product";
import { mutateStore, newId, nowIso, readStore, type MemberRow } from "@/lib/workspace-store";
import {
  evaluateStatusChange,
  isOrderFilter,
  isOrderProductType,
  isOrderStatus,
  labelForOrderStatus,
  materializeAcceptedProposal,
  matchesOrderFilter,
  ORDER_ACTIVITY,
  parseAmount,
  parseNextActionInput,
  parseOnboardingProgress,
  parseVisitedStatuses,
  priceLabel,
  productDefaults,
  recordVisited,
  websiteStatusForOrder,
  type InvoiceRow,
  type OnboardingRow,
  type OnboardingStep,
  type OrderActivityRow,
  type OrderProductType,
  type OrderRow,
  type OrderStatus,
  type OrderWebsiteRow,
  type ProposalRow,
  type ProposalSnapshot,
} from "@/lib/orders";

export type ActionOk<T extends object = object> = { ok: true } & T;
export type ActionErr = { ok: false; message: string };
export type ActionResult<T extends object = object> = ActionOk<T> | ActionErr;

export type OrderListItem = OrderRow & {
  customer_name: string;
};

export type OrderDetail = {
  order: OrderRow;
  proposal: ProposalRow | null;
  organization: OrganizationRow | null;
  onboarding: OnboardingRow | null;
  website: OrderWebsiteRow | null;
  invoices: InvoiceRow[];
  activities: OrderActivityRow[];
  deliveryOnboardingHref: string | null;
  productionHref: string | null;
};

function fail(message: string): ActionErr {
  return { ok: false, message };
}

function asNumber(value: unknown) {
  if (value == null || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function mapProposal(row: Record<string, unknown>): ProposalRow {
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
    organization_id: row.organization_id ? String(row.organization_id) : null,
    inbound_lead_id: row.inbound_lead_id ? String(row.inbound_lead_id) : null,
    prospect_id: row.prospect_id ? String(row.prospect_id) : null,
    customer_name: String(row.customer_name ?? ""),
    customer_email: row.customer_email ? String(row.customer_email) : null,
    company_name: row.company_name ? String(row.company_name) : null,
    website: row.website ? String(row.website) : null,
    product_type: isOrderProductType(String(row.product_type)) ? (row.product_type as OrderProductType) : "website",
    title: String(row.title ?? ""),
    status: (row.status as ProposalRow["status"]) ?? "DRAFT",
    price_amount: asNumber(row.price_amount),
    price_label: row.price_label ? String(row.price_label) : null,
    price_cadence: row.price_cadence ? String(row.price_cadence) : null,
    include_recurring_beheer: Boolean(row.include_recurring_beheer),
    recurring_price_amount: asNumber(row.recurring_price_amount),
    recurring_price_label: row.recurring_price_label ? String(row.recurring_price_label) : null,
    scope: row.scope ? String(row.scope) : null,
    snapshot: (row.snapshot as ProposalSnapshot) ?? {},
    accepted_at: row.accepted_at ? String(row.accepted_at) : null,
  };
}

function mapOrder(row: Record<string, unknown>): OrderRow {
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
    order_number: String(row.order_number),
    proposal_id: String(row.proposal_id),
    organization_id: String(row.organization_id),
    inbound_lead_id: row.inbound_lead_id ? String(row.inbound_lead_id) : null,
    product_type: isOrderProductType(String(row.product_type)) ? (row.product_type as OrderProductType) : "website",
    product_label: String(row.product_label ?? ""),
    status: isOrderStatus(String(row.status)) ? (row.status as OrderStatus) : "NEW",
    agreed_price_amount: asNumber(row.agreed_price_amount),
    agreed_price_label: row.agreed_price_label ? String(row.agreed_price_label) : null,
    agreed_price_cadence: row.agreed_price_cadence ? String(row.agreed_price_cadence) : null,
    include_recurring_beheer: Boolean(row.include_recurring_beheer),
    recurring_price_amount: asNumber(row.recurring_price_amount),
    recurring_price_label: row.recurring_price_label ? String(row.recurring_price_label) : null,
    scope: row.scope ? String(row.scope) : null,
    proposal_snapshot: (row.proposal_snapshot as ProposalSnapshot) ?? ({} as ProposalSnapshot),
    target_live_at: row.target_live_at ? String(row.target_live_at).slice(0, 10) : null,
    next_action: row.next_action ? String(row.next_action) : null,
    next_action_at: row.next_action_at ? String(row.next_action_at).slice(0, 10) : null,
    next_action_owner: row.next_action_owner ? String(row.next_action_owner) : null,
    production_notes: row.production_notes ? String(row.production_notes) : null,
    review_notes: row.review_notes ? String(row.review_notes) : null,
    visited_statuses: parseVisitedStatuses(row.visited_statuses),
  };
}

function mapOnboarding(row: Record<string, unknown>): OnboardingRow {
  return {
    id: String(row.id),
    order_id: String(row.order_id),
    organization_id: String(row.organization_id),
    status: (row.status as OnboardingRow["status"]) ?? "OPEN",
    progress: parseOnboardingProgress(row.progress),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

function mapWebsite(row: Record<string, unknown>): OrderWebsiteRow {
  return {
    id: String(row.id),
    order_id: String(row.order_id),
    organization_id: String(row.organization_id),
    domain: row.domain ? String(row.domain) : null,
    status: (row.status as OrderWebsiteRow["status"]) ?? "planned",
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

function mapBillingInvoiceForOrder(
  row: {
    id: string;
    organization_id: string;
    description: string;
    amount_ex_vat: number;
    status: string;
    created_at: string;
  },
  orderId: string
): InvoiceRow {
  const status: InvoiceRow["status"] =
    row.status === "PAID" ? "paid" : row.status === "CANCELLED" ? "cancelled" : row.status === "NOT_INVOICED" ? "draft" : "sent";
  return {
    id: row.id,
    order_id: orderId,
    organization_id: row.organization_id,
    kind: "final",
    amount: row.amount_ex_vat,
    label: row.description,
    status,
    created_at: row.created_at,
  };
}

async function billingInvoicesForOrder(order: OrderRow): Promise<InvoiceRow[]> {
  const { loadInvoices } = await import("@/lib/billing");
  return (await loadInvoices())
    .filter((item) => item.organization_id === order.organization_id && item.status !== "CANCELLED")
    .map((item) => mapBillingInvoiceForOrder(item, order.id));
}

function mapActivity(row: Record<string, unknown>): OrderActivityRow {
  return {
    id: String(row.id),
    order_id: String(row.order_id),
    event_type: String(row.event_type),
    actor_type: row.actor_type === "system" ? "system" : "human",
    actor_id: row.actor_id ? String(row.actor_id) : null,
    old_status: row.old_status ? String(row.old_status) : null,
    new_status: row.new_status ? String(row.new_status) : null,
    body: row.body ? String(row.body) : null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: String(row.created_at),
  };
}

async function loadLiveOrderProposal(proposalId: string): Promise<ProposalRow | null> {
  const { loadProposal } = await import("@/lib/proposal-ops");
  const { liveProposalToOrderProposal } = await import("@/lib/commercial-handoffs");
  const live = await loadProposal(proposalId);
  return live?.proposal ? liveProposalToOrderProposal(live.proposal) : null;
}

async function loadOrderOnboarding(supabase: SupabaseClient, orderId: string): Promise<OnboardingRow | null> {
  const { data, error } = await supabase.from("kopvast_onboardings").select("*").eq("order_id", orderId).maybeSingle();
  if (error || !data) return null;
  return mapOnboarding(data as Record<string, unknown>);
}

async function deliveryLinks(organizationId: string): Promise<{
  deliveryOnboardingHref: string | null;
  productionHref: string | null;
}> {
  const { loadProjects } = await import("@/lib/workspace");
  const { isDeliveryProject } = await import("@/lib/production");
  const project = (await loadProjects()).find(
    (item) => item.organization_id === organizationId && isDeliveryProject(item.type)
  );
  if (!project) return { deliveryOnboardingHref: null, productionHref: null };
  const { loadProductionsForOrganization } = await import("@/lib/production-board");
  const production = (await loadProductionsForOrganization(organizationId)).find(
    (item) => item.project_id === project.id
  );
  return {
    deliveryOnboardingHref: `${workspaceRoutes.adminOrders}/${project.id}/onboarding`,
    productionHref: production ? `${workspaceRoutes.adminProductie}/${production.id}` : workspaceRoutes.adminProductie,
  };
}

function neededProjectTypes(order: OrderRow): ProjectType[] {
  const types: ProjectType[] = [order.product_type === "website" ? "website" : order.product_type];
  if (order.include_recurring_beheer && !types.includes("beheer")) types.push("beheer");
  return types;
}

function attachCustomerName(orders: OrderRow[], organizations: OrganizationRow[]): OrderListItem[] {
  const names = new Map(organizations.map((org) => [org.id, org.name]));
  return orders.map((order) => ({
    ...order,
    customer_name: names.get(order.organization_id) || order.proposal_snapshot?.companyName || order.proposal_snapshot?.customerName || "—",
  }));
}

export async function loadOrders(filter: string = "alles"): Promise<OrderListItem[]> {
  const resolved = isOrderFilter(filter) ? filter : "alles";
  const organizations = await loadOrganizations();
  const supabase = refreshClient();
  if (supabase) {
    const { data, error } = await supabase.from("kopvast_orders").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("[kopvast] Opdrachten laden mislukt", error.message);
      return [];
    }
    const orders = ((data ?? []) as Record<string, unknown>[]).map(mapOrder);
    return attachCustomerName(orders, organizations).filter((order) => matchesOrderFilter(order.status, resolved));
  }
  const store = await readStore();
  return attachCustomerName(
    [...store.orders].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    organizations
  ).filter((order) => matchesOrderFilter(order.status, resolved));
}

export async function loadOrder(id: string): Promise<OrderRow | null> {
  if (!id) return null;
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_orders").select("*").eq("id", id).maybeSingle();
    return data ? mapOrder(data as Record<string, unknown>) : null;
  }
  return (await readStore()).orders.find((item) => item.id === id) ?? null;
}

export async function loadOrderByLead(leadId: string): Promise<OrderRow | null> {
  if (!leadId) return null;
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase
      .from("kopvast_orders")
      .select("*")
      .eq("inbound_lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? mapOrder(data as Record<string, unknown>) : null;
  }
  return (await readStore()).orders.find((item) => item.inbound_lead_id === leadId) ?? null;
}

export async function loadOrdersForOrganization(organizationId: string): Promise<OrderRow[]> {
  if (!organizationId) return [];
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase
      .from("kopvast_orders")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    return ((data ?? []) as Record<string, unknown>[]).map(mapOrder);
  }
  return (await readStore()).orders.filter((item) => item.organization_id === organizationId);
}

export async function loadOrderDetail(id: string): Promise<OrderDetail | null> {
  const order = await loadOrder(id);
  if (!order) return null;
  const supabase = refreshClient();
  if (supabase) {
    const [proposal, organization, onboarding, website, invoices, activities, links] = await Promise.all([
      loadLiveOrderProposal(order.proposal_id),
      loadOrganization(order.organization_id),
      loadOrderOnboarding(supabase, order.id),
      supabase.from("kopvast_websites").select("*").eq("order_id", order.id).maybeSingle(),
      billingInvoicesForOrder(order),
      supabase.from("kopvast_order_activities").select("*").eq("order_id", order.id).order("created_at", { ascending: false }),
      deliveryLinks(order.organization_id),
    ]);
    return {
      order,
      proposal,
      organization,
      onboarding,
      website: website.data ? mapWebsite(website.data as Record<string, unknown>) : null,
      invoices,
      activities: ((activities.data ?? []) as Record<string, unknown>[]).map(mapActivity),
      ...links,
    };
  }
  const store = await readStore();
  const billingInvoices = await billingInvoicesForOrder(order);
  return {
    order,
    proposal:
      store.proposals.find((item) => item.id === order.proposal_id) ?? (await loadLiveOrderProposal(order.proposal_id)),
    organization: store.organizations.find((item) => item.id === order.organization_id) ?? null,
    onboarding: store.onboardings.find((item) => item.order_id === order.id) ?? null,
    website: store.orderWebsites.find((item) => item.order_id === order.id) ?? null,
    invoices: billingInvoices.length ? billingInvoices : store.invoices.filter((item) => item.order_id === order.id),
    activities: store.orderActivities
      .filter((item) => item.order_id === order.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    ...(await deliveryLinks(order.organization_id)),
  };
}

function projectSpec(type: ProjectType, order: OrderRow) {
  if (type === "website") return defaultProjectsForLead("website").find((item) => item.type === "website")!;
  if (type === "beheer") return defaultProjectsForLead("website").find((item) => item.type === "beheer")!;
  if (type === "maatwerk") return defaultProjectsForLead("maatwerk")[0]!;
  const defaults = productDefaults(type);
  return {
    type,
    title: defaults.label,
    status: "voorbereiding" as const,
    price_label: order.product_type === type ? order.agreed_price_label : null,
    summary: defaults.label,
    ...emptyProjectFields(),
  };
}

export async function ensureProjectsForOrder(organizationId: string, order: OrderRow) {
  const selected = neededProjectTypes(order).map((type) => projectSpec(type, order));
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_projects").select("type").eq("organization_id", organizationId);
    const existing = new Set((data ?? []).map((item) => item.type));
    const insert = selected.filter((project) => !existing.has(project.type)).map((project) => ({
      ...project,
      organization_id: organizationId,
    }));
    if (insert.length) await supabase.from("kopvast_projects").insert(insert);
    return;
  }
  await mutateStore((store) => {
    const existing = new Set(store.projects.filter((item) => item.organization_id === organizationId).map((item) => item.type));
    for (const project of selected) {
      if (existing.has(project.type)) continue;
      store.projects.push({
        ...project,
        id: newId(),
        organization_id: organizationId,
        started_at: null,
        due_at: null,
        live_at: null,
        created_at: nowIso(),
      });
    }
  });
}

async function seedBillingFromOrder(order: OrderRow) {
  const projects = (await loadProjects()).filter((item) => item.organization_id === order.organization_id);
  const delivery =
    projects.find((item) => item.type === order.product_type) ??
    projects.find((item) => item.type !== "beheer") ??
    null;
  const { seedBillingForAcceptedOrder } = await import("@/lib/billing");
  await seedBillingForAcceptedOrder({
    organizationId: order.organization_id,
    projectId: delivery?.id ?? null,
    description: order.product_label || order.proposal_snapshot.productLabel || `Opdracht ${order.order_number}`,
    amount: order.agreed_price_amount,
  });
}

async function resolveCustomerFromProposal(proposal: ProposalRow): Promise<ActionResult<{ organizationId: string }>> {
  if (proposal.organization_id) {
    const existing = await loadOrganization(proposal.organization_id);
    if (existing) return { ok: true, organizationId: existing.id };
  }
  if (proposal.inbound_lead_id) {
    const converted = await convertLead(proposal.inbound_lead_id);
    if (converted.ok) return { ok: true, organizationId: converted.organizationId };
  }
  const email = proposal.customer_email ? normalizeEmail(proposal.customer_email) : "";
  const supabase = refreshClient();
  if (supabase) {
    if (email) {
      const { data: member } = await supabase.from("kopvast_members").select("organization_id").ilike("email", email).limit(1).maybeSingle();
      if (member?.organization_id) return { ok: true, organizationId: String(member.organization_id) };
    }
    const { data: created, error } = await supabase
      .from("kopvast_organizations")
      .insert({
        name: proposal.company_name?.trim() || proposal.customer_name,
        website: proposal.website,
        status: "onboarding",
        inbound_lead_id: proposal.inbound_lead_id,
        notes: null,
      })
      .select("id")
      .single();
    if (error || !created) {
      console.error("[kopvast] Klant vanuit voorstel mislukt", error?.message);
      return fail("Klant aanmaken is mislukt.");
    }
    if (email) {
      await supabase.from("kopvast_members").insert({
        organization_id: created.id,
        name: proposal.customer_name,
        email,
        role: "owner",
        access_enabled: true,
      });
    }
    return { ok: true, organizationId: created.id as string };
  }

  return mutateStore((store) => {
    if (email) {
      const member = store.members.find((item) => item.email === email);
      if (member) return { ok: true as const, organizationId: member.organization_id };
    }
    const created: OrganizationRow = {
      id: newId(),
      name: proposal.company_name?.trim() || proposal.customer_name,
      website: proposal.website,
      status: "onboarding",
      inbound_lead_id: proposal.inbound_lead_id,
      prospect_id: proposal.prospect_id,
      notes: null,
      created_at: nowIso(),
    };
    store.organizations.unshift(created);
    if (email) {
      const member: MemberRow = {
        id: newId(),
        organization_id: created.id,
        name: proposal.customer_name,
        email,
        role: "owner",
        access_enabled: true,
      };
      store.members.push(member);
    }
    return { ok: true as const, organizationId: created.id };
  });
}

async function persistMaterialized(
  supabase: SupabaseClient | null,
  proposal: ProposalRow,
  materialized: ReturnType<typeof materializeAcceptedProposal>
) {
  if (supabase) {
    await supabase
      .from("proposals")
      .update({
        updated_at: materialized.proposalPatch.updated_at,
        customer_id: materialized.proposalPatch.organization_id,
        status: "ACCEPTED",
      })
      .eq("id", proposal.id);
    if (!materialized.already) {
      const { error } = await supabase.from("kopvast_orders").insert(materialized.order);
      if (error) {
        if (error.message.includes("proposal_id") || error.code === "23505") {
          const { data } = await supabase.from("kopvast_orders").select("id").eq("proposal_id", proposal.id).maybeSingle();
          if (data?.id) return { ok: true as const, orderId: String(data.id), already: true };
        }
        console.error("[kopvast] Opdracht opslaan mislukt", error.message);
        return fail("Opdracht opslaan is mislukt.");
      }
    }
    const { data: onboarding } = await supabase.from("kopvast_onboardings").select("id").eq("order_id", materialized.order.id).maybeSingle();
    if (!onboarding) {
      const { error } = await supabase.from("kopvast_onboardings").insert(materialized.onboarding);
      if (error) console.info("[kopvast] Order-onboarding overgeslagen", error.message);
    }
    const { data: website } = await supabase.from("kopvast_websites").select("id").eq("order_id", materialized.order.id).maybeSingle();
    if (!website) await supabase.from("kopvast_websites").insert(materialized.website);
    if (materialized.activity) await supabase.from("kopvast_order_activities").insert(materialized.activity);
    return { ok: true as const, orderId: materialized.order.id, already: materialized.already };
  }

  await mutateStore((store) => {
    const proposalRow = store.proposals.find((item) => item.id === proposal.id);
    if (proposalRow) Object.assign(proposalRow, materialized.proposalPatch);
    if (!store.orders.some((item) => item.id === materialized.order.id || item.proposal_id === proposal.id)) {
      store.orders.unshift(materialized.order);
    }
    if (!store.onboardings.some((item) => item.order_id === materialized.order.id)) store.onboardings.push(materialized.onboarding);
    if (!store.orderWebsites.some((item) => item.order_id === materialized.order.id)) store.orderWebsites.push(materialized.website);
    if (materialized.activity && !store.orderActivities.some((item) => item.id === materialized.activity?.id)) {
      store.orderActivities.unshift(materialized.activity);
    }
  });
  return { ok: true as const, orderId: materialized.order.id, already: materialized.already };
}

export async function createOrderFromAcceptedProposal(
  proposalId: string,
  actorEmail: string,
  targetLiveAt?: string | null
): Promise<ActionResult<{ orderId: string; already?: boolean }>> {
  const supabase = refreshClient();
  let proposal: ProposalRow | null = null;
  let existingOrder: OrderRow | null = null;
  let existingOnboarding: OnboardingRow | null = null;
  let existingWebsite: OrderWebsiteRow | null = null;
  let existingInvoices: InvoiceRow[] = [];
  let orderNumbers: string[] = [];

  if (supabase) {
    proposal = await loadLiveOrderProposal(proposalId);
    const { data: orderRow } = await supabase.from("kopvast_orders").select("*").eq("proposal_id", proposalId).maybeSingle();
    existingOrder = orderRow ? mapOrder(orderRow as Record<string, unknown>) : null;
    if (existingOrder) {
      const [onboarding, website] = await Promise.all([
        supabase.from("kopvast_onboardings").select("*").eq("order_id", existingOrder.id).maybeSingle(),
        supabase.from("kopvast_websites").select("*").eq("order_id", existingOrder.id).maybeSingle(),
      ]);
      existingOnboarding = onboarding.data ? mapOnboarding(onboarding.data as Record<string, unknown>) : null;
      existingWebsite = website.data ? mapWebsite(website.data as Record<string, unknown>) : null;
    }
    const { data: numbers } = await supabase.from("kopvast_orders").select("order_number");
    orderNumbers = (numbers ?? []).map((item) => String(item.order_number));
  } else {
    const store = await readStore();
    proposal = store.proposals.find((item) => item.id === proposalId) ?? (await loadLiveOrderProposal(proposalId));
    existingOrder = store.orders.find((item) => item.proposal_id === proposalId) ?? null;
    if (existingOrder) {
      existingOnboarding = store.onboardings.find((item) => item.order_id === existingOrder?.id) ?? null;
      existingWebsite = store.orderWebsites.find((item) => item.order_id === existingOrder?.id) ?? null;
      existingInvoices = store.invoices.filter((item) => item.order_id === existingOrder?.id);
    }
    orderNumbers = store.orders.map((item) => item.order_number);
  }

  if (!proposal) return fail("Voorstel niet gevonden.");
  if (proposal.status !== "ACCEPTED") return fail("Alleen een geaccepteerd voorstel wordt een opdracht.");

  const customer = await resolveCustomerFromProposal(proposal);
  if (!customer.ok) return customer;

  const materialized = materializeAcceptedProposal({
    proposal,
    organizationId: customer.organizationId,
    existingOrderNumbers: orderNumbers,
    existing: { order: existingOrder, onboarding: existingOnboarding, website: existingWebsite, invoices: existingInvoices },
    actorEmail,
    targetLiveAt,
  });

  const persisted = await persistMaterialized(supabase, proposal, materialized);
  if (!persisted.ok) return persisted;
  await ensureProjectsForOrder(customer.organizationId, materialized.order);
  await seedBillingFromOrder(materialized.order);
  return { ok: true, orderId: persisted.orderId, already: persisted.already };
}

export type CreateAgreementInput = {
  organizationId?: string;
  leadId?: string;
  customerName?: string;
  customerEmail?: string;
  companyName?: string;
  website?: string;
  productType?: string;
  priceAmount?: string;
  includeRecurringBeheer?: boolean;
  scope?: string;
  targetLiveAt?: string;
  actorEmail: string;
};

function proposalFromLead(lead: LeadRow, productType: OrderProductType): Partial<CreateAgreementInput> {
  return {
    leadId: lead.id,
    customerName: lead.name,
    customerEmail: lead.email,
    companyName: lead.company_name ?? lead.name,
    website: lead.website ?? undefined,
    productType: lead.type === "maatwerk" ? "maatwerk" : productType,
  };
}

export async function createOrderFromAgreement(input: CreateAgreementInput): Promise<ActionResult<{ orderId: string; already?: boolean }>> {
  const productType = input.productType ?? "website";
  if (!isOrderProductType(productType)) return fail("Onbekend product.");

  let lead: LeadRow | null = null;
  if (input.leadId) {
    lead = await loadLead(input.leadId);
    if (!lead) return fail("Aanvraag niet gevonden.");
  }

  const fromLead = lead ? proposalFromLead(lead, productType) : {};
  const organization = input.organizationId ? await loadOrganization(input.organizationId) : null;
  const customerName = (input.customerName || fromLead.customerName || organization?.name || "").trim();
  const customerEmail = normalizeEmail(input.customerEmail || fromLead.customerEmail || "");
  const companyName = (input.companyName || fromLead.companyName || organization?.name || customerName).trim();
  const website = (input.website || fromLead.website || organization?.website || "").trim() || null;
  if (!customerName) return fail("Geef een klantnaam.");
  if (customerEmail && !isEmail(customerEmail)) return fail("E-mailadres klopt niet.");

  const defaults = productDefaults(productType);
  const amount = input.priceAmount ? parseAmount(input.priceAmount) : defaults.amount;
  const includeRecurring = input.includeRecurringBeheer ?? defaults.recurring;
  const now = nowIso();
  const title = `${defaults.label} — ${companyName || customerName}`;

  const supabase = refreshClient();
  if (lead) {
    const existing = await loadOrderByLead(lead.id);
    if (existing && existing.product_type === productType) {
      const reused = await createOrderFromAcceptedProposal(existing.proposal_id, input.actorEmail, input.targetLiveAt || null);
      return reused;
    }
  }

  const proposal: ProposalRow = {
    id: newId(),
    created_at: now,
    updated_at: now,
    organization_id: organization?.id ?? null,
    inbound_lead_id: lead?.id ?? null,
    prospect_id: organization?.prospect_id ?? null,
    customer_name: customerName,
    customer_email: customerEmail || null,
    company_name: companyName || null,
    website,
    product_type: productType,
    title,
    status: "ACCEPTED",
    price_amount: amount,
    price_label: null,
    price_cadence: defaults.cadence,
    include_recurring_beheer: includeRecurring,
    recurring_price_amount: includeRecurring ? 199 : null,
    recurring_price_label: includeRecurring ? priceLabel(199, productDefaults("beheer").cadence) : null,
    scope: (input.scope ?? "").trim() || defaults.label,
    snapshot: {},
    accepted_at: now,
  };

  if (supabase) {
    const { createProposal } = await import("@/lib/proposal-ops");
    const created = await createProposal({
      type: productType === "website" ? "website" : "maatwerk",
      recipientName: customerName,
      recipientEmail: customerEmail || "onbekend@kopvast.nl",
      recipientOrganization: companyName || customerName,
      leadId: lead?.id,
      organizationId: organization?.id,
      createdBy: input.actorEmail,
    });
    if (!created.ok) return created;
    proposal.id = created.id;
    await supabase
      .from("proposals")
      .update({
        status: "ACCEPTED",
        accepted_at: now,
        accepted_by_name: customerName,
        accepted_by_email: customerEmail || null,
        customer_id: organization?.id ?? null,
        updated_at: now,
      })
      .eq("id", created.id);
  } else {
    await mutateStore((store) => {
      store.proposals.unshift(proposal);
    });
  }

  return createOrderFromAcceptedProposal(proposal.id, input.actorEmail, input.targetLiveAt || null);
}

async function addActivity(row: Omit<OrderActivityRow, "id" | "created_at"> & { id?: string; created_at?: string }) {
  const record: OrderActivityRow = {
    id: row.id ?? newId(),
    created_at: row.created_at ?? nowIso(),
    order_id: row.order_id,
    event_type: row.event_type,
    actor_type: row.actor_type,
    actor_id: row.actor_id,
    old_status: row.old_status,
    new_status: row.new_status,
    body: row.body,
    metadata: row.metadata,
  };
  const supabase = refreshClient();
  if (supabase) {
    await supabase.from("kopvast_order_activities").insert(record);
    return;
  }
  await mutateStore((store) => {
    store.orderActivities.unshift(record);
  });
}

export async function updateOrderStatus(input: {
  orderId: string;
  status: string;
  override?: boolean;
  actorEmail: string;
}): Promise<ActionResult<{ skipped: string[] }>> {
  const detail = await loadOrderDetail(input.orderId);
  if (!detail) return fail("Opdracht niet gevonden.");
  const evaluated = evaluateStatusChange({
    from: detail.order.status,
    to: input.status,
    visited: detail.order.visited_statuses,
    override: input.override,
  });
  if (!evaluated.ok) return fail(evaluated.message);
  if (evaluated.status === detail.order.status) return { ok: true, skipped: [] };

  const visited = recordVisited(detail.order.visited_statuses, evaluated.status);
  const patch = {
    status: evaluated.status,
    visited_statuses: visited,
    updated_at: nowIso(),
  };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_orders").update(patch).eq("id", input.orderId);
    if (error) return fail(error.message);
    if (detail.website) {
      await supabase
        .from("kopvast_websites")
        .update({ status: websiteStatusForOrder(evaluated.status), updated_at: nowIso() })
        .eq("id", detail.website.id);
    }
  } else {
    await mutateStore((store) => {
      const order = store.orders.find((item) => item.id === input.orderId);
      if (!order) return;
      order.status = evaluated.status;
      order.visited_statuses = visited;
      order.updated_at = patch.updated_at;
      const website = store.orderWebsites.find((item) => item.order_id === order.id);
      if (website) website.status = websiteStatusForOrder(evaluated.status);
    });
  }

  await addActivity({
    order_id: input.orderId,
    event_type: evaluated.override ? ORDER_ACTIVITY.OVERRIDE_USED : ORDER_ACTIVITY.STATUS_CHANGED,
    actor_type: "human",
    actor_id: input.actorEmail,
    old_status: detail.order.status,
    new_status: evaluated.status,
    body: evaluated.override
      ? `Status overschreven naar ${labelForOrderStatus(evaluated.status)}.`
      : `Status gewijzigd naar ${labelForOrderStatus(evaluated.status)}.`,
    metadata: { skipped: evaluated.skipped },
  });
  return { ok: true, skipped: evaluated.skipped };
}

export async function updateOrderNextAction(input: {
  orderId: string;
  text: string;
  at?: string;
  owner?: string;
  actorEmail: string;
}): Promise<ActionResult> {
  const parsed = parseNextActionInput(input);
  if (!parsed.ok) return fail(parsed.message);
  const order = await loadOrder(input.orderId);
  if (!order) return fail("Opdracht niet gevonden.");
  const patch = {
    next_action: parsed.text,
    next_action_at: parsed.at,
    next_action_owner: parsed.owner,
    updated_at: nowIso(),
  };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_orders").update(patch).eq("id", input.orderId);
    if (error) return fail(error.message);
  } else {
    await mutateStore((store) => {
      const row = store.orders.find((item) => item.id === input.orderId);
      if (!row) return;
      Object.assign(row, patch);
    });
  }
  await addActivity({
    order_id: input.orderId,
    event_type: ORDER_ACTIVITY.NEXT_ACTION_SET,
    actor_type: "human",
    actor_id: input.actorEmail,
    old_status: order.status,
    new_status: order.status,
    body: parsed.text,
    metadata: { at: parsed.at, owner: parsed.owner },
  });
  return { ok: true };
}

export async function updateOrderPlanning(input: {
  orderId: string;
  targetLiveAt?: string;
  productionNotes?: string;
  reviewNotes?: string;
  actorEmail: string;
}): Promise<ActionResult> {
  const order = await loadOrder(input.orderId);
  if (!order) return fail("Opdracht niet gevonden.");
  const patch = {
    target_live_at: (input.targetLiveAt ?? "").trim() || null,
    production_notes: (input.productionNotes ?? "").trim() || null,
    review_notes: (input.reviewNotes ?? "").trim() || null,
    updated_at: nowIso(),
  };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_orders").update(patch).eq("id", input.orderId);
    if (error) return fail(error.message);
  } else {
    await mutateStore((store) => {
      const row = store.orders.find((item) => item.id === input.orderId);
      if (!row) return;
      Object.assign(row, patch);
    });
  }
  await addActivity({
    order_id: input.orderId,
    event_type: ORDER_ACTIVITY.PLANNING_UPDATED,
    actor_type: "human",
    actor_id: input.actorEmail,
    old_status: order.status,
    new_status: order.status,
    body: "Planning of notities bijgewerkt.",
    metadata: patch,
  });
  return { ok: true };
}

export async function updateOnboardingProgress(input: {
  orderId: string;
  doneIds: string[];
  actorEmail: string;
}): Promise<ActionResult> {
  const detail = await loadOrderDetail(input.orderId);
  if (!detail?.onboarding) return fail("Onboarding ontbreekt.");
  const done = new Set(input.doneIds);
  const progress: OnboardingStep[] = detail.onboarding.progress.map((step) => ({ ...step, done: done.has(step.id) }));
  const status = progress.every((step) => step.done) ? "DONE" : progress.some((step) => step.done) ? "IN_PROGRESS" : "OPEN";
  const patch = { progress, status, updated_at: nowIso() };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_onboardings").update(patch).eq("id", detail.onboarding.id);
    if (error) return fail(error.message);
  } else {
    await mutateStore((store) => {
      const row = store.onboardings.find((item) => item.id === detail.onboarding?.id);
      if (!row) return;
      row.progress = progress;
      row.status = status;
      row.updated_at = patch.updated_at;
    });
  }
  await addActivity({
    order_id: input.orderId,
    event_type: ORDER_ACTIVITY.ONBOARDING_UPDATED,
    actor_type: "human",
    actor_id: input.actorEmail,
    old_status: detail.order.status,
    new_status: detail.order.status,
    body: `Onboarding ${status === "DONE" ? "afgerond" : "bijgewerkt"}.`,
    metadata: { done: progress.filter((step) => step.done).map((step) => step.id) },
  });
  return { ok: true };
}

export async function updateOrderWebsite(input: {
  orderId: string;
  domain?: string;
  actorEmail: string;
}): Promise<ActionResult> {
  const detail = await loadOrderDetail(input.orderId);
  if (!detail?.website) return fail("Websitekoppeling ontbreekt.");
  const domain = (input.domain ?? "").trim() || null;
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase
      .from("kopvast_websites")
      .update({ domain, updated_at: nowIso() })
      .eq("id", detail.website.id);
    if (error) return fail(error.message);
  } else {
    await mutateStore((store) => {
      const row = store.orderWebsites.find((item) => item.id === detail.website?.id);
      if (row) row.domain = domain;
    });
  }
  await addActivity({
    order_id: input.orderId,
    event_type: ORDER_ACTIVITY.WEBSITE_UPDATED,
    actor_type: "human",
    actor_id: input.actorEmail,
    old_status: detail.order.status,
    new_status: detail.order.status,
    body: domain ? `Website ${domain}` : "Website bijgewerkt.",
    metadata: { domain },
  });
  return { ok: true };
}

export async function loadDueOrderActions() {
  const today = nowIso().slice(0, 10);
  const orders = await loadOrders("alles");
  return orders.filter((order) => order.next_action && order.next_action_at && order.next_action_at <= today && order.status !== "COMPLETED");
}
