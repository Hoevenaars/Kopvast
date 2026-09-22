import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import { prepareAcquisitionEmail, prepareFollowUpEmail } from "@/lib/acquisition-render";
import { logProspectActivity } from "@/lib/acquisition-activity";
import { ACTIVITY } from "@/lib/acquisition-constants";
import {
  acquisitionChoiceUrls,
  offerPriceFromParagraph,
  parseAcquisitionChoice,
  type AcquisitionChoice,
} from "@/lib/acquisition-start";
import { fromAddress } from "@/lib/email";
import { resolveEmailSettings } from "@/lib/email-mode";
import { refreshClient } from "@/lib/refresh";
import { site } from "@/lib/site";
import { createToken, hashToken } from "@/lib/tokens";
import { parseOutreachBody } from "@/emails/acquisition-outreach-copy";

export const ACQUISITION_CLICK_PATH = "/r";
export const MAIL_CLICKED = "MAIL_CLICKED";

export type AcquisitionClickLink = {
  id: string;
  token: string;
  tokenHash: string;
  prospectId: string;
  mailId: string | null;
  choice: AcquisitionChoice;
  destinationUrl: string;
  clickedAt: string | null;
  clickCount: number;
  notifiedAt: string | null;
  createdAt: string;
};

const storeFile = path.join("/tmp", "kopvast-acquisition-clicks.json");

const PREFETCH_UA =
  /googleimageproxy|yahoomailproxy|proofpoint|barracuda|mimecast|safelinks|microsoft office|prefetch|vercel-screenshot|preview/i;

export function choiceClickLabel(choice: AcquisitionChoice) {
  return choice === "info" ? "Stuur me eerst meer info" : "Ja, doe me een voorstel";
}

export function clickActivityLabel(choice: AcquisitionChoice) {
  return choice === "info" ? "Geklikt op meer info" : "Geklikt op voorstel";
}

export function clickResponseStatus(choice: AcquisitionChoice) {
  return choice === "info" ? "QUESTION" : "POSITIVE";
}

export function isClickPrefetch(input: { userAgent?: string | null; method?: string | null }) {
  if (input.method && input.method.toUpperCase() !== "GET") return true;
  return PREFETCH_UA.test(input.userAgent ?? "");
}

export function isValidClickToken(token: string) {
  return /^[A-Za-z0-9_-]{16,128}$/.test(token);
}

export function trackingUrlForToken(token: string) {
  return `${site.url}${ACQUISITION_CLICK_PATH}/${encodeURIComponent(token)}`;
}

export function tokenFromTrackingUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/r\/([^/]+)$/);
    const token = match?.[1] ? decodeURIComponent(match[1]) : "";
    return isValidClickToken(token) ? token : null;
  } catch {
    return null;
  }
}

export function isTrackingUrl(value: string) {
  return Boolean(tokenFromTrackingUrl(value));
}

async function readFileStore(): Promise<AcquisitionClickLink[]> {
  try {
    return JSON.parse(await readFile(storeFile, "utf8")) as AcquisitionClickLink[];
  } catch {
    return [];
  }
}

async function writeFileStore(rows: AcquisitionClickLink[]) {
  await mkdir(path.dirname(storeFile), { recursive: true });
  await writeFile(storeFile, JSON.stringify(rows, null, 2));
}

export async function resetAcquisitionClickStoreForTests() {
  await writeFileStore([]);
}

function fromRow(row: Record<string, unknown>): AcquisitionClickLink {
  return {
    id: String(row.id),
    token: String(row.token ?? ""),
    tokenHash: String(row.token_hash ?? row.tokenHash),
    prospectId: String(row.prospect_id ?? row.prospectId),
    mailId: (row.mail_id as string | null | undefined) ?? (row.mailId as string | null | undefined) ?? null,
    choice: parseAcquisitionChoice(row.choice),
    destinationUrl: String(row.destination_url ?? row.destinationUrl),
    clickedAt: (row.clicked_at as string | null | undefined) ?? (row.clickedAt as string | null | undefined) ?? null,
    clickCount: Number(row.click_count ?? row.clickCount ?? 0),
    notifiedAt: (row.notified_at as string | null | undefined) ?? (row.notifiedAt as string | null | undefined) ?? null,
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
  };
}

