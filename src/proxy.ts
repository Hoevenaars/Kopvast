import { NextResponse, type NextRequest } from "next/server";
import { domainLandingRedirectUrl } from "@/lib/domain-landing";
import { applyHeaders } from "@/lib/scout/headers";
import { isProductionEnv, isScoutHostname, isScoutVercelProject, marketingSiteUrl, scoutAppUrl } from "@/lib/scout/config";

export function proxy(request: NextRequest) {
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(",")[0]?.trim() ?? "";
  const scoutHost = isScoutHostname(host) || isScoutVercelProject();
  const url = request.nextUrl.clone();
  const path = url.pathname;

  if (
    isProductionEnv() &&
    (host === "kopvast.nl" || host === "www.kopvast.nl") &&
    path.startsWith("/scout")
  ) {
    const dest = new URL(path.replace(/^\/scout/, "") || "/", scoutAppUrl().replace(/\/scout$/, ""));
    dest.search = url.search;
    return NextResponse.redirect(dest, 308);
  }

  const parkedRedirect = domainLandingRedirectUrl(host, marketingSiteUrl());
  if (parkedRedirect) {
    return NextResponse.redirect(parkedRedirect, 307);
  }

  if (scoutHost) {
    if (path.startsWith("/api/") && !path.startsWith("/api/scout")) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    if (
      !path.startsWith("/scout") &&
      !path.startsWith("/api/scout") &&
      !path.startsWith("/_next") &&
      path !== "/favicon.ico"
    ) {
      url.pathname = path === "/" ? "/scout" : `/scout${path}`;
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-scout-public", "1");
      const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
      return applyHeaders(response, path);
    }
  }

  const response = NextResponse.next();
  if (scoutHost || path.startsWith("/scout") || path.startsWith("/api/scout")) {
    return applyHeaders(response, path);
  }
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (
    path.startsWith("/api/") ||
    path.startsWith("/admin") ||
    path.startsWith("/klant") ||
    path.startsWith("/console") ||
    path.startsWith("/inloggen") ||
    path.startsWith("/voorstel")
  ) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images/).*)"],
};
