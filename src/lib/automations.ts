import { isDueRequestAction } from "@/lib/aanvragen-model";
import { NEXT_ACTIONS } from "@/lib/commercial";
import { workspaceRoutes } from "@/lib/product";
import { refreshClient } from "@/lib/refresh";

export type AutomationLaneItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  status: string;
};

export type AutomationLane = {
  key: string;
  label: string;
  description: string;
  href: string;
  count: number;
  status: "ok" | "attention";
  items: AutomationLaneItem[];
};

export type AutomationOverview = {
  configured: boolean;
  openaiConfigured: boolean;
  lanes: AutomationLane[];
};

export function laneStatus(count: number): "ok" | "attention" {
  return count > 0 ? "attention" : "ok";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function lane(input: Omit<AutomationLane, "count" | "status"> & { items: AutomationLaneItem[] }): AutomationLane {
  return {
    ...input,
    count: input.items.length,
    status: laneStatus(input.items.length),
  };
}

export async function loadAutomationOverview(): Promise<AutomationOverview> {
  const supabase = refreshClient();
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  if (!supabase) {
    return {
      configured: false,
      openaiConfigured,
      lanes: [],
    };
  }

  const now = new Date().toISOString();
  const [
    queuedScans,
    failedScans,
    draftMails,
    failedMails,
    finishAnalysis,
    dueRequests,
  ] = await Promise.all([
    supabase
      .from("website_scans")
      .select("id, prospect_id, website_url, started_at")
      .eq("status", "queued")
      .order("started_at", { ascending: true })
      .limit(8),
    supabase
      .from("prospects")
      .select("id, company_name, domain, updated_at")
      .eq("status", "SCAN_FAILED")
      .eq("is_archived", false)
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("email_messages")
      .select("id, prospect_id, to_email, subject, status, created_at")
      .eq("kind", "acquisition_outreach")
      .in("status", ["draft", "queued"])
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("email_messages")
      .select("id, prospect_id, to_email, subject, status, last_error, updated_at")
      .eq("kind", "acquisition_outreach")
      .in("status", ["failed", "bounced"])
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("prospects")
      .select("id, company_name, domain, next_action, next_action_at")
      .eq("next_action", NEXT_ACTIONS.FINISH_ANALYSIS)
      .eq("is_archived", false)
      .order("next_action_at", { ascending: true })
      .limit(8),
    supabase
      .from("inbound_leads")
      .select("id, company_name, name, next_action, next_action_at, status")
      .not("next_action", "is", null)
      .not("next_action_at", "is", null)
      .lte("next_action_at", now)
      .order("next_action_at", { ascending: true })
      .limit(12),
  ]);

  const requestItems = ((dueRequests.data ?? []) as Array<Record<string, unknown>>)
    .filter((row) =>
      isDueRequestAction({
        next_action: asString(row.next_action) || null,
        next_action_at: asString(row.next_action_at) || null,
        status: String(row.status ?? ""),
      })
    )
    .slice(0, 8)
    .map((row) => ({
      id: String(row.id),
      title: asString(row.next_action) || "Aanvraag opvolgen",
      detail: asString(row.company_name) || String(row.name ?? "Aanvraag"),
      href: `${workspaceRoutes.adminAanvragen}/${row.id}`,
      status: "Actie nodig",
    }));

  return {
    configured: true,
    openaiConfigured,
    lanes: [
      lane({
        key: "scan-queue",
        label: "Scanwacht",
        description: "Website scans die nog in de queue staan.",
        href: workspaceRoutes.adminAcquisition,
        items: ((queuedScans.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
          id: String(row.id),
          title: "Scan in wachtrij",
          detail: asString(row.website_url) || String(row.prospect_id ?? ""),
          href: row.prospect_id ? `${workspaceRoutes.adminAcquisition}/${row.prospect_id}` : workspaceRoutes.adminAcquisition,
          status: "Wacht",
        })),
      }),
      lane({
        key: "scan-failed",
        label: "Mislukte scans",
        description: "Prospects waarvan de websitecheck vastliep.",
        href: workspaceRoutes.adminAcquisition,
        items: ((failedScans.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
          id: String(row.id),
          title: "Website scan mislukt",
          detail: asString(row.company_name) || String(row.domain ?? ""),
          href: `${workspaceRoutes.adminAcquisition}/${row.id}`,
          status: "Actie nodig",
        })),
      }),
      lane({
        key: "mail-queue",
        label: "Mailqueue",
        description: "Acquisitiemails die nog als concept of in de wachtrij staan.",
        href: workspaceRoutes.adminMail,
        items: ((draftMails.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
          id: String(row.id),
          title: asString(row.subject) || "Acquisitiemail",
          detail: `${asString(row.to_email) || "onbekend"} · ${String(row.status ?? "draft")}`,
          href: row.prospect_id ? `${workspaceRoutes.adminAcquisition}/${row.prospect_id}` : workspaceRoutes.adminMail,
          status: String(row.status ?? "draft"),
        })),
      }),
      lane({
        key: "mail-failed",
        label: "Mailfouten",
        description: "Verzending die bounced of mislukte.",
        href: workspaceRoutes.adminMail,
        items: ((failedMails.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
          id: String(row.id),
          title: asString(row.subject) || "Mail mislukt",
          detail: asString(row.last_error) || asString(row.to_email) || String(row.status ?? "failed"),
          href: row.prospect_id ? `${workspaceRoutes.adminAcquisition}/${row.prospect_id}` : workspaceRoutes.adminMail,
          status: String(row.status ?? "failed"),
        })),
      }),
      lane({
        key: "finish-analysis",
        label: "Analyse handmatig",
        description: "OpenAI ontbrak of faalde; iemand moet de analyse afronden.",
        href: workspaceRoutes.adminAcquisition,
        items: ((finishAnalysis.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
          id: String(row.id),
          title: NEXT_ACTIONS.FINISH_ANALYSIS,
          detail: asString(row.company_name) || String(row.domain ?? ""),
          href: `${workspaceRoutes.adminAcquisition}/${row.id}`,
          status: "Beoordelen",
        })),
      }),
      lane({
        key: "request-followup",
        label: "Aanvraagopvolging",
        description: "Inbound aanvragen waarvan de volgende actie nu vervalt.",
        href: workspaceRoutes.adminAanvragen,
        items: requestItems,
      }),
    ],
  };
}
