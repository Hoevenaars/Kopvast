import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function refreshClient(): SupabaseClient | null {
  const url = process.env.WEBSITE_REFRESH_SUPABASE_URL;
  const key = process.env.WEBSITE_REFRESH_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
