import { cookies } from "next/headers";
import { refreshClient } from "@/lib/refresh";
import { destinationForRole, isAdminEmail, isEmail, normalizeEmail } from "@/lib/product";
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

  if (allowDevLogin()) {
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
    if (!found || found.used_at || Date.parse(found.expires_at) < Date.now()) return null;
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
