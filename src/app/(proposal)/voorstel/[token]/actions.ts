"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { openCustomerOnboardingAfterPublicAccept } from "@/lib/auth";
import { acceptProposal, askProposalQuestion } from "@/lib/proposal-ops";
import { proposalPublicPath } from "@/lib/proposals";

export type ProposalResponseState = { ok: boolean; message: string; next?: string | null } | null;

export async function askQuestionAction(
  _previous: ProposalResponseState,
  formData: FormData
): Promise<ProposalResponseState> {
  const token = String(formData.get("token") ?? "");
  const result = await askProposalQuestion(token, String(formData.get("question") ?? ""));
  revalidatePath(proposalPublicPath(token));
  return result.ok
    ? { ok: true, message: "We hebben je vraag ontvangen. We nemen contact met je op." }
    : { ok: false, message: result.message };
}

export async function acceptProposalAction(
  _previous: ProposalResponseState,
  formData: FormData
): Promise<ProposalResponseState> {
  const token = String(formData.get("token") ?? "");
  const result = await acceptProposal(token, {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    acceptedTerms: String(formData.get("accepted_terms") ?? "") === "on",
  });
  revalidatePath(proposalPublicPath(token));
  if (!result.ok) return { ok: false, message: result.message };
  const portal = await openCustomerOnboardingAfterPublicAccept({
    email: String(formData.get("email") ?? ""),
    organizationId: result.organizationId,
  });
  if (portal.destination) redirect(portal.destination);
  return {
    ok: true,
    message: result.already
      ? "Dit voorstel was al geaccepteerd."
      : "Akkoord ontvangen. We zetten de volgende stap in gang.",
    next: portal.destination,
  };
}
