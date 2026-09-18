import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ScoutDraft, ScoutLead, ScoutLeadEvent, ScoutScan } from "./types";

export type ScoutJob = {
  id: string;
  lead_id: string;
  kind: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  attempts: number;
  max_attempts: number;
  run_after: string;
  idempotency_key: string;
  last_error: string | null;
  locked_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ScoutStore = {
  leads: ScoutLead[];
  scans: ScoutScan[];
  drafts: ScoutDraft[];
  events: ScoutLeadEvent[];
  jobs: ScoutJob[];
};

const file = path.join("/tmp", "kopvast-scout.json");

const empty = (): ScoutStore => ({ leads: [], scans: [], drafts: [], events: [], jobs: [] });

export async function readLocalScout(): Promise<ScoutStore> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as ScoutStore;
  } catch {
    return empty();
  }
}

export async function mutateLocalScout<T>(fn: (store: ScoutStore) => T): Promise<T> {
  await mkdir(path.dirname(file), { recursive: true });
  const store = await readLocalScout();
  const result = fn(store);
  await writeFile(file, JSON.stringify(store, null, 2));
  return result;
}
