import type { ProspectMail } from "@/lib/acquisition";

const SENT_STATUSES = new Set(["queued", "sent", "delivered"]);

export function sentMailRecords(mails: ProspectMail[]) {
  return mails
    .filter((mail) => SENT_STATUSES.has(mail.status))
    .sort((left, right) => (right.sent_at ?? right.created_at).localeCompare(left.sent_at ?? left.created_at));
}

export function sentMailKindLabel(kind: string) {
  switch (kind) {
    case "acquisition_follow_up":
      return "Automatische follow-up";
    case "acquisition_manual_follow_up":
      return "Handmatige follow-up";
    case "acquisition_test":
      return "Testmail";
    default:
      return "Acquisitiemail";
  }
}
