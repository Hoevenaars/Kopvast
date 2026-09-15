import { refreshClient } from "./refresh";

export const CLEAR_ACQUISITION_CONFIRM = "LEEGMAKEN";
export const LIVE_MODE_CONFIRM = "LIVE";
export const TEST_MODE_CONFIRM = "TEST";

export function matchesConfirm(value: string, expected: string) {
  return value.trim().toUpperCase() === expected;
}

export type ClearAcquisitionResult =
  | { ok: true; prospects: number; leads: number; mails: number }
  | { ok: false; message: string };

export async function clearAcquisitionWorkspace(): Promise<ClearAcquisitionResult> {
  const supabase = refreshClient();
  if (!supabase) return { ok: false, message: "Website Refresh is niet gekoppeld." };

  const { data, error } = await supabase.rpc("kopvast_clear_acquisition_workspace");
  if (error) return { ok: false, message: error.message };

  const result = data as { ok?: boolean; prospects?: number; leads?: number; mails?: number } | null;
  if (!result?.ok) return { ok: false, message: "Leegmaken is niet gelukt." };
  return {
    ok: true,
    prospects: result.prospects ?? 0,
    leads: result.leads ?? 0,
    mails: result.mails ?? 0,
  };
}
