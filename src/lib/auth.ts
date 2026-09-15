import { cookies } from "next/headers";
import { refreshClient } from "@/lib/refresh";
import {
  clearFailedPassword,
  getCredential,
  isCredentialLocked,
  recordFailedPassword,
  saveCredential,
} from "@/lib/credentials";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/passwords";
import { destinationForRole, isAdminEmail, isEmail, normalizeEmail, workspaceRoutes } from "@/lib/product";
import { SESSION_COOKIE, createToken, hashToken } from "@/lib/tokens";
import { mutateStore, newId, readStore } from "@/lib/workspace-store";

export { SESSION_COOKIE, createToken, hashToken };

const TOKEN_TTL_MINUTES = 20;
const SESSION_DAYS = 14;

export type SessionRole = "admin" | "customer";

export type WorkspaceSession = {
  id: string;
  email: string;
  role: SessionRole;
  organizationId: string | null;
};

export type LoginIntent =
  | { ok: true; emailed: boolean; destination?: string; verifyUrl?: string }
  | { ok: false; message: string };

export function allowDevLogin() {
  return process.env.NODE_ENV !== "production";
}

export async function findMember(email: string) {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase
      .from("kopvast_members")
      .select("id, organization_id, name, email, role")
      .ilike("email", normalizeEmail(email))
      .limit(1)
      .maybeSingle();
    return data;
  }
  const store = await readStore();
  return store.members.find((item) => item.email === normalizeEmail(email)) ?? null;
}

export async function resolveLoginRole(email: string): Promise<SessionRole | null> {
  if (isAdminEmail(email)) return "admin";
  const member = await findMember(email);
  return member ? "customer" : null;
}

export async function startLogin(emailInput: string, next?: string): Promise<LoginIntent> {
  const email = normalizeEmail(emailInput);
  if (!isEmail(email)) {
    return { ok: false, message: "Vul een geldig e-mailadres in." };
  }

  const role = await resolveLoginRole(email);
  if (!role) {
    return {
      ok: false,
      message: "Dit adres heeft geen toegang. Klanten ontvangen een uitnodiging van Kopvast.",
    };
  }

  if (allowDevLogin() && !(await getCredential(email))) {
    await createSession({
      email,
      role,
      organizationId: (await findMember(email))?.organization_id ?? null,
    });
    return { ok: true, emailed: false, destination: safeNext(next, role) };
  }

  const token = createToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString();
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_login_tokens").insert({
      email,
      token_hash: hashToken(token),
      purpose: role,
      expires_at: expiresAt,
    });
    if (error) {
      console.error("[kopvast] Login-token opslaan mislukt", error.message);
      return { ok: false, message: "Inloggen is tijdelijk niet beschikbaar." };
    }
  } else {
    await mutateStore((store) => {
      store.tokens.push({
        id: newId(),
        email,
        token_hash: hashToken(token),
        purpose: role,
        expires_at: expiresAt,
        used_at: null,
      });
    });
  }

  const verifyUrl = `${siteOrigin()}/inloggen/verify?token=${encodeURIComponent(token)}`;
  const sent = await sendLoginEmail({ email, verifyUrl, role });
  return { ok: true, emailed: sent };
}

export async function consumeLoginToken(token: string) {
  if (!token.trim()) return null;
  const tokenHash = hashToken(token);
  const supabase = refreshClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("kopvast_login_tokens")
      .select("id, email, purpose, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (error || !data || data.used_at || Date.parse(data.expires_at) < Date.now()) return null;
    if (data.purpose === "password_reset") return null;
    await supabase.from("kopvast_login_tokens").update({ used_at: new Date().toISOString() }).eq("id", data.id);
    const role = data.purpose === "admin" ? "admin" : "customer";
    const member = await findMember(data.email);
    return createSession({
      email: data.email,
      role,
      organizationId: member?.organization_id ?? null,
    });
  }

  const record = await mutateStore((store) => {
    const found = store.tokens.find((item) => item.token_hash === tokenHash);
    if (!found || found.used_at || found.purpose === "password_reset" || Date.parse(found.expires_at) < Date.now()) {
      return null;
    }
    found.used_at = new Date().toISOString();
    return found;
  });
  if (!record) return null;
  const member = await findMember(record.email);
  return createSession({
    email: record.email,
    role: record.purpose === "admin" ? "admin" : "customer",
    organizationId: member?.organization_id ?? null,
  });
}

export async function createSession(input: {
  email: string;
  role: SessionRole;
  organizationId: string | null;
}) {
  const token = createToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const session = {
    id: newId(),
    email: normalizeEmail(input.email),
    role: input.role,
    organization_id: input.organizationId,
    token_hash: hashToken(token),
    expires_at: expiresAt.toISOString(),
  };

  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_sessions").insert(session);
    if (error) console.error("[kopvast] Sessie opslaan mislukt", error.message);
  } else {
    await mutateStore((store) => {
      store.sessions.push(session);
    });
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return { token, role: input.role, email: normalizeEmail(input.email) };
}

