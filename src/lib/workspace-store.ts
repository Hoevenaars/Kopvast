import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  TodoBucketRow,
  TodoCommentRow,
  TodoLabelLinkRow,
  TodoLabelRow,
  TodoRow,
} from "@/lib/todos";
import type {
  ProposalActivityRow,
  ProposalLineRow,
  ProposalRow,
  ProposalVersionRow,
} from "@/lib/proposals";
import type { AssetRow, LeadRow, MailRow, OrganizationRow, ProjectRow, RequestRow } from "@/lib/workspace";

export type MemberRow = {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  role: string;
  access_enabled: boolean;
};

export type LocalSession = {
  id: string;
  email: string;
  role: "admin" | "customer";
  organization_id: string | null;
  token_hash: string;
  expires_at: string;
};

export type LocalToken = {
  id: string;
  email: string;
  token_hash: string;
  purpose: string;
  expires_at: string;
  used_at: string | null;
  failed_attempts: number;
};

export type LocalCredential = {
  email: string;
  password_hash: string;
  password_updated_at: string;
  failed_attempts: number;
  locked_until: string | null;
};

export type LocalMailTemplate = {
  key: string;
  fields: Record<string, string>;
  updated_at: string;
  updated_by: string | null;
};

type Store = {
  organizations: OrganizationRow[];
  members: MemberRow[];
  projects: ProjectRow[];
  assets: AssetRow[];
  requests: RequestRow[];
  sessions: LocalSession[];
  tokens: LocalToken[];
  credentials: LocalCredential[];
  todoBuckets: TodoBucketRow[];
  todoLabels: TodoLabelRow[];
  todos: TodoRow[];
  todoLabelLinks: TodoLabelLinkRow[];
  todoComments: TodoCommentRow[];
  mailTemplates: LocalMailTemplate[];
  proposals: ProposalRow[];
  proposalLines: ProposalLineRow[];
  proposalVersions: ProposalVersionRow[];
  proposalActivity: ProposalActivityRow[];
};

const file = path.join("/tmp", "kopvast-workspace.json");

const empty = (): Store => ({
  organizations: [],
  members: [],
  projects: [],
  assets: [],
  requests: [],
  sessions: [],
  tokens: [],
  credentials: [],
  todoBuckets: [],
  todoLabels: [],
  todos: [],
  todoLabelLinks: [],
  todoComments: [],
  mailTemplates: [],
  proposals: [],
  proposalLines: [],
  proposalVersions: [],
  proposalActivity: [],
});

export async function readStore(): Promise<Store> {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as Partial<Store>;
    return {
      ...empty(),
      ...parsed,
      tokens: (parsed.tokens ?? []).map((item) => ({
        ...item,
        failed_attempts: item.failed_attempts ?? 0,
      })),
      mailTemplates: parsed.mailTemplates ?? [],
      proposals: parsed.proposals ?? [],
      proposalLines: parsed.proposalLines ?? [],
      proposalVersions: parsed.proposalVersions ?? [],
      proposalActivity: parsed.proposalActivity ?? [],
    };
  } catch {
    return empty();
  }
}

export async function writeStore(store: Store) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(store, null, 2));
}

export async function mutateStore<T>(fn: (store: Store) => T | Promise<T>) {
  const store = await readStore();
  const result = await fn(store);
  await writeStore(store);
  return result;
}

export function newId() {
  return crypto.randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}

export async function readLocalLeads(): Promise<LeadRow[]> {
  try {
    const rows = JSON.parse(await readFile(path.join("/tmp", "kopvast-leads.json"), "utf8")) as Array<{
      id: string;
      createdAt: string;
      name: string;
      email: string;
      company: string;
      website: string;
      message: string;
      source: string;
      phone: string;
    }>;
    return rows.map((row) => ({
      id: row.id,
      created_at: row.createdAt,
      type: row.source === "maatwerk" ? "maatwerk" : "website",
      status: "NIEUW",
      company_name: row.company || null,
      website: row.website || null,
      name: row.name,
      email: row.email,
      phone: row.phone || null,
      pages: null,
      has_brand: null,
      notes: row.message || null,
      request_detail: null,
      functionality: null,
      scale: null,
      timing: null,
    }));
  } catch {
    return [];
  }
}

export async function readLocalMail(): Promise<MailRow[]> {
  try {
    const rows = JSON.parse(await readFile(path.join("/tmp", "kopvast-email-events.json"), "utf8")) as Array<{
      id: string;
      leadId?: string;
      kind: string;
      to: string;
      subject: string;
      status: string;
      createdAt: string;
      error?: string;
    }>;
    return rows.map((row) => ({
      id: row.id,
      lead_id: row.leadId ?? null,
      kind: row.kind,
      to_email: row.to,
      subject: row.subject,
      status: row.status,
      last_error: row.error ?? null,
      created_at: row.createdAt,
    }));
  } catch {
    return [];
  }
}
