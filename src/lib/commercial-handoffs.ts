import { logProspectActivity } from "@/lib/acquisition-activity";
import { cancelPendingAutoFollowUp } from "@/lib/acquisition/follow-up";
import { publicCheckUrl, type ProductFit } from "@/lib/acquisition-constants";
import { convertProspectToLead, loadProspectDetail } from "@/lib/acquisition";
import { loadAanvraag, saveAanvraagNextAction, updateAanvraagQualification } from "@/lib/aanvragen";
import { AANVRAAG_ACTIVITY } from "@/lib/aanvragen-model";
import {
  COMMERCIAL_EVENTS,
  NEXT_ACTIONS,
  intentFromAcquisitionChoice,
  nextActionAfterAccept,
  nextActionForHandoff,
  requestStatusForIntent,
  type CommercialIntent,
} from "@/lib/commercial";
import { linkProspectAndRequest, normalizeEmailAddress, resolveCommercialIdentity } from "@/lib/identity";
import { persistInboundLead } from "@/lib/inbound";
import { createOrderFromAcceptedProposal } from "@/lib/order-ops";
import { isOrderProductType, type OrderProductType, type ProposalRow as OrderProposalRow } from "@/lib/orders";
import { createProposal, findActiveProposalForRequest, handleAcceptedProposal, loadProposal } from "@/lib/proposal-ops";
import type { ProposalRow } from "@/lib/proposals";
import { centsToEuros } from "@/lib/proposals";
import { refreshClient } from "@/lib/refresh";
import { site } from "@/lib/site";

export type HandoffResult<T extends object = object> = { ok: true } & T | { ok: false; message: string };

function fail(message: string): { ok: false; message: string } {
  return { ok: false, message };
}

