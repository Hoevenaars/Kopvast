"use server";

import { loadTrackedLanding } from "@/lib/acquisition-clicks";
import { handleAcquisitionChoice } from "@/lib/commercial-handoffs";

export type ConfirmInterestResult = { ok: true; already?: boolean } | { ok: false; message: string };

export async function confirmAcquisitionInterest(
  _previous: ConfirmInterestResult | null,
  formData: FormData
): Promise<ConfirmInterestResult> {
  const token = String(formData.get("token") ?? "");
  const landing = await loadTrackedLanding(token);
  if (!landing) return { ok: false, message: "Deze link is niet meer geldig." };
  const result = await handleAcquisitionChoice({
    prospectId: landing.prospectId,
    choice: landing.choice,
  });
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, already: result.already };
}
