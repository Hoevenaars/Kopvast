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
import { destinationForRole, isAdminEmail, isEmail, memberHasAccess, normalizeEmail } from "@/lib/product";
import {
  LOGIN_CODE_MAX_ATTEMPTS,
  SESSION_COOKIE,
  createLoginCode,
  createToken,
  formatLoginCode,
  hashLoginCode,
  hashToken,
  isLoginCode,
  normalizeLoginCode,
} from "@/lib/tokens";
import { mutateStore, newId, nowIso, readStore } from "@/lib/workspace-store";

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
  | {
      ok: true;
      emailed: boolean;
      destination?: string;
      needsCode?: boolean;
      email?: string;
      devCode?: string;
    }
  | { ok: false; message: string; needsCode?: boolean; email?: string; devCode?: string };

export function allowDevLogin() {
  return process.env.NODE_ENV !== "production";
}

export async function findMember(email: string) {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase
      .from("kopvast_members")
      .select("id, organization_id, name, email, role, access_enabled")
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
  if (member && memberHasAccess(member)) return "customer";
  return null;
}

export async function startLogin(emailInput: string): Promise<LoginIntent> {
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

  return issueEmailCode({
    email,
    purpose: role,
    send: (code) => sendLoginEmail({ email, code, role }),
    failMessage: "We konden de code nu niet versturen. Probeer het later opnieuw.",
  });
}

export async function verifyLoginCode(
  emailInput: string,
  codeInput: string,
  next?: string
): Promise<LoginIntent> {
  const email = normalizeEmail(emailInput);
  if (!isEmail(email) || !isLoginCode(codeInput)) {
    return {
      ok: false,
      message: "Vul het e-mailadres en de zescijferige code in.",
      needsCode: true,
      email: isEmail(email) ? email : undefined,
    };
  }

  const role = await resolveLoginRole(email);
  if (!role) {
    return { ok: false, message: "Deze code klopt niet of is verlopen.", needsCode: true, email };
  }

  const record = await consumeCodeToken(email, codeInput, role);
  if (!record) {
    return { ok: false, message: "Deze code klopt niet of is verlopen.", needsCode: true, email };
  }

  await createSession({
    email,
    role,
    organizationId: (await findMember(email))?.organization_id ?? null,
  });
  return { ok: true, emailed: false, destination: safeNext(next, role) };
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
  if (session.role === "customer") {
    const member = await findMember(session.email);
    if (!memberHasAccess(member)) {
      await clearSession();
      return null;
    }
  }
  return session;
}

export async function endSessionsForEmail(email: string) {
  const normalized = normalizeEmail(email);
  const supabase = refreshClient();
  if (supabase) {
    await supabase.from("kopvast_sessions").delete().eq("email", normalized);
    return;
  }
  await mutateStore((store) => {
    store.sessions = store.sessions.filter((item) => item.email !== normalized);
  });
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
    return { ok: true, emailed: true, needsCode: true, email };
  }

  return issueEmailCode({
    email,
    purpose: "password_reset",
    send: (code) => sendPasswordResetEmail({ email, code }),
    failMessage: "We konden de code nu niet versturen. Probeer het later opnieuw.",
  });
}

export async function resetPasswordWithCode(
  emailInput: string,
  codeInput: string,
  password: string,
  confirm: string
): Promise<LoginIntent> {
  const email = normalizeEmail(emailInput);
  if (!isEmail(email) || !isLoginCode(codeInput)) {
    return {
      ok: false,
      message: "Vul het e-mailadres en de zescijferige code in.",
      needsCode: true,
      email: isEmail(email) ? email : undefined,
    };
  }
  if (password !== confirm) {
    return { ok: false, message: "De wachtwoorden komen niet overeen.", needsCode: true, email };
  }
  const rules = validatePassword(password, email);
  if (!rules.ok) return { ...rules, needsCode: true, email };

  const record = await consumeCodeToken(email, codeInput, "password_reset");
  if (!record) {
    return { ok: false, message: "Deze code klopt niet of is verlopen.", needsCode: true, email };
  }

  return finishPasswordReset(record.email, password);
}

