import { site } from "./site";

export type EmailMode = "TEST" | "LIVE";

export function getEmailMode(): EmailMode {
  return process.env.EMAIL_MODE === "LIVE" ? "LIVE" : "TEST";
}

export function getTestEmail() {
  return (
    process.env.EMAIL_TEST_ADDRESS?.trim() ||
    process.env.CONTACT_TO_EMAIL?.trim() ||
    site.email
  );
}

export function recipientForMode(intended: string): { to: string; mode: EmailMode; intended: string } {
  const mode = getEmailMode();
  if (mode === "TEST") {
    return { to: getTestEmail(), mode, intended };
  }
  return { to: intended, mode, intended };
}
