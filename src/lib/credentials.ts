import { refreshClient } from "@/lib/refresh";
import { normalizeEmail } from "@/lib/product";
import { mutateStore, nowIso, readStore } from "@/lib/workspace-store";

export const MAX_PASSWORD_ATTEMPTS = 5;
export const PASSWORD_LOCK_MINUTES = 15;

export type CredentialRow = {
  email: string;
  password_hash: string;
  password_updated_at: string;
  failed_attempts: number;
  locked_until: string | null;
};

export function isCredentialLocked(credential: CredentialRow | null) {
  if (!credential?.locked_until) return false;
  return Date.parse(credential.locked_until) > Date.now();
}

export async function getCredential(email: string) {
  const normalized = normalizeEmail(email);
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase
      .from("kopvast_credentials")
      .select("email, password_hash, password_updated_at, failed_attempts, locked_until")
      .eq("email", normalized)
      .maybeSingle();
    return (data as CredentialRow | null) ?? null;
  }
  const store = await readStore();
  return store.credentials.find((item) => item.email === normalized) ?? null;
}

export async function saveCredential(email: string, passwordHash: string) {
  const normalized = normalizeEmail(email);
  const row: CredentialRow = {
    email: normalized,
    password_hash: passwordHash,
    password_updated_at: nowIso(),
    failed_attempts: 0,
    locked_until: null,
  };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_credentials").upsert(row, { onConflict: "email" });
    if (error) {
      console.error("[kopvast] Wachtwoord opslaan mislukt", error.message);
      return { ok: false as const, message: "Wachtwoord opslaan is tijdelijk niet beschikbaar." };
    }
    return { ok: true as const };
  }
  await mutateStore((store) => {
    const index = store.credentials.findIndex((item) => item.email === normalized);
    if (index >= 0) store.credentials[index] = row;
    else store.credentials.push(row);
  });
  return { ok: true as const };
}

export async function recordFailedPassword(email: string) {
  const current = await getCredential(email);
  if (!current) return;
  const failed = current.failed_attempts + 1;
  const lockedUntil =
    failed >= MAX_PASSWORD_ATTEMPTS
      ? new Date(Date.now() + PASSWORD_LOCK_MINUTES * 60 * 1000).toISOString()
      : current.locked_until;
  await updateCredentialSecurity(current.email, {
    failed_attempts: failed,
    locked_until: lockedUntil,
  });
}

export async function clearFailedPassword(email: string) {
  const current = await getCredential(email);
  if (!current) return;
  if (!current.failed_attempts && !current.locked_until) return;
  await updateCredentialSecurity(current.email, { failed_attempts: 0, locked_until: null });
}

async function updateCredentialSecurity(
  email: string,
  patch: Pick<CredentialRow, "failed_attempts" | "locked_until">
) {
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_credentials").update(patch).eq("email", email);
    if (error) console.error("[kopvast] Wachtwoordblokkade bijwerken mislukt", error.message);
    return;
  }
  await mutateStore((store) => {
    const item = store.credentials.find((row) => row.email === email);
    if (!item) return;
    item.failed_attempts = patch.failed_attempts;
    item.locked_until = patch.locked_until;
  });
}
