import { scoutServiceClient } from "./auth";
import { deployEnv } from "./config";

type LimitConfig = { limit: number; windowMs: number };

export const RATE_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  lead_create: { limit: 40, windowMs: 60 * 60 * 1000 },
  scan: { limit: 25, windowMs: 60 * 60 * 1000 },
  rescan: { limit: 20, windowMs: 60 * 60 * 1000 },
  ai: { limit: 20, windowMs: 60 * 60 * 1000 },
  enrichment: { limit: 30, windowMs: 60 * 60 * 1000 },
  upload: { limit: 15, windowMs: 60 * 60 * 1000 },
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

const memory = new Map<string, { count: number; windowStart: number }>();

export async function consumeRateLimit(action: RateLimitAction, key: string): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const config: LimitConfig = RATE_LIMITS[action];
  const id = `${deployEnv()}:${action}:${key}`;
  const now = Date.now();
  const supabase = scoutServiceClient();

  if (supabase) {
    const { data } = await supabase.from("scout_rate_limits").select("id, count, window_start").eq("id", id).maybeSingle();
    const windowStart = data?.window_start ? Date.parse(data.window_start) : now;
    const expired = now - windowStart >= config.windowMs;
    const count = expired ? 0 : (data?.count ?? 0);
    if (count >= config.limit) {
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((config.windowMs - (now - windowStart)) / 1000)) };
    }
    await supabase.from("scout_rate_limits").upsert({
      id,
      count: count + 1,
      window_start: new Date(expired ? now : windowStart).toISOString(),
    });
    return { ok: true };
  }

  const current = memory.get(id);
  if (!current || now - current.windowStart >= config.windowMs) {
    memory.set(id, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (current.count >= config.limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((config.windowMs - (now - current.windowStart)) / 1000)) };
  }
  current.count += 1;
  return { ok: true };
}

export function rateLimitMessage(retryAfterSec: number) {
  return `Even rustig aan. Probeer het over ${retryAfterSec} seconden opnieuw.`;
}
