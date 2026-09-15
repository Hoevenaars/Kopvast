import { createHash, randomBytes, randomInt } from "node:crypto";

export const SESSION_COOKIE = "kv_session";
export const LOGIN_CODE_LENGTH = 6;
export const LOGIN_CODE_MAX_ATTEMPTS = 5;

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

export function createLoginCode() {
  return String(randomInt(0, 10 ** LOGIN_CODE_LENGTH)).padStart(LOGIN_CODE_LENGTH, "0");
}

export function normalizeLoginCode(input: string) {
  return input.replace(/\D/g, "");
}

export function isLoginCode(input: string) {
  return new RegExp(`^\\d{${LOGIN_CODE_LENGTH}}$`).test(normalizeLoginCode(input));
}

export function hashLoginCode(email: string, code: string, purpose: string) {
  return hashToken(`${email}:${purpose}:${normalizeLoginCode(code)}`);
}

export function formatLoginCode(code: string) {
  const digits = normalizeLoginCode(code);
  if (digits.length !== LOGIN_CODE_LENGTH) return digits;
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}