export async function readSession(): Promise<WorkspaceSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);

  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase
      .from("kopvast_sessions")
      .select("id, email, role, organization_id, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (!data || Date.parse(data.expires_at) < Date.now()) return null;
    return {
      id: data.id,
      email: data.email,
      role: data.role === "admin" ? "admin" : "customer",
      organizationId: data.organization_id,
    };
  }

  const store = await readStore();
  const data = store.sessions.find((item) => item.token_hash === tokenHash);
  if (!data || Date.parse(data.expires_at) < Date.now()) return null;
  return {
    id: data.id,
    email: data.email,
    role: data.role,
    organizationId: data.organization_id,
  };
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  jar.delete(SESSION_COOKIE);
  if (!token) return;
  const tokenHash = hashToken(token);
  const supabase = refreshClient();
  if (supabase) {
    await supabase.from("kopvast_sessions").delete().eq("token_hash", tokenHash);
    return;
  }
  await mutateStore((store) => {
    store.sessions = store.sessions.filter((item) => item.token_hash !== tokenHash);
  });
}

export async function requireSession(role?: SessionRole) {
  const session = await readSession();
  if (!session) return null;
  if (role && session.role !== role) return null;
  return session;
}

const invalidLogin = { ok: false as const, message: "E-mail of wachtwoord klopt niet." };

export async function hasPassword(email: string) {
  return Boolean(await getCredential(email));
}

export async function loginWithPassword(emailInput: string, password: string, next?: string): Promise<LoginIntent> {
  const email = normalizeEmail(emailInput);
  if (!isEmail(email) || !password) return invalidLogin;

  const role = await resolveLoginRole(email);
  const credential = await getCredential(email);
  if (!role || !credential) {
    return invalidLogin;
  }
  if (isCredentialLocked(credential)) return invalidLogin;
  if (!(await verifyPassword(password, credential.password_hash))) {
    await recordFailedPassword(email);
    return invalidLogin;
  }

  await clearFailedPassword(email);
  await createSession({
    email,
    role,
    organizationId: (await findMember(email))?.organization_id ?? null,
  });
  return { ok: true, emailed: false, destination: safeNext(next, role) };
}

export async function changePassword(input: {
  email: string;
  currentPassword?: string;
  password: string;
  confirm: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const email = normalizeEmail(input.email);
  if (input.password !== input.confirm) {
    return { ok: false, message: "De wachtwoorden komen niet overeen." };
  }
  const rules = validatePassword(input.password, email);
  if (!rules.ok) return rules;

  const existing = await getCredential(email);
  if (existing) {
    if (!input.currentPassword) return { ok: false, message: "Vul je huidige wachtwoord in." };
    if (isCredentialLocked(existing)) return invalidLogin;
    if (!(await verifyPassword(input.currentPassword, existing.password_hash))) {
      await recordFailedPassword(email);
      return { ok: false, message: "Het huidige wachtwoord klopt niet." };
    }
  }

  const stored = await saveCredential(email, await hashPassword(input.password));
  if (!stored.ok) return stored;
  const role = await resolveLoginRole(email);
  if (!role) return { ok: false, message: "Je bent niet ingelogd." };
  await replaceSessions(email, {
    email,
    role,
    organizationId: (await findMember(email))?.organization_id ?? null,
  });
  return { ok: true };
}

export async function requestPasswordReset(emailInput: string): Promise<LoginIntent> {
  const email = normalizeEmail(emailInput);
  if (!isEmail(email)) {
    return { ok: false, message: "Vul een geldig e-mailadres in." };
  }
  const role = await resolveLoginRole(email);
  if (!role) {
    return { ok: true, emailed: true };
  }

  const token = createToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString();
  const saved = await saveLoginToken({ email, token, purpose: "password_reset", expiresAt });
  if (!saved) return { ok: false, message: "Opnieuw instellen is tijdelijk niet beschikbaar." };

  const resetUrl = `${siteOrigin()}${workspaceRoutes.loginReset}?token=${encodeURIComponent(token)}`;
  const sent = await sendPasswordResetEmail({ email, resetUrl });
  if (allowDevLogin() && !sent) {
    return { ok: true, emailed: false, destination: `${workspaceRoutes.loginReset}?token=${encodeURIComponent(token)}` };
  }
  return { ok: true, emailed: sent };
}

export async function resetPasswordWithToken(token: string, password: string, confirm: string): Promise<LoginIntent> {
  if (password !== confirm) {
    return { ok: false, message: "De wachtwoorden komen niet overeen." };
  }
  const record = await consumePurposeToken(token, "password_reset");
  if (!record) {
    return { ok: false, message: "Deze herstellink is verlopen of al gebruikt." };
  }
  const rules = validatePassword(password, record.email);
  if (!rules.ok) return rules;

  const stored = await saveCredential(record.email, await hashPassword(password));
  if (!stored.ok) return stored;

  const role = (await resolveLoginRole(record.email)) ?? (record.purpose === "admin" ? "admin" : "customer");
  await replaceSessions(record.email, {
    email: record.email,
    role,
    organizationId: (await findMember(record.email))?.organization_id ?? null,
  });
  return { ok: true, emailed: false, destination: destinationForRole(role) };
}

async function saveLoginToken(input: { email: string; token: string; purpose: string; expiresAt: string }) {
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_login_tokens").insert({
      email: input.email,
      token_hash: hashToken(input.token),
      purpose: input.purpose,
      expires_at: input.expiresAt,
    });
    if (error) {
      console.error("[kopvast] Token opslaan mislukt", error.message);
      return false;
    }
    return true;
  }
  await mutateStore((store) => {
    store.tokens.push({
      id: newId(),
      email: input.email,
      token_hash: hashToken(input.token),
      purpose: input.purpose,
      expires_at: input.expiresAt,
      used_at: null,
    });
  });
  return true;
}

