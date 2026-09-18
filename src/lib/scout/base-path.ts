import { headers } from "next/headers";
import { isScoutHostname, isScoutVercelProject } from "./config";

export async function scoutPublicBase() {
  const headerList = await headers();
  if (headerList.get("x-scout-public") === "1") return "";
  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "";
  if (isScoutHostname(host) || isScoutVercelProject()) return "";
  return "/scout";
}

export function withBase(base: string, path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (!base) return clean === "/scout" ? "/" : clean.replace(/^\/scout/, "") || "/";
  if (clean === "/") return base || "/";
  return `${base}${clean}`;
}
