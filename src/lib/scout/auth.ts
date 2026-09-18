import { cookies, headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { refreshClient } from "@/lib/refresh";
import { isAdminEmail, isEmail, normalizeEmail } from "@/lib/product";
import { loginWithPassword, readSession, startLogin, verifyLoginCode } from "@/lib/auth";
import { createToken, hashToken } from "@/lib/tokens";
import {
  allowedEmails,
  allowedUserId,
  deployEnv,
  fallbackScoutUserId,
  isProductionEnv,
  SCOUT_SESSION_COOKIE,
  SCOUT_SESSION_DAYS,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "./config";
import type { ScoutUser } from "./types";

export class ScoutAuthError extends Error {
  status: number;
  constructor(message = "Geen toegang.", status = 403) {
    super(message);
    this.name = "ScoutAuthError";
    this.status = status;
  }
}

function sessionSecret() {
  const secret = process.env.KOPVAST_SESSION_SECRET || process.env.WEBSITE_REFRESH_SERVICE_ROLE_KEY;
  if (secret) return secret;
  if (isProductionEnv()) throw new Error("KOPVAST_SESSION_SECRET ontbreekt");
  return "kopvast-scout-dev-session";
}

export function hashScoutToken(token: string) {
  return createHash("sha256").update(`${sessionSecret()}:scout:${token}`).digest("hex");
}

export function scoutServiceClient() {
  const url = supabaseUrl();
  const key = supabaseServiceRoleKey();
  if (!url || !key) return refreshClient();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function emailAllowed(email: string) {
  const normalized = normalizeEmail(email);
  if (!isEmail(normalized)) return false;
  if (allowedEmails().includes(normalized)) return true;
  if (isAdminEmail(normalized)) return true;
  return false;
}

export function assertAllowlist(user: ScoutUser) {
  const allowedId = allowedUserId();
  if (allowedId && user.id !== allowedId) {
    throw new ScoutAuthError();
  }
  if (!emailAllowed(user.email)) {
    throw new ScoutAuthError();
  }
  if (isProductionEnv() && !allowedId && !allowedEmails().length && !isAdminEmail(user.email)) {
    throw new ScoutAuthError();
  }
}

async function persistScoutSession(user: ScoutUser) {
  const token = createToken();
  const expiresAt = new Date(Date.now() + SCOUT_SESSION_DAYS * 24 * 60 * 60 * 1000);
  const row = {
    user_id: user.id,
    email: user.email,
    token_hash: hashScoutToken(token),
    expires_at: expiresAt.toISOString(),
  };
  const supabase = scoutServiceClient();
  if (supabase) {
    await supabase.from("scout_sessions").insert(row);
  }
  const jar = await cookies();
  jar.set(SCOUT_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProductionEnv() || deployEnv() === "preview",
    path: "/",
    expires: expiresAt,
  });
  return user;
}

async function readScoutCookie(): Promise<ScoutUser | null> {
  const jar = await cookies();
  const token = jar.get(SCOUT_SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashScoutToken(token);
  const supabase = scoutServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from("scout_sessions")
      .select("user_id, email, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (!data || Date.parse(data.expires_at) < Date.now()) return null;
    return { id: data.user_id, email: data.email };
  }
  return null;
}

async function readSupabaseAuthUser(): Promise<ScoutUser | null> {
  const url = supabaseUrl();
  const anon = supabaseAnonKey();
  if (!url || !anon) return null;
  const jar = await cookies();
  const access =
    jar.get("sb-access-token")?.value ||
    jar.get("sb:token")?.value ||
    "";
  if (!access) return null;
  const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await supabase.auth.getUser(access);
  if (!data.user?.email) return null;
  return { id: data.user.id, email: normalizeEmail(data.user.email) };
}

function userFromAdmin(email: string): ScoutUser {
  return { id: fallbackScoutUserId(), email: normalizeEmail(email) };
}

export async function readScoutUser(): Promise<ScoutUser | null> {
  const fromCookie = await readScoutCookie();
  if (fromCookie) {
    try {
      assertAllowlist(fromCookie);
      return fromCookie;
    } catch {
      return null;
    }
  }

  const fromSupabase = await readSupabaseAuthUser();
  if (fromSupabase) {
    try {
      assertAllowlist(fromSupabase);
      return fromSupabase;
    } catch {
      return null;
    }
  }

  const workspace = await readSession();
  if (workspace?.role === "admin" && emailAllowed(workspace.email)) {
    const user = userFromAdmin(workspace.email);
    try {
      assertAllowlist(user);
      return user;
    } catch {
      return null;
    }
  }
  return null;
}

export async function requireScoutUser(): Promise<ScoutUser> {
  const user = await readScoutUser();
  if (!user) throw new ScoutAuthError("Niet ingelogd.", 401);
  assertAllowlist(user);
  return user;
}

export async function requestScoutLogin(email: string) {
  const normalized = normalizeEmail(email);
  if (!emailAllowed(normalized)) {
    return { ok: false as const, message: "Dit account heeft geen toegang tot Scout." };
  }
  return startLogin(normalized);
}

export async function loginScoutWithPassword(email: string, password: string) {
  const normalized = normalizeEmail(email);
  if (!emailAllowed(normalized)) {
    return { ok: false as const, message: "Dit account heeft geen toegang tot Scout." };
  }
  const result = await loginWithPassword(normalized, password, "/");
  if (!result.ok) return result;
  if (!result.needsCode) {
    await persistScoutSession(userFromAdmin(normalized));
  }
  return result;
}

export async function verifyScoutLoginCode(email: string, code: string) {
  const normalized = normalizeEmail(email);
  if (!emailAllowed(normalized)) {
    return { ok: false as const, message: "Dit account heeft geen toegang tot Scout." };
  }
  const result = await verifyLoginCode(normalized, code, "/");
  if (!result.ok) return result;
  if (!result.needsCode) {
    await persistScoutSession(userFromAdmin(normalized));
  }
  return { ...result, destination: undefined };
}

export async function clearScoutSession() {
  const jar = await cookies();
  const token = jar.get(SCOUT_SESSION_COOKIE)?.value;
  jar.delete(SCOUT_SESSION_COOKIE);
  if (!token) return;
  const supabase = scoutServiceClient();
  if (supabase) {
    await supabase.from("scout_sessions").delete().eq("token_hash", hashScoutToken(token));
  }
}

export async function requestOriginOrNull() {
  const headerList = await headers();
  return headerList.get("origin") || headerList.get("referer") || null;
}

export { hashToken };
