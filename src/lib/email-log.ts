import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type EmailStatus = "queued" | "sent" | "delivered" | "bounced" | "failed";

export type EmailEvent = {
  id: string;
  leadId?: string;
  resendId?: string;
  kind: string;
  to: string;
  subject: string;
  status: EmailStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
};

const storeFile = path.join("/tmp", "kopvast-email-events.json");

async function readEvents(): Promise<EmailEvent[]> {
  try {
    return JSON.parse(await readFile(storeFile, "utf8")) as EmailEvent[];
  } catch {
    return [];
  }
}

async function writeEvents(events: EmailEvent[]) {
  await mkdir(path.dirname(storeFile), { recursive: true });
  await writeFile(storeFile, JSON.stringify(events, null, 2));
}

export async function logEmailEvent(event: Omit<EmailEvent, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const events = await readEvents();
  const now = new Date().toISOString();
  const record: EmailEvent = {
    id: event.id ?? crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...event,
  };
  events.push(record);
  await writeEvents(events);
  return record;
}

export async function updateEmailEventByResendId(resendId: string, status: EmailStatus, error?: string) {
  const events = await readEvents();
  const now = new Date().toISOString();
  let matched = false;
  const next = events.map((event) => {
    if (event.resendId !== resendId) return event;
    matched = true;
    return { ...event, status, error, updatedAt: now };
  });
  if (!matched) {
    next.push({
      id: crypto.randomUUID(),
      resendId,
      kind: "webhook",
      to: "",
      subject: "",
      status,
      error,
      createdAt: now,
      updatedAt: now,
    });
  }
  await writeEvents(next);
  return matched;
}

export function webhookTypeToStatus(type: string): EmailStatus | null {
  if (type === "email.delivered") return "delivered";
  if (type === "email.bounced") return "bounced";
  if (type === "email.failed") return "failed";
  if (type === "email.sent") return "sent";
  return null;
}