async function findLinkByHash(tokenHash: string): Promise<AcquisitionClickLink | null> {
  const supabase = refreshClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("acquisition_click_links")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (!error && data) return fromRow(data as Record<string, unknown>);
  }
  const rows = await readFileStore();
  return rows.find((item) => item.tokenHash === tokenHash) ?? null;
}

async function findLinkByMailChoice(mailId: string, choice: AcquisitionChoice) {
  const supabase = refreshClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("acquisition_click_links")
      .select("*")
      .eq("mail_id", mailId)
      .eq("choice", choice)
      .maybeSingle();
    if (!error && data) return fromRow(data as Record<string, unknown>);
  }
  const rows = await readFileStore();
  return rows.find((item) => item.mailId === mailId && item.choice === choice) ?? null;
}

async function saveLink(link: AcquisitionClickLink, token?: string) {
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("acquisition_click_links").upsert(
      {
        id: link.id,
        token: link.token,
        token_hash: link.tokenHash,
        prospect_id: link.prospectId,
        mail_id: link.mailId,
        choice: link.choice,
        destination_url: link.destinationUrl,
        clicked_at: link.clickedAt,
        click_count: link.clickCount,
        notified_at: link.notifiedAt,
        created_at: link.createdAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token_hash" }
    );
    if (!error) return { link, token };
    if (!/acquisition_click_links|schema cache|does not exist/i.test(error.message)) {
      console.error("[kopvast] Kliklink opslaan mislukt", error.message);
    }
  }
  const rows = await readFileStore();
  const index = rows.findIndex((item) => item.id === link.id || item.tokenHash === link.tokenHash);
  if (index >= 0) rows[index] = link;
  else rows.push(link);
  await writeFileStore(rows);
  return { link, token };
}

export async function ensureAcquisitionClickLinks(input: {
  prospectId: string;
  mailId?: string | null;
  domain: string;
  companyName?: string | null;
  body?: string;
  choiceAUrl?: string;
  choiceBUrl?: string;
  offerPrice?: 995 | 1495 | null;
}) {
  const offerPrice =
    input.offerPrice === 995 || input.offerPrice === 1495
      ? input.offerPrice
      : input.offerPrice === null
        ? null
        : offerPriceFromParagraph(input.body);
  const defaults = acquisitionChoiceUrls({
    domain: input.domain,
    companyName: input.companyName,
    offerPrice,
  });
  const parsed = input.body ? parseOutreachBody(input.body, input.domain) : {};
  const destinations = {
    voorstel: unwrapDestination(input.choiceAUrl || parsed.choiceAUrl || defaults.choiceAUrl, "voorstel"),
    info: unwrapDestination(input.choiceBUrl || parsed.choiceBUrl || defaults.choiceBUrl, "info"),
  };

  const voorstel = await ensureChoiceLink({
    prospectId: input.prospectId,
    mailId: input.mailId ?? null,
    choice: "voorstel",
    destinationUrl: destinations.voorstel,
    existingUrl: input.choiceAUrl || parsed.choiceAUrl,
  });
  const info = await ensureChoiceLink({
    prospectId: input.prospectId,
    mailId: input.mailId ?? null,
    choice: "info",
    destinationUrl: destinations.info,
    existingUrl: input.choiceBUrl || parsed.choiceBUrl,
  });

  return {
    choiceAUrl: voorstel.trackingUrl,
    choiceBUrl: info.trackingUrl,
    links: { voorstel: voorstel.link, info: info.link },
  };
}

function unwrapDestination(url: string, choice: AcquisitionChoice) {
  if (isTrackingUrl(url)) {
    const fallback = acquisitionChoiceUrls();
    return choice === "info" ? fallback.choiceBUrl : fallback.choiceAUrl;
  }
  return url;
}

