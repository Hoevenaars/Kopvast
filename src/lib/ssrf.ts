import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.google",
]);

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return null;
  }
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function inRange(ip: string, cidr: string): boolean {
  const [base, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(base);
  if (ipInt === null || baseInt === null || Number.isNaN(bits)) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

export function isPrivateIPv4(ip: string): boolean {
  const ranges = [
    "0.0.0.0/8",
    "10.0.0.0/8",
    "100.64.0.0/10",
    "127.0.0.0/8",
    "169.254.0.0/16",
    "172.16.0.0/12",
    "192.0.0.0/24",
    "192.0.2.0/24",
    "192.168.0.0/16",
    "198.18.0.0/15",
    "198.51.100.0/24",
    "203.0.113.0/24",
    "224.0.0.0/4",
    "240.0.0.0/4",
  ];
  return ranges.some((range) => inRange(ip, range));
}

export function isPrivateIPv6(ip: string): boolean {
  const value = ip.toLowerCase();
  if (value === "::" || value === "::1") return true;
  if (value.startsWith("fe80:") || value.startsWith("fc") || value.startsWith("fd")) return true;
  if (value.startsWith("ff")) return true;
  if (value.includes(".")) {
    const mapped = value.split(":").pop();
    if (mapped && isIP(mapped) === 4) return isPrivateIPv4(mapped);
  }
  return false;
}

export function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true;
}

export function normalizeWebsiteUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Vul een websiteadres in.");
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:/i.test(trimmed)) {
    throw new Error("Alleen http- en https-adressen zijn toegestaan.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error("Dit lijkt geen geldig websiteadres.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Alleen http- en https-adressen zijn toegestaan.");
  }

  if (url.username || url.password) {
    throw new Error("Dit adres is niet toegestaan.");
  }

  const hostname = url.hostname.replace(/\.$/, "").toLowerCase();
  if (!hostname || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("Dit adres is niet toegestaan.");
  }
  if (BLOCKED_HOSTS.has(hostname) || hostname === "0.0.0.0") {
    throw new Error("Dit adres is niet toegestaan.");
  }
  if (isIP(hostname) && isBlockedIp(hostname)) {
    throw new Error("Dit adres is niet toegestaan.");
  }

  url.hash = "";
  return url;
}

export async function assertPublicHostname(hostname: string): Promise<void> {
  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new Error("Dit adres is niet toegestaan.");
    }
    return;
  }

  const records = await lookup(hostname, { all: true, verbatim: true });
  if (!records.length) {
    throw new Error("Dit domein is niet bereikbaar.");
  }
  if (records.some((record) => isBlockedIp(record.address))) {
    throw new Error("Dit adres is niet toegestaan.");
  }
}
