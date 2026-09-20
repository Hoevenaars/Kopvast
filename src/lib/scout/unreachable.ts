import { buildUnreachableSiteMail } from "@/lib/acquisition/unreachable-site-mail";
import { appendEvent, getDraft, upsertDraft } from "./leads";
import type { ScoutLead } from "./types";

export async function ensureScoutUnreachableDraft(lead: ScoutLead) {
  const generated = buildUnreachableSiteMail({
    domain: lead.domain,
    companyName: lead.company_name,
  });
  const existing = await getDraft(lead.id);
  const draft = await upsertDraft(lead.id, { subject: generated.subject, message: generated.body });
  if (!existing) {
    await appendEvent({
      lead_id: lead.id,
      event_type: "draft_generated",
      actor_type: "human",
      metadata: { reason: "unreachable_site" },
    });
  }
  if (lead.prospect_id) {
    const { ensureUnreachableSiteMail } = await import("@/lib/acquisition-send");
    await ensureUnreachableSiteMail(lead.prospect_id, "kopvast-scout");
  }
  return draft;
}
