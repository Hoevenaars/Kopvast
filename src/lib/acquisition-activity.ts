import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTIVITY } from "./acquisition-constants";

export type ActivityActorType = "system" | "agent" | "human" | "webhook";

export async function logProspectActivity(
  supabase: SupabaseClient,
  input: {
    prospectId: string;
    eventType: (typeof ACTIVITY)[keyof typeof ACTIVITY] | string;
    actorType?: ActivityActorType;
    actorId?: string | null;
    oldStatus?: string | null;
    newStatus?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("activity_logs").insert({
    prospect_id: input.prospectId,
    event_type: input.eventType,
    actor_type: input.actorType ?? "system",
    actor_id: input.actorId ?? "kopvast.nl",
    old_status: input.oldStatus ?? null,
    new_status: input.newStatus ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) console.error("[kopvast] Activity log mislukt", error.message);

  await supabase
    .from("prospects")
    .update({
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.prospectId);
}

export async function refreshProspectCosts(supabase: SupabaseClient, prospectId: string) {
  const { data } = await supabase.from("cost_events").select("cost_type, amount").eq("prospect_id", prospectId);
  const rows = (data ?? []) as Array<{ cost_type: string; amount: number | string }>;
  let scan = 0;
  let ai = 0;
  let email = 0;
  for (const row of rows) {
    const amount = Number(row.amount) || 0;
    if (row.cost_type === "ai") ai += amount;
    else if (row.cost_type === "email") email += amount;
    else scan += amount;
  }
  await supabase
    .from("prospects")
    .update({
      scan_cost: scan,
      ai_cost: ai,
      email_cost: email,
      total_cost: scan + ai + email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", prospectId);
}
