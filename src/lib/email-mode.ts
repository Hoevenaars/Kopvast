import { cache } from "react";
import { site } from "./site";
import { refreshClient } from "./refresh";

export type EmailMode = "TEST" | "LIVE";

export function isEmailMode(value: string | null | undefined): value is EmailMode {
  return value === "TEST" || value === "LIVE";
}

export function combineEmailMode(input: {
  env?: string | null;
  settings?: string | null;
  nodeEnv?: string | null;
}): EmailMode {
  const nodeEnv = input.nodeEnv ?? process.env.NODE_ENV;
  if (nodeEnv !== "production" && input.env !== "LIVE") return "TEST";
  if (isEmailMode(input.settings)) return input.settings;
  return input.env === "LIVE" ? "LIVE" : "TEST";
}

export function combineTestEmail(input: { env?: string | null; settings?: string | null }) {
  return input.settings?.trim() || input.env?.trim() || site.email;
}

export function recipientForMode(
  intended: string,
  mode: EmailMode,
  testEmail: string
): { to: string; mode: EmailMode; intended: string } {
  if (mode === "TEST") {
    return { to: testEmail, mode, intended };
  }
  return { to: intended, mode, intended };
}

function envTestEmail() {
  return process.env.EMAIL_TEST_ADDRESS || process.env.CONTACT_TO_EMAIL || null;
}

export const resolveEmailSettings = cache(async () => {
  const envMode = process.env.EMAIL_MODE ?? null;
  const envTest = envTestEmail();
  const fallback = {
    mode: combineEmailMode({ env: envMode }),
    testEmail: combineTestEmail({ env: envTest }),
    storedMode: null as EmailMode | null,
  };
  const supabase = refreshClient();
  if (!supabase) return fallback;

  const { data } = await supabase.from("app_settings").select("email_mode, test_email").eq("id", 1).maybeSingle();
  const storedMode = isEmailMode(data?.email_mode) ? data.email_mode : null;
  return {
    mode: combineEmailMode({ env: envMode, settings: storedMode }),
    testEmail: combineTestEmail({ env: envTest, settings: data?.test_email }),
    storedMode,
  };
});

export async function getEmailMode(): Promise<EmailMode> {
  return (await resolveEmailSettings()).mode;
}

export async function getTestEmail() {
  return (await resolveEmailSettings()).testEmail;
}

export async function saveEmailMode(mode: EmailMode) {
  const supabase = refreshClient();
  if (!supabase) return { ok: false as const, message: "Website Refresh is niet gekoppeld." };
  const { data, error } = await supabase
    .from("app_settings")
    .update({ email_mode: mode, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false as const, message: error.message };
  if (!data) return { ok: false as const, message: "Acquisitie-instellingen ontbreken." };
  return { ok: true as const, mode };
}