export async function resetPasswordWithToken(token: string, password: string, confirm: string): Promise<LoginIntent> {
  if (password !== confirm) {
    return { ok: false, message: "De wachtwoorden komen niet overeen." };
  }
  const rules = validatePassword(password);
  if (!rules.ok) return rules;
  const record = await consumePurposeToken(token, "password_reset");
  if (!record) {
    return { ok: false, message: "Deze herstelcode is verlopen of al gebruikt." };
  }
  const passwordRules = validatePassword(password, record.email);
  if (!passwordRules.ok) return passwordRules;
  return finishPasswordReset(record.email, password);
}

async function finishPasswordReset(email: string, password: string): Promise<LoginIntent> {
  const stored = await saveCredential(email, await hashPassword(password));
  if (!stored.ok) return stored;

  const role = (await resolveLoginRole(email)) ?? "customer";
  await replaceSessions(email, {
    email,
    role,
    organizationId: (await findMember(email))?.organization_id ?? null,
  });
  return { ok: true, emailed: false, destination: destinationForRole(role) };
}

async function issueEmailCode(input: {
  email: string;
  purpose: string;
  send: (code: string) => Promise<boolean>;
  failMessage: string;
}): Promise<LoginIntent> {
  const code = createLoginCode();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString();
  const saved = await saveLoginToken({
    email: input.email,
    tokenHash: hashLoginCode(input.email, code, input.purpose),
    purpose: input.purpose,
    expiresAt,
  });
  if (!saved) return { ok: false, message: input.failMessage };

  const sent = await input.send(code);
  if (sent) {
    return { ok: true, emailed: true, needsCode: true, email: input.email };
  }
  if (allowDevLogin()) {
    console.info("[kopvast] Code (dev)", input.email, code);
    return { ok: true, emailed: false, needsCode: true, email: input.email, devCode: code };
  }
  return { ok: false, message: input.failMessage };
}

async function saveLoginToken(input: { email: string; tokenHash: string; purpose: string; expiresAt: string }) {
  const now = nowIso();
  const supabase = refreshClient();
  if (supabase) {
    const { error: invalidateError } = await supabase
      .from("kopvast_login_tokens")
      .update({ used_at: now })
      .eq("email", input.email)
      .eq("purpose", input.purpose)
      .is("used_at", null);
    if (invalidateError) {
      console.error("[kopvast] Oude codes wissen mislukt", invalidateError.message);
    }
    const { error } = await supabase.from("kopvast_login_tokens").insert({
      email: input.email,
      token_hash: input.tokenHash,
      purpose: input.purpose,
      expires_at: input.expiresAt,
      failed_attempts: 0,
    });
    if (error) {
      console.error("[kopvast] Token opslaan mislukt", error.message);
      return false;
    }
    return true;
  }
  await mutateStore((store) => {
    for (const item of store.tokens) {
      if (item.email === input.email && item.purpose === input.purpose && !item.used_at) {
        item.used_at = now;
      }
    }
    store.tokens.push({
      id: newId(),
      email: input.email,
      token_hash: input.tokenHash,
      purpose: input.purpose,
      expires_at: input.expiresAt,
      used_at: null,
      failed_attempts: 0,
    });
  });
  return true;
}

async function consumeCodeToken(email: string, codeInput: string, purpose: string) {
  const code = normalizeLoginCode(codeInput);
  const tokenHash = hashLoginCode(email, code, purpose);
  const now = nowIso();
  const supabase = refreshClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("kopvast_login_tokens")
      .select("id, email, purpose, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (
      error ||
      !data ||
      data.used_at ||
      data.purpose !== purpose ||
      data.email !== email ||
      Date.parse(data.expires_at) < Date.now()
    ) {
      await recordFailedCodeAttempt(email, purpose);
      return null;
    }
    const { data: updated } = await supabase
      .from("kopvast_login_tokens")
      .update({ used_at: now })
      .eq("id", data.id)
      .is("used_at", null)
      .select("id")
      .maybeSingle();
    if (!updated) return null;
    return { email: data.email as string, purpose: data.purpose as string };
  }

  return mutateStore((store) => {
    const found = store.tokens.find((item) => item.token_hash === tokenHash);
    if (
      !found ||
      found.used_at ||
      found.purpose !== purpose ||
      found.email !== email ||
      Date.parse(found.expires_at) < Date.now()
    ) {
      bumpFailedCodeAttempt(store.tokens, email, purpose, now);
      return null;
    }
    found.used_at = now;
    return { email: found.email, purpose: found.purpose };
  });
}

