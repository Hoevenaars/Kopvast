import { newId, nowIso } from "@/lib/workspace-store";
import { scoutServiceClient } from "./auth";
import { mutateLocalScout, readLocalScout, type ScoutJob } from "./store";

export async function enqueuePipelineJob(leadId: string, reason: "create" | "rescan") {
  const now = nowIso();
  const row: ScoutJob = {
    id: newId(),
    lead_id: leadId,
    kind: "pipeline",
    status: "pending",
    attempts: 0,
    max_attempts: 4,
    run_after: now,
    idempotency_key: `${reason}:${leadId}:${now}`,
    last_error: null,
    locked_at: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  };

  const supabase = scoutServiceClient();
  if (supabase) {
    const { data: existing } = await supabase
      .from("scout_jobs")
      .select("*")
      .eq("lead_id", leadId)
      .eq("kind", "pipeline")
      .in("status", ["pending", "running"])
      .maybeSingle();
    if (existing) return existing as ScoutJob;
    const { data, error } = await supabase
      .from("scout_jobs")
      .insert({ ...row, idempotency_key: row.idempotency_key })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") {
        const { data: again } = await supabase.from("scout_jobs").select("*").eq("idempotency_key", row.idempotency_key).maybeSingle();
        if (again) return again as ScoutJob;
      }
      throw new Error("Job aanmaken is mislukt.");
    }
    return data as ScoutJob;
  }

  return mutateLocalScout((store) => {
    const existing = store.jobs.find(
      (job) => job.lead_id === leadId && job.kind === "pipeline" && (job.status === "pending" || job.status === "running")
    );
    if (existing) return existing;
    store.jobs.push(row);
    return row;
  });
}

export async function claimPendingJobs(limit = 5): Promise<ScoutJob[]> {
  const now = nowIso();
  const supabase = scoutServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from("scout_jobs")
      .select("*")
      .eq("status", "pending")
      .lte("run_after", now)
      .order("run_after", { ascending: true })
      .limit(limit);
    const claimed: ScoutJob[] = [];
    for (const job of data ?? []) {
      const { data: updated } = await supabase
        .from("scout_jobs")
        .update({
          status: "running",
          locked_at: now,
          attempts: (job.attempts ?? 0) + 1,
          updated_at: now,
        })
        .eq("id", job.id)
        .eq("status", "pending")
        .select("*")
        .maybeSingle();
      if (updated) claimed.push(updated as ScoutJob);
    }
    return claimed;
  }

  return mutateLocalScout((store) => {
    const claimed: ScoutJob[] = [];
    for (const job of store.jobs) {
      if (claimed.length >= limit) break;
      if (job.status !== "pending" || Date.parse(job.run_after) > Date.now()) continue;
      job.status = "running";
      job.locked_at = now;
      job.attempts += 1;
      job.updated_at = now;
      claimed.push({ ...job });
    }
    return claimed;
  });
}

export async function completeJob(id: string) {
  const now = nowIso();
  const supabase = scoutServiceClient();
  if (supabase) {
    await supabase
      .from("scout_jobs")
      .update({ status: "completed", completed_at: now, last_error: null, locked_at: null, updated_at: now })
      .eq("id", id);
    return;
  }
  await mutateLocalScout((store) => {
    const job = store.jobs.find((item) => item.id === id);
    if (!job) return;
    job.status = "completed";
    job.completed_at = now;
    job.last_error = null;
    job.locked_at = null;
    job.updated_at = now;
  });
}

export async function failJob(job: ScoutJob, error: string) {
  const now = Date.now();
  const attempts = job.attempts;
  const giveUp = attempts >= job.max_attempts;
  const runAfter = new Date(now + Math.min(15 * 60 * 1000, 8_000 * 2 ** Math.max(0, attempts - 1))).toISOString();
  const patch = {
    status: giveUp ? ("failed" as const) : ("pending" as const),
    last_error: error.slice(0, 500),
    locked_at: null,
    run_after: runAfter,
    updated_at: new Date(now).toISOString(),
    completed_at: giveUp ? new Date(now).toISOString() : null,
  };
  const supabase = scoutServiceClient();
  if (supabase) {
    await supabase.from("scout_jobs").update(patch).eq("id", job.id);
    return patch.status;
  }
  await mutateLocalScout((store) => {
    const found = store.jobs.find((item) => item.id === job.id);
    if (!found) return;
    Object.assign(found, patch);
  });
  return patch.status;
}

export async function getJob(id: string) {
  const supabase = scoutServiceClient();
  if (supabase) {
    const { data } = await supabase.from("scout_jobs").select("*").eq("id", id).maybeSingle();
    return (data as ScoutJob | null) ?? null;
  }
  const store = await readLocalScout();
  return store.jobs.find((job) => job.id === id) ?? null;
}
