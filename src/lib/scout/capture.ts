import { after } from "next/server";
import { parseScoutUrl } from "./urls";
import { findLeadByDomain, findProspectDuplicate, insertLead, toDuplicate, appendEvent } from "./leads";
import { enqueuePipelineJob } from "./jobs";
import { processScoutJobs } from "./pipeline";
import { consumeRateLimit, rateLimitMessage } from "./rate-limit";
import type { PushLeadResult, ScoutSource, ScoutUser } from "./types";

export async function pushScoutLead(input: {
  user: ScoutUser;
  website: string;
  note?: string | null;
  source: ScoutSource;
  forceRescanOf?: string;
}): Promise<PushLeadResult> {
  let parsed: ReturnType<typeof parseScoutUrl>;
  try {
    parsed = parseScoutUrl(input.website);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Dit websiteadres is niet geldig." };
  }

  const limited = await consumeRateLimit("lead_create", input.user.id);
  if (!limited.ok) return { ok: false, message: rateLimitMessage(limited.retryAfterSec) };

  const existing = await findLeadByDomain(input.user.id, parsed.domain);
  if (existing && existing.id !== input.forceRescanOf) {
    return { ok: false, duplicate: true, existing: toDuplicate(existing) };
  }
  if (!existing) {
    const prospect = await findProspectDuplicate(parsed.domain);
    if (prospect && prospect.id !== input.forceRescanOf) {
      return { ok: false, duplicate: true, existing: prospect };
    }
  }

  const note = input.note?.trim() || null;
  const lead = existing
    ? existing
    : await insertLead({
        user: input.user,
        url: parsed.normalized,
        domain: parsed.domain,
        canonicalUrl: parsed.canonicalUrl,
        note,
        source: input.source,
      });

  if (!existing) {
    await appendEvent({
      lead_id: lead.id,
      event_type: "lead_created",
      actor_type: "human",
      metadata: { source: input.source, domain: parsed.domain },
    });
  }

  await enqueuePipelineJob(lead.id, existing ? "rescan" : "create");
  after(() =>
    processScoutJobs(2).catch((error) => console.error("[scout] job", error instanceof Error ? error.message : error))
  );
  return { ok: true, leadId: lead.id };
}

export async function rescanScoutLead(input: { user: ScoutUser; leadId: string }) {
  const limited = await consumeRateLimit("rescan", input.user.id);
  if (!limited.ok) return { ok: false as const, message: rateLimitMessage(limited.retryAfterSec) };
  const { getLead, appendEvent, updateLead } = await import("./leads");
  const lead = await getLead(input.user.id, input.leadId);
  if (!lead) return { ok: false as const, message: "Lead niet gevonden." };
  await updateLead(lead.id, { status: "scannen", pipeline_stage: "scan", last_error: null });
  await appendEvent({ lead_id: lead.id, event_type: "rescan_requested", actor_type: "human", metadata: {} });
  await enqueuePipelineJob(lead.id, "rescan");
  after(() =>
    processScoutJobs(2).catch((error) => console.error("[scout] job", error instanceof Error ? error.message : error))
  );
  return { ok: true as const, leadId: lead.id };
}
