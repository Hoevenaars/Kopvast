import type { ProductFit } from "@/lib/acquisition-constants";

/**
 * Shared commercial contracts for Kopvast V1.
 * These sit above existing objects (prospect, inbound_lead, proposal, order)
 * and must not become a second CRM or state machine.
 */

export const commercialIntents = [
  { value: "NONE", label: "Geen" },
  { value: "MORE_INFO", label: "Meer info" },
  { value: "PROPOSAL", label: "Voorstel" },
] as const;

export type CommercialIntent = (typeof commercialIntents)[number]["value"];

export const commercialStages = [
  { value: "PROSPECT", label: "Prospect" },
  { value: "ENGAGED", label: "Geïnteresseerd" },
  { value: "REQUESTED", label: "Aanvraag" },
  { value: "QUALIFIED", label: "Gekwalificeerd" },
  { value: "PROPOSAL", label: "Voorstel" },
  { value: "WON", label: "Akkoord" },
  { value: "CUSTOMER", label: "Klant" },
] as const;

export type CommercialStage = (typeof commercialStages)[number]["value"];

export const COMMERCIAL_EVENTS = {
  PROSPECT_CREATED: "PROSPECT_CREATED",
  OUTREACH_SENT: "MAIL_SENT",
  OUTREACH_MORE_INFO: "OUTREACH_MORE_INFO",
  OUTREACH_PROPOSAL_REQUEST: "OUTREACH_PROPOSAL_REQUEST",
  WEBSITE_CHECK_REQUESTED: "WEBSITE_CHECK_REQUESTED",
  SCAN_COMPLETED: "SCAN_COMPLETED",
  REQUEST_CREATED: "REQUEST_CREATED",
  REQUEST_QUALIFIED: "REQUEST_QUALIFIED",
  CALL_NOTE_ADDED: "CALL_NOTE_SAVED",
  PROPOSAL_CREATED: "PROPOSAL_CREATED",
  PROPOSAL_SENT: "PROPOSAL_SENT",
  PROPOSAL_VIEWED: "PROPOSAL_VIEWED",
  PROPOSAL_QUESTION: "PROPOSAL_QUESTION",
  PROPOSAL_ACCEPTED: "PROPOSAL_ACCEPTED",
  CUSTOMER_CREATED: "CUSTOMER_CREATED",
  ORDER_CREATED: "ORDER_CREATED",
  ONBOARDING_STARTED: "ONBOARDING_STARTED",
  ASSET_RECEIVED: "ASSET_RECEIVED",
  PRODUCTION_STARTED: "PRODUCTION_STARTED",
  REVIEW_SENT: "REVIEW_SENT",
  CHANGE_REQUEST_CREATED: "CHANGE_REQUEST_CREATED",
  FINAL_APPROVED: "FINAL_APPROVED",
  WEBSITE_LIVE: "WEBSITE_LIVE",
  INVOICE_STATUS_CHANGED: "INVOICE_STATUS_CHANGED",
  MANAGEMENT_STARTED: "MANAGEMENT_STARTED",
  SUPPORT_CREATED: "SUPPORT_CREATED",
} as const;

export const NEXT_ACTIONS = {
  MAKE_PROPOSAL: "Voorstel maken",
  FINISH_ANALYSIS: "Analyse handmatig afronden",
  CALL_CLIENT: "Klant bellen",
  WAIT_PHOTOS: "Wachten op foto's",
  SEND_CONCEPT: "Concept sturen",
  PROCESS_CHANGES: "Wijzigingen verwerken",
  CONNECT_DNS: "DNS koppelen",
  SEND_INVOICE: "Factuur sturen",
  START_ONBOARDING: "Onboarding starten",
  ANSWER_PROPOSAL: "Vraag over voorstel beantwoorden",
} as const;

export type CommercialSnapshot = {
  prospectStatus?: string | null;
  responseStatus?: string | null;
  requestStatus?: string | null;
  proposalStatus?: string | null;
  hasCustomer?: boolean;
  hasOrder?: boolean;
  productFit?: ProductFit | null;
  intent?: CommercialIntent | null;
};

export function isCommercialIntent(value: string | null | undefined): value is CommercialIntent {
  return commercialIntents.some((item) => item.value === value);
}

export function isCommercialStage(value: string | null | undefined): value is CommercialStage {
  return commercialStages.some((item) => item.value === value);
}

export function intentFromAcquisitionChoice(choice: string): CommercialIntent {
  return choice === "info" || choice === "MORE_INFO" ? "MORE_INFO" : "PROPOSAL";
}

export function deriveCommercialStage(input: CommercialSnapshot): CommercialStage {
  if (input.hasOrder || input.hasCustomer || input.requestStatus === "OMGEZET") return "CUSTOMER";
  if (input.proposalStatus === "ACCEPTED" || input.requestStatus === "GEWONNEN") return "WON";
  if (input.proposalStatus && input.proposalStatus !== "DRAFT" && input.proposalStatus !== "READY") return "PROPOSAL";
  if (input.proposalStatus === "DRAFT" || input.proposalStatus === "READY" || input.requestStatus === "PROPOSAL_NEEDED") {
    return "PROPOSAL";
  }
  if (input.requestStatus === "QUALIFIED" || input.requestStatus === "IN_GESPREK") return "QUALIFIED";
  if (input.requestStatus && !["VERLOREN", "AFGEWEZEN"].includes(input.requestStatus)) return "REQUESTED";
  if (input.intent === "PROPOSAL" || input.intent === "MORE_INFO" || input.responseStatus === "POSITIVE" || input.responseStatus === "QUESTION") {
    return "ENGAGED";
  }
  return "PROSPECT";
}

export function labelForCommercialStage(stage: string | null | undefined) {
  return commercialStages.find((item) => item.value === stage)?.label ?? stage ?? "Prospect";
}

export function requestStatusForIntent(input: {
  intent: CommercialIntent;
  productFit?: ProductFit | null;
}): string {
  if (input.intent !== "PROPOSAL") return "NIEUW";
  if (input.productFit === "CUSTOM_FIT" || input.productFit === "REVIEW_REQUIRED") return "MAATWERK_REVIEW";
  return "QUALIFIED";
}

export function nextActionForHandoff(input: {
  intent: CommercialIntent;
  productFit?: ProductFit | null;
  hasAnalysis?: boolean;
}): string {
  if (input.intent === "PROPOSAL") return NEXT_ACTIONS.MAKE_PROPOSAL;
  if (!input.hasAnalysis) return NEXT_ACTIONS.FINISH_ANALYSIS;
  return NEXT_ACTIONS.CALL_CLIENT;
}

export function serviceBoundaries() {
  return {
    prospect: "src/lib/acquisition.ts + src/lib/acquire.ts",
    request: "src/lib/aanvragen.ts + src/lib/inbound.ts + src/lib/leads.ts",
    proposal: "src/lib/proposal-ops.ts + src/lib/proposals.ts (table: proposals)",
    customer: "src/lib/customers.ts + src/lib/workspace.ts",
    order: "src/lib/order-ops.ts + src/lib/orders.ts",
    identity: "src/lib/identity.ts",
    handoffs: "src/lib/commercial-handoffs.ts",
  } as const;
}