async function consumePurposeToken(token: string, purpose: string) {
  if (!token.trim()) return null;
  const tokenHash = hashToken(token);
  const supabase = refreshClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("kopvast_login_tokens")
      .select("id, email, purpose, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (error || !data || data.used_at || data.purpose !== purpose || Date.parse(data.expires_at) < Date.now()) {
      return null;
    }
    await supabase.from("kopvast_login_tokens").update({ used_at: new Date().toISOString() }).eq("id", data.id);
    return { email: data.email as string, purpose: data.purpose as string };
  }
  return mutateStore((store) => {
    const found = store.tokens.find((item) => item.token_hash === tokenHash);
    if (!found || found.used_at || found.purpose !== purpose || Date.parse(found.expires_at) < Date.now()) {
      return null;
    }
    found.used_at = new Date().toISOString();
    return { email: found.email, purpose: found.purpose };
  });
}

async function replaceSessions(
  email: string,
  next?: { email: string; role: SessionRole; organizationId: string | null }
) {
  const normalized = normalizeEmail(email);
  const supabase = refreshClient();
  if (supabase) {
    await supabase.from("kopvast_sessions").delete().eq("email", normalized);
  } else {
    await mutateStore((store) => {
      store.sessions = store.sessions.filter((item) => item.email !== normalized);
    });
  }
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  if (next) await createSession(next);
}

export function safeNext(next: string | undefined, role: SessionRole) {
  if (next?.startsWith("/") && !next.startsWith("//")) return next;
  return destinationForRole(role);
}

function siteOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://kopvast.nl";
}

async function sendLoginEmail(input: { email: string; verifyUrl: string; role: SessionRole }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info("[kopvast] Loginmail overgeslagen (geen RESEND_API_KEY)");
    return false;
  }

  const { render } = await import("react-email");
  const { Resend } = await import("resend");
  const { LoginLinkEmail } = await import("@/emails/login-link");
  const { fromAddress } = await import("@/lib/email");

  const html = await render(
    LoginLinkEmail({ email: input.email, verifyUrl: input.verifyUrl, role: input.role })
  );
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: input.email,
    subject: input.role === "admin" ? "Inloggen bij Kopvast Admin" : "Inloggen bij je Kopvast-omgeving",
    html,
    text: `Open deze link om in te loggen: ${input.verifyUrl}\nDe link is ${TOKEN_TTL_MINUTES} minuten geldig.`,
  });
  if (error) {
    console.error("[kopvast] Loginmail mislukt", error.message);
    return false;
  }
  return true;
}

async function sendPasswordResetEmail(input: { email: string; resetUrl: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info("[kopvast] Wachtwoordmail overgeslagen (geen RESEND_API_KEY)", input.resetUrl);
    return false;
  }

  const { render } = await import("react-email");
  const { Resend } = await import("resend");
  const { PasswordResetEmail } = await import("@/emails/password-reset");
  const { fromAddress } = await import("@/lib/email");

  const html = await render(PasswordResetEmail({ email: input.email, resetUrl: input.resetUrl }));
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: input.email,
    subject: "Wachtwoord opnieuw instellen",
    html,
    text: `Stel je wachtwoord opnieuw in via deze link: ${input.resetUrl}\nDe link is ${TOKEN_TTL_MINUTES} minuten geldig.`,
  });
  if (error) {
    console.error("[kopvast] Wachtwoordmail mislukt", error.message);
    return false;
  }
  return true;
}