async function recordFailedCodeAttempt(email: string, purpose: string) {
  const now = nowIso();
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase
      .from("kopvast_login_tokens")
      .select("id, failed_attempts, expires_at, used_at")
      .eq("email", email)
      .eq("purpose", purpose)
      .is("used_at", null)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return;
    const failed = (data.failed_attempts ?? 0) + 1;
    await supabase
      .from("kopvast_login_tokens")
      .update({
        failed_attempts: failed,
        used_at: failed >= LOGIN_CODE_MAX_ATTEMPTS ? now : data.used_at,
      })
      .eq("id", data.id);
    return;
  }
  await mutateStore((store) => {
    bumpFailedCodeAttempt(store.tokens, email, purpose, now);
  });
}

function bumpFailedCodeAttempt(
  tokens: Array<{
    email: string;
    purpose: string;
    used_at: string | null;
    expires_at: string;
    failed_attempts?: number;
  }>,
  email: string,
  purpose: string,
  now: string
) {
  const found = tokens
    .filter(
      (item) =>
        item.email === email &&
        item.purpose === purpose &&
        !item.used_at &&
        Date.parse(item.expires_at) >= Date.now()
    )
    .sort((a, b) => Date.parse(b.expires_at) - Date.parse(a.expires_at))[0];
  if (!found) return;
  found.failed_attempts = (found.failed_attempts ?? 0) + 1;
  if (found.failed_attempts >= LOGIN_CODE_MAX_ATTEMPTS) {
    found.used_at = now;
  }
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

async function sendLoginEmail(input: { email: string; code: string; role: SessionRole }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info("[kopvast] Loginmail overgeslagen (geen RESEND_API_KEY)");
    return false;
  }

  const { render } = await import("react-email");
  const { Resend } = await import("resend");
  const { LoginLinkEmail } = await import("@/emails/login-link");
  const { fromAddress } = await import("@/lib/email");

  const html = await render(LoginLinkEmail({ email: input.email, code: input.code, role: input.role }));
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: input.email,
    subject: input.role === "admin" ? "Je inlogcode voor Kopvast Admin" : "Je inlogcode voor Kopvast",
    html,
    text: `Je inlogcode is ${formatLoginCode(input.code)}.\nDe code is ${TOKEN_TTL_MINUTES} minuten geldig.`,
  });
  if (error) {
    console.error("[kopvast] Loginmail mislukt", error.message);
    return false;
  }
  return true;
}

async function sendPasswordResetEmail(input: { email: string; code: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info("[kopvast] Wachtwoordmail overgeslagen (geen RESEND_API_KEY)");
    return false;
  }

  const { render } = await import("react-email");
  const { Resend } = await import("resend");
  const { PasswordResetEmail } = await import("@/emails/password-reset");
  const { fromAddress } = await import("@/lib/email");

  const html = await render(PasswordResetEmail({ email: input.email, code: input.code }));
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: input.email,
    subject: "Code om je wachtwoord opnieuw in te stellen",
    html,
    text: `Je code is ${formatLoginCode(input.code)}.\nVoer hem in op kopvast.nl om een nieuw wachtwoord te kiezen. De code is ${TOKEN_TTL_MINUTES} minuten geldig.`,
  });
  if (error) {
    console.error("[kopvast] Wachtwoordmail mislukt", error.message);
    return false;
  }
  return true;
}
