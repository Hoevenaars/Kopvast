export const SCOUT_PRODUCTION_ORIGIN = "https://scout.kopvast.nl";
export const SCOUT_VERCEL_PROJECT = "kopvast-scout";
export const SCOUT_SESSION_COOKIE = "kv_scout";
export const SCOUT_SESSION_DAYS = 90;

export type DeployEnv = "development" | "preview" | "production";

export function deployEnv(): DeployEnv {
  const vercel = process.env.VERCEL_ENV;
  if (vercel === "production" || vercel === "preview" || vercel === "development") return vercel;
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

export function isProductionEnv() {
  return deployEnv() === "production";
}

export function isPreviewEnv() {
  return deployEnv() === "preview";
}

export function scoutAppUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (isProductionEnv()) return SCOUT_PRODUCTION_ORIGIN;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:43127/scout";
}

export function marketingSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "https://kopvast.nl";
}

export function allowedUserId() {
  return process.env.ALLOWED_USER_ID?.trim() || "";
}

export function allowedEmails() {
  const extra = (process.env.ALLOWED_EMAILS ?? process.env.SCOUT_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const admins = (process.env.KOPVAST_ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const merged = [...extra, ...admins];
  if (!merged.length) return ["contact@kopvast.nl"];
  return Array.from(new Set(merged));
}

export function fallbackScoutUserId() {
  return allowedUserId() || "00000000-0000-4000-a000-000000000001";
}

export function supabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.WEBSITE_REFRESH_SUPABASE_URL?.trim() ||
    ""
  );
}

export function supabaseAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    ""
  );
}

export function supabaseServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.WEBSITE_REFRESH_SERVICE_ROLE_KEY?.trim() ||
    ""
  );
}

export function allowPreviewProcessing() {
  return process.env.SCOUT_PREVIEW_PROCESSING === "true";
}

export function allowExpensiveSideEffects() {
  if (isPreviewEnv()) return allowPreviewProcessing();
  return true;
}

export function scoutCronSecret() {
  return process.env.CRON_SECRET?.trim() || process.env.SCOUT_CRON_SECRET?.trim() || "";
}

export function isScoutVercelProject() {
  return (process.env.VERCEL_PROJECT_NAME ?? "").toLowerCase() === SCOUT_VERCEL_PROJECT;
}

export function isScoutHostname(host: string) {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  if (!hostname) return false;
  if (hostname === "scout.kopvast.nl") return true;
  if (hostname === "scout.localhost") return true;
  if (hostname.startsWith("scout.")) return true;
  return false;
}

export function allowedOrigins(): string[] {
  const origins = new Set<string>();
  origins.add(SCOUT_PRODUCTION_ORIGIN);
  const app = scoutAppUrl();
  try {
    origins.add(new URL(app).origin);
  } catch {
    /* ignore */
  }
  if (deployEnv() === "development") {
    origins.add("http://localhost:43127");
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:43127");
    origins.add("http://127.0.0.1:3000");
  }
  if (process.env.VERCEL_URL) {
    origins.add(`https://${process.env.VERCEL_URL}`);
  }
  return Array.from(origins);
}

export function originAllowed(origin: string | null | undefined) {
  if (!origin) return false;
  return allowedOrigins().includes(origin.replace(/\/$/, ""));
}