async function ensureChoiceLink(input: {
  prospectId: string;
  mailId: string | null;
  choice: AcquisitionChoice;
  destinationUrl: string;
  existingUrl?: string;
}) {
  const existingToken = input.existingUrl ? tokenFromTrackingUrl(input.existingUrl) : null;
  if (existingToken) {
    const found = await findLinkByHash(hashToken(existingToken));
    if (found) {
      const token = found.token || existingToken;
      const next = { ...found, token, mailId: input.mailId || found.mailId, destinationUrl: input.destinationUrl };
      if (next.mailId !== found.mailId || next.destinationUrl !== found.destinationUrl) {
        await saveLink(next);
      }
      return { link: next, trackingUrl: trackingUrlForToken(token), token };
    }
  }
  if (input.mailId) {
    const found = await findLinkByMailChoice(input.mailId, input.choice);
    if (found?.token) {
      const next = { ...found, destinationUrl: input.destinationUrl };
      await saveLink(next);
      return { link: next, trackingUrl: trackingUrlForToken(found.token), token: found.token };
    }
  }

  const token = createToken();
  const now = new Date().toISOString();
  const link: AcquisitionClickLink = {
    id: crypto.randomUUID(),
    token,
    tokenHash: hashToken(token),
    prospectId: input.prospectId,
    mailId: input.mailId,
    choice: input.choice,
    destinationUrl: input.destinationUrl,
    clickedAt: null,
    clickCount: 0,
    notifiedAt: null,
    createdAt: now,
  };
  await saveLink(link, token);
  return { link, trackingUrl: trackingUrlForToken(token), token };
}

export async function prepareTrackedShortAcquisitionEmail(input: {
  prospectId: string;
  mailId?: string | null;
  domain: string;
  companyName?: string | null;
  subject?: string;
  body: string;
  offerPrice?: 995 | 1495 | null;
}) {
  const tracked = await ensureAcquisitionClickLinks(input);
  return prepareFollowUpEmail({
    subject: input.subject,
    body: input.body,
    choiceAUrl: tracked.choiceAUrl,
    choiceBUrl: tracked.choiceBUrl,
  });
}

export async function prepareTrackedAcquisitionEmail(input: {
  prospectId: string;
  mailId?: string | null;
  domain: string;
  companyName?: string | null;
  subject?: string;
  body: string;
}) {
  const tracked = await ensureAcquisitionClickLinks(input);
  return prepareAcquisitionEmail({
    subject: input.subject,
    body: input.body,
    companyName: input.companyName ?? undefined,
    domain: input.domain,
    choiceAUrl: tracked.choiceAUrl,
    choiceBUrl: tracked.choiceBUrl,
  });
}

export async function recordAcquisitionClick(input: {
  token: string;
  userAgent?: string | null;
  method?: string | null;
}) {
  const fallback = acquisitionChoiceUrls().choiceAUrl;
  if (!isValidClickToken(input.token)) {
    return { destination: fallback, recorded: false, notified: false };
  }

  const link = await findLinkByHash(hashToken(input.token));
  if (!link) {
    return { destination: fallback, recorded: false, notified: false };
  }

  const prefetch = isClickPrefetch(input);
  const firstClick = !link.clickedAt;
  const now = new Date().toISOString();
  const updated: AcquisitionClickLink = {
    ...link,
    clickedAt: link.clickedAt ?? now,
    clickCount: link.clickCount + (prefetch ? 0 : 1),
  };
  if (prefetch) {
    return { destination: link.destinationUrl, recorded: false, notified: false, link };
  }

  await saveLink(updated);
  const supabase = refreshClient();
  if (supabase && firstClick) {
    await logProspectActivity(supabase, {
      prospectId: link.prospectId,
      eventType: ACTIVITY.MAIL_CLICKED,
      actorType: "user",
      actorId: link.choice,
      metadata: { choice: link.choice, mailId: link.mailId, destination: link.destinationUrl },
    });
    const { data: prospect } = await supabase
      .from("prospects")
      .select("response_status, next_action, company_name, domain")
      .eq("id", link.prospectId)
      .maybeSingle();
    const patch: Record<string, unknown> = { last_activity_at: now, updated_at: now };
    if (!prospect?.response_status || prospect.response_status === "NO_RESPONSE") {
      patch.response_status = clickResponseStatus(link.choice);
    }
    if (!prospect?.next_action?.trim()) {
      patch.next_action = clickActivityLabel(link.choice);
    }
    await supabase.from("prospects").update(patch).eq("id", link.prospectId);
  }

  let notified = false;
  if (firstClick && !link.notifiedAt) {
    notified = await notifyAcquisitionClick({
      prospectId: link.prospectId,
      choice: link.choice,
      destinationUrl: link.destinationUrl,
    });
    if (notified || !process.env.RESEND_API_KEY) {
      updated.notifiedAt = now;
      await saveLink(updated);
    }
  }

  return { destination: link.destinationUrl, recorded: true, notified, link: updated };
}