async function logLeadActivity(input: {
  leadId: string;
  eventType: string;
  actor?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = refreshClient();
  if (!supabase) return;
  await supabase.from("kopvast_lead_activities").insert({
    inbound_lead_id: input.leadId,
    event_type: input.eventType,
    actor_type: "system",
    actor_id: input.actor ?? "kopvast.nl",
    metadata: input.metadata ?? {},
  });
}

async function markProspectIntent(input: {
  prospectId: string;
  intent: CommercialIntent;
  stage: "ENGAGED" | "REQUESTED";
  nextAction: string;
  responseStatus: "POSITIVE" | "QUESTION";
}) {
  const supabase = refreshClient();
  if (!supabase) return;
  const now = new Date().toISOString();
  await supabase
    .from("prospects")
    .update({
      commercial_intent: input.intent,
      commercial_stage: input.stage,
      response_status: input.responseStatus,
      next_action: input.nextAction,
      next_action_at: now,
      last_activity_at: now,
      updated_at: now,
    })
    .eq("id", input.prospectId);
}

export async function resolveOrCreateRequest(input: {
  prospectId: string;
  intent: CommercialIntent;
  actorEmail?: string;
}): Promise<HandoffResult<{ requestId: string; already?: boolean }>> {
  const detail = await loadProspectDetail(input.prospectId);
  if (!detail) return fail("Prospect niet gevonden.");
  if (detail.inbound_lead_id) {
    return { ok: true, requestId: detail.inbound_lead_id, already: true };
  }

  const email = detail.contact?.email;
  if (email) {
    const converted = await convertProspectToLead({
      prospectId: input.prospectId,
      actorEmail: input.actorEmail ?? "kopvast.nl",
    });
    if (converted.ok) {
      const status = requestStatusForIntent({ intent: input.intent, productFit: detail.product_fit });
      await updateAanvraagQualification({
        id: converted.leadId,
        status,
        productFit: detail.product_fit ?? "",
        qualificationNotes: "",
        actorEmail: input.actorEmail ?? "kopvast.nl",
      }).catch(() => null);
      return { ok: true, requestId: converted.leadId, already: converted.already };
    }
  }

  if (!email) return fail("Er is nog geen e-mailadres om een aanvraag aan te koppelen.");

  const created = await persistInboundLead({
    id: crypto.randomUUID(),
    name: detail.company_name || detail.domain,
    email,
    company: detail.company_name || detail.domain,
    website: detail.website_url || detail.domain,
    message: input.intent === "PROPOSAL" ? "Klik: Ja, doe me een voorstel" : "Klik: Stuur me eerst meer info",
    source: input.intent === "PROPOSAL" ? "acquisitie-voorstel" : "acquisitie-info",
    phone: "",
    details: {
      Keuze: input.intent === "PROPOSAL" ? "Voorstel" : "Meer info",
      prospect_id: detail.id,
    },
  });
  if (!created) return fail("Aanvraag aanmaken is mislukt.");
  await linkProspectAndRequest({ prospectId: detail.id, requestId: created });
  return { ok: true, requestId: created };
}

export async function handleAcquisitionChoice(input: {
  prospectId: string;
  choice: string;
}): Promise<HandoffResult<{ requestId: string | null; redirectTo: string; already?: boolean }>> {
  const detail = await loadProspectDetail(input.prospectId);
  if (!detail) return fail("Prospect niet gevonden.");

  const intent = intentFromAcquisitionChoice(input.choice);
  const hasAnalysis = Boolean(detail.findings.length || detail.scan?.status === "completed");
  const nextAction = nextActionForHandoff({
    intent,
    productFit: detail.product_fit,
    hasAnalysis,
  });
  const supabase = refreshClient();

  await markProspectIntent({
    prospectId: detail.id,
    intent,
    stage: intent === "PROPOSAL" ? "REQUESTED" : "ENGAGED",
    nextAction,
    responseStatus: intent === "PROPOSAL" ? "POSITIVE" : "QUESTION",
  });
  await cancelPendingAutoFollowUp(detail.id, intent);

  if (supabase) {
    await logProspectActivity(supabase, {
      prospectId: detail.id,
      eventType: intent === "PROPOSAL" ? COMMERCIAL_EVENTS.OUTREACH_PROPOSAL_REQUEST : COMMERCIAL_EVENTS.OUTREACH_MORE_INFO,
      actorType: "user",
      actorId: intent,
      newStatus: detail.status,
      metadata: { intent, nextAction },
    });
  }

  let requestId: string | null = detail.inbound_lead_id;
  let already = Boolean(requestId);
  if (intent === "PROPOSAL") {
    const request = await resolveOrCreateRequest({ prospectId: detail.id, intent });
    if (request.ok) {
      requestId = request.requestId;
      already = Boolean(request.already);
      await saveAanvraagNextAction({
        id: request.requestId,
        nextAction: NEXT_ACTIONS.MAKE_PROPOSAL,
        nextActionAt: new Date().toISOString(),
        actorEmail: "kopvast.nl",
      }).catch(() => null);
      await logLeadActivity({
        leadId: request.requestId,
        eventType: AANVRAAG_ACTIVITY.REQUEST_CREATED,
        metadata: { source: "acquisition_choice", intent },
      });
    }
  }

  const checkToken = detail.public_check_token;
  const redirectTo =
    intent === "MORE_INFO" && checkToken
      ? publicCheckUrl(checkToken, site.url)
      : `${site.url}/start?keuze=${intent === "MORE_INFO" ? "info" : "voorstel"}${detail.domain ? `&website=${encodeURIComponent(detail.domain)}` : ""}${detail.company_name ? `&bedrijf=${encodeURIComponent(detail.company_name)}` : ""}`;

  return { ok: true, requestId, redirectTo, already };
}

export async function createProposalFromRequest(
  requestId: string,
  actorEmail: string
): Promise<HandoffResult<{ id: string; already?: boolean }>> {
  const existing = await findActiveProposalForRequest(requestId);
  if (existing) return { ok: true, id: existing, already: true };

  const lead = await loadAanvraag(requestId);
  if (!lead) return fail("Aanvraag niet gevonden.");
  if (lead.prospect_id) await cancelPendingAutoFollowUp(lead.prospect_id, "proposal");

  const created = await createProposal({
    type: lead.type === "website" ? "website" : "maatwerk",
    recipientName: lead.name,
    recipientEmail: lead.email,
    recipientOrganization: lead.company_name || lead.name,
    leadId: lead.id,
    createdBy: actorEmail,
  });
  if (!created.ok) return created;

  await updateAanvraagQualification({
    id: lead.id,
    status: "PROPOSAL_NEEDED",
    productFit: lead.product_fit ?? "",
    qualificationNotes: lead.qualification_notes ?? "",
    actorEmail,
  }).catch(() => null);
  await saveAanvraagNextAction({
    id: lead.id,
    nextAction: NEXT_ACTIONS.MAKE_PROPOSAL,
    nextActionAt: new Date().toISOString(),
    actorEmail,
  }).catch(() => null);
  await logLeadActivity({
    leadId: lead.id,
    eventType: AANVRAAG_ACTIVITY.PROPOSAL_CREATED,
    actor: actorEmail,
    metadata: { proposal_id: created.id },
  });
  return { ok: true, id: created.id };
}

export function liveProposalToOrderProposal(proposal: ProposalRow): OrderProposalRow {
  const productType: OrderProductType = isOrderProductType(proposal.type) ? proposal.type : "maatwerk";
  const amount = centsToEuros(proposal.subtotal_cents);
  const recurring = centsToEuros(proposal.recurring_monthly_cents);
  return {
    id: proposal.id,
    created_at: proposal.created_at,
    updated_at: proposal.updated_at,
    organization_id: proposal.organization_id,
    inbound_lead_id: proposal.inbound_lead_id,
    prospect_id: proposal.prospect_id,
    customer_name: proposal.recipient_name || proposal.recipient_organization,
    customer_email: normalizeEmailAddress(proposal.recipient_email),
    company_name: proposal.recipient_organization,
    website: null,
    product_type: productType,
    title: proposal.title,
    status: proposal.status === "ACCEPTED" ? "ACCEPTED" : "DRAFT",
    price_amount: amount || null,
    price_label: amount ? `€${amount}` : null,
    price_cadence: "eenmalig, excl. btw",
    include_recurring_beheer: recurring > 0,
    recurring_price_amount: recurring || null,
    recurring_price_label: recurring ? `€${recurring}` : null,
    scope: proposal.scope_summary || proposal.aanleiding || null,
    snapshot: {},
    accepted_at: proposal.accepted_at,
  };
}

async function seedDeliveryAfterAccept(input: {
  organizationId: string;
  requestId?: string | null;
  prospectId?: string | null;
  orderCreated: boolean;
}) {
  const { loadProjects } = await import("@/lib/workspace");
  const { ensureOnboardingsForProjects } = await import("@/lib/onboarding-store");
  const { ensureProductions } = await import("@/lib/production-board");
  const projects = (await loadProjects()).filter((item) => item.organization_id === input.organizationId);
  if (projects.length) {
    await ensureOnboardingsForProjects(projects);
    const { seedBillingForProjects } = await import("@/lib/billing");
    await seedBillingForProjects(projects);
  }
  await ensureProductions();

  const nextAction = nextActionAfterAccept(input.orderCreated);
  if (input.requestId) {
    await saveAanvraagNextAction({
      id: input.requestId,
      nextAction,
      nextActionAt: new Date().toISOString(),
      actorEmail: "kopvast.nl",
    }).catch(() => null);
  }

  const supabase = refreshClient();
  if (supabase && input.prospectId) {
    const now = new Date().toISOString();
    await supabase
      .from("prospects")
      .update({
        commercial_stage: input.orderCreated ? "CUSTOMER" : "WON",
        commercial_intent: "PROPOSAL",
        next_action: nextAction,
        next_action_at: now,
        last_activity_at: now,
        updated_at: now,
      })
      .eq("id", input.prospectId);
  }
}

export async function afterProposalAccepted(
  proposalId: string
): Promise<HandoffResult<{ organizationId: string; orderId?: string; already?: boolean }>> {
  const handoff = await handleAcceptedProposal(proposalId);
  if (!handoff.ok) return handoff;

  const detail = await loadProposal(proposalId);
  if (!detail) return { ok: true, organizationId: handoff.organizationId, already: handoff.already };

  const order = await createOrderFromAcceptedProposal(proposalId, detail.proposal.accepted_by_email || "kopvast.nl");
  if (!order.ok) {
    const supabase = refreshClient();
    if (supabase) {
      await supabase.from("activity_logs").insert({
        entity_type: "proposal",
        entity_id: proposalId,
        event_type: "ORDER_HANDOFF_FAILED",
        actor_type: "system",
        actor_id: "kopvast.nl",
        metadata: { message: order.message, organizationId: handoff.organizationId },
      });
    } else {
      const { appendOrgActivity } = await import("@/lib/workspace");
      await appendOrgActivity({
        organizationId: handoff.organizationId,
        source: "order",
        eventType: "ORDER_HANDOFF_FAILED",
        title: "Opdracht maken mislukt",
        detail: order.message,
        relatedId: proposalId,
      });
    }
    await seedDeliveryAfterAccept({
      organizationId: handoff.organizationId,
      requestId: detail.proposal.inbound_lead_id,
      prospectId: detail.proposal.prospect_id,
      orderCreated: false,
    });
    return { ok: true, organizationId: handoff.organizationId, already: handoff.already };
  }

  await seedDeliveryAfterAccept({
    organizationId: handoff.organizationId,
    requestId: detail.proposal.inbound_lead_id,
    prospectId: detail.proposal.prospect_id,
    orderCreated: true,
  });
  return {
    ok: true,
    organizationId: handoff.organizationId,
    orderId: order.orderId,
    already: Boolean(handoff.already || order.already),
  };
}

export async function attachInboundLeadToProspect(input: {
  requestId?: string | null;
  email?: string | null;
  website?: string | null;
  organization?: string | null;
  prospectId?: string | null;
}) {
  if (!input.requestId) return;
  const match = input.prospectId
    ? { kind: "unique" as const, prospectId: input.prospectId, reason: "prospect_id" as const }
    : await resolveCommercialIdentity({
        email: input.email,
        website: input.website,
        organization: input.organization,
      });
  if (match.kind !== "unique") return;
  await linkProspectAndRequest({ prospectId: match.prospectId, requestId: input.requestId });
}

export async function loadPublicCheck(token: string) {
  const match = await resolveCommercialIdentity({ token });
  if (match.kind !== "unique") return null;
  const detail = await loadProspectDetail(match.prospectId);
  if (!detail || detail.public_check_token !== token) return null;
  return {
    token,
    prospectId: detail.id,
    company: detail.company_name || detail.domain,
    website: detail.website_url || detail.domain,
    observation: detail.findings.find((item) => item.finding_type !== "HYPOTHESIS")?.description || null,
    findings: detail.findings.slice(0, 3).map((item) => ({
      title: item.title,
      description: item.description,
    })),
    productFit: detail.product_fit as ProductFit | null,
    hasAnalysis: detail.findings.length > 0,
    scanFailed: detail.scan?.status === "failed" || detail.status === "SCAN_FAILED",
    proposalHref: `${site.url}/start?keuze=voorstel&website=${encodeURIComponent(detail.domain)}&bedrijf=${encodeURIComponent(detail.company_name || "")}`,
  };
}
