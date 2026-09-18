import { allowedOrigins, isProductionEnv, scoutAppUrl } from "./config";

export function scoutSecurityHeaders(pathname: string): Record<string, string> {
  const app = scoutAppUrl();
  const connect = Array.from(
    new Set([
      "'self'",
      ...allowedOrigins(),
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.WEBSITE_REFRESH_SUPABASE_URL,
    ].filter(Boolean) as string[])
  ).join(" ");

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    `connect-src ${connect}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join("; ");

  const headers: Record<string, string> = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(self), microphone=(), geolocation=(self), interest-cohort=(), browsing-topics=()",
    "X-DNS-Prefetch-Control": "off",
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "Content-Security-Policy": csp,
  };

  if (isProductionEnv() && (pathname.startsWith("/scout") || app.includes("scout.kopvast.nl"))) {
    headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";
  }
  return headers;
}

export function applyHeaders(response: { headers: Headers }, pathname: string) {
  for (const [key, value] of Object.entries(scoutSecurityHeaders(pathname))) {
    response.headers.set(key, value);
  }
  return response;
}