async function notifyAcquisitionClick(input: {
  prospectId: string;
  choice: AcquisitionChoice;
  destinationUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const settings = await resolveEmailSettings();
  const to = settings.mode === "TEST" ? settings.testEmail : process.env.CONTACT_TO_EMAIL?.trim() || site.email;
  const supabase = refreshClient();
  const { data: prospect } = supabase
    ? await supabase.from("prospects").select("company_name, domain").eq("id", input.prospectId).maybeSingle()
    : { data: null };
  const who = prospect?.company_name?.trim() || prospect?.domain || "Een prospect";
  const label = choiceClickLabel(input.choice);
  const subject = `Klik · ${who} · ${label}`;
  const href = `${site.url}/admin/acquisitie/${input.prospectId}`;
  const text = [
    `${who} klikte op "${label}" in de acquisitiemail.`,
    prospect?.domain ? `Website: ${prospect.domain}` : "",
    `Open in admin: ${href}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (!apiKey) {
    console.info("[kopvast] Acquisitieklik zonder e-mail (geen RESEND_API_KEY)", {
      prospectId: input.prospectId,
      choice: input.choice,
    });
    return false;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send(
    {
      from: fromAddress(),
      to,
      subject,
      text,
    },
    { idempotencyKey: `acquisition-click/${input.prospectId}/${input.choice}` }
  );
  if (error) {
    console.error("[kopvast] Klikmelding versturen mislukt", error.message);
    return false;
  }
  void input.destinationUrl;
  return true;
}

export async function loadRecentAcquisitionClicks(limit = 8) {
  const supabase = refreshClient();
  if (!supabase) {
    const rows = (await readFileStore())
      .filter((item) => item.clickedAt)
      .sort((a, b) => (b.clickedAt ?? "").localeCompare(a.clickedAt ?? ""))
      .slice(0, limit);
    return rows.map((item) => ({
      id: item.id,
      prospectId: item.prospectId,
      choice: item.choice,
      clickedAt: item.clickedAt,
      company: item.prospectId,
      domain: "",
    }));
  }
  const { data, error } = await supabase
    .from("acquisition_click_links")
    .select("id, prospect_id, choice, clicked_at, prospects(company_name, domain)")
    .not("clicked_at", "is", null)
    .order("clicked_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((row) => {
    const prospect = Array.isArray(row.prospects) ? row.prospects[0] : row.prospects;
    return {
      id: String(row.id),
      prospectId: String(row.prospect_id),
      choice: parseAcquisitionChoice(row.choice),
      clickedAt: row.clicked_at as string | null,
      company: (prospect as { company_name?: string | null; domain?: string } | null)?.company_name ||
        (prospect as { domain?: string } | null)?.domain ||
        String(row.prospect_id),
      domain: (prospect as { domain?: string } | null)?.domain || "",
    };
  });
}
