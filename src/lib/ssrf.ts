import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google",
  "metadata.google.internal",
  "metadata.internal",
  "instance-data",
  "instance-data.ec2.internal",
  "kubernetes",
  "kubernetes.default",
  "kubernetes.default.svc",
  "kubernetes.default.svc.cluster.local",
  "internal",
  "intranet",
  "corp",
]);

const BLOCKED_SUFFIXES = [
  ".local",
  ".internal",
  ".localhost",
  ".intranet",
  ".corp",
  ".home",
  ".lan",
  ".localdomain",
  ".private",
  ".arpa",
];

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

export function expandIPv6(ip: string): string | null {
  const value = ip.toLowerCase().split("%")[0] ?? ip;
  if (value.includes(".")) {
    const last = value.lastIndexOf(":");
    const mapped = value.slice(last + 1);
    if (isIP(mapped) === 4) {
      const prefix = value.slice(0, last + 1);
      const int = ipv4ToInt(mapped);
      if (int === null) return null;
      const hi = (int >>> 16) & 0xffff;
      const lo = int & 0xffff;
      return expandIPv6(`${prefix}${hi.toString(16)}:${lo.toString(16)}`);
    }
  }
  const [head, tail] = value.split("::");
  const headParts = head ? head.split(":").filter(Boolean) : [];
  const tailParts = tail ? tail.split(":").filter(Boolean) : [];
  if (!value.includes("::")) {
    const parts = value.split(":");
    if (parts.length !== 8) return null;
    return parts.map((part) => part.padStart(4, "0")).join(":");
  }
  const missing = 8 - headParts.length - tailParts.length;
  if (missing < 0) return null;
  const parts = [...headParts, ...Array.from({ length: missing }, () => "0"), ...tailParts];
  if (parts.length !== 8) return null;
  return parts.map((part) => part.padStart(4, "0")).join(":");
}

export function isPrivateIPv6(ip: string): boolean {
  const expanded = expandIPv6(ip);
  const value = (expanded ?? ip).toLowerCase();
  if (value === "0000:0000:0000:0000:0000:0000:0000:0000") return true;
  if (value === "0000:0000:0000:0000:0000:0000:0000:0001") return true;
  if (value.startsWith("fe80:") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb")) {
    return true;
  }
  if (value.startsWith("fc") || value.startsWith("fd")) return true;
  if (value.startsWith("ff")) return true;
  if (value.startsWith("2001:0db8:")) return true;
  if (value.startsWith("0000:0000:0000:0000:0000:ffff:")) {
    const mapped = ip.toLowerCase().split(":").pop();
    if (mapped && isIP(mapped) === 4) return isPrivateIPv4(mapped);
    const hi = parseInt(value.slice(30, 34), 16);
    const lo = parseInt(value.slice(35, 39), 16);
    if (Number.isFinite(hi) && Number.isFinite(lo)) {
      const a = (hi >> 8) & 255;
      const b = hi & 255;
      const c = (lo >> 8) & 255;
      const d = lo & 255;
      return isPrivateIPv4(`${a}.${b}.${c}.${d}`);
    }
  }
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

export function decodeNumericIpv4(hostname: string): string | null {
  if (!/^\d+$/.test(hostname)) return null;
  try {
    const value = BigInt(hostname);
    if (value < BigInt(0) || value > BigInt(0xffffffff)) return null;
    const n = Number(value);
    return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
  } catch {
    return null;
  }
}

export function isBlockedHostname(hostnameInput: string): boolean {
  const hostname = hostnameInput.replace(/\.$/, "").toLowerCase();
  if (!hostname) return true;
  if (BLOCKED_HOSTS.has(hostname)) return true;
  if (BLOCKED_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) return true;
  if (hostname.includes("metadata.google")) return true;
  if (hostname === "169.254.169.254" || hostname === "169.254.170.2") return true;
  const numeric = decodeNumericIpv4(hostname);
  if (numeric && isBlockedIp(numeric)) return true;
  if (isIP(hostname) && isBlockedIp(hostname)) return true;
  if (!hostname.includes(".") && isIP(hostname) !== 6) return true;
  return false;
}

export function canonicalRegistrableDomain(hostname: string): string {
  const host = hostname.replace(/\.$/, "").toLowerCase();
  return host.replace(/^www\./, "");
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
  if (isBlockedHostname(hostname)) {
    throw new Error("Dit adres is niet toegestaan.");
  }

  url.hostname = hostname;
  url.hash = "";
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }
  return url;
}

export async function assertPublicHostname(hostname: string): Promise<void> {
  const host = hostname.replace(/\.$/, "").toLowerCase();
  if (isBlockedHostname(host)) {
    throw new Error("Dit adres is niet toegestaan.");
  }

  const numeric = decodeNumericIpv4(host);
  if (numeric) {
    if (isBlockedIp(numeric)) throw new Error("Dit adres is niet toegestaan.");
    return;
  }

  if (isIP(host)) {
    if (isBlockedIp(host)) {
      throw new Error("Dit adres is niet toegestaan.");
    }
    return;
  }

  const records = await lookup(host, { all: true, verbatim: true });
  if (!records.length) {
    throw new Error("Dit domein is niet bereikbaar.");
  }
  if (records.some((record) => isBlockedIp(record.address))) {
    throw new Error("Dit adres is niet toegestaan.");
  }
}

export type SafeFetchResult = {
  finalUrl: string;
  body: Buffer;
  contentType: string;
  status: number;
};

export async function fetchPublicResource(
  start: URL,
  options?: {
    timeoutMs?: number;
    maxBytes?: number;
    maxRedirects?: number;
    method?: "GET" | "HEAD";
    accept?: string;
    userAgent?: string;
  }
): Promise<SafeFetchResult> {
  const timeoutMs = options?.timeoutMs ?? 8000;
  const maxBytes = options?.maxBytes ?? 1_500_000;
  const maxRedirects = options?.maxRedirects ?? 3;
  const method = options?.method ?? "GET";
  let current = new URL(normalizeWebsiteUrl(start.toString()).toString());

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    current = new URL(normalizeWebsiteUrl(current.toString()).toString());
    await assertPublicHostname(current.hostname);

    const response = await fetch(current, {
      method,
      redirect: "manual",
      headers: {
        Accept: options?.accept ?? "text/html,application/xhtml+xml",
        "User-Agent": options?.userAgent ?? "KopvastScout/1.0 (+https://scout.kopvast.nl)",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("De website stuurde een onvolledige omleiding.");
      }
      const next = new URL(location, current);
      current = new URL(normalizeWebsiteUrl(next.toString()).toString());
      continue;
    }

    if (!response.ok) {
      throw new Error(`De website gaf status ${response.status} terug.`);
    }

    if (method === "HEAD") {
      return {
        finalUrl: current.toString(),
        body: Buffer.alloc(0),
        contentType: response.headers.get("content-type") ?? "",
        status: response.status,
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    const lengthHeader = response.headers.get("content-length");
    if (lengthHeader && Number(lengthHeader) > maxBytes) {
      throw new Error("De pagina is te groot om veilig te beoordelen.");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw new Error("De pagina is te groot om veilig te beoordelen.");
    }

    return {
      finalUrl: current.toString(),
      body: buffer,
      contentType,
      status: response.status,
    };
  }

  throw new Error("De website volgt te veel omleidingen.");
}
