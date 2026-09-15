import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "kv_session";

function sessionSecret() {
  const secret = process.env.KOPVAST_SESSION_SECRET || process.env.WEBSITE_REFRESH_SERVICE_ROLE_KEY;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("KOPVAST_SESSION_SECRET ontbreekt");
  }
  return "kopvast-dev-session";
}

export function hashToken(token: string) {
  return createHash("sha256").update(`${sessionSecret()}:${token}`).digest("hex");
}

export function createToken() {
  return randomBytes(32).toString("base64url");
}
