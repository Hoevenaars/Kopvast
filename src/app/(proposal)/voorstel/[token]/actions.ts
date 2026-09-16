"use server";

import { revalidatePath } from "next/cache";
import { acceptProposal, askProposalQuestion } from "@/lib/proposal-ops";
import { proposalPublicPath } from "@/lib/proposals";

export type ProposalResponseState = { ok: boolean; message: string } | null;

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
  if (result.already) return { ok: true, message: "Dit voorstel was al geaccepteerd." };
  return { ok: true, message: "Akkoord ontvangen. We zetten de volgende stap in gang." };
}
