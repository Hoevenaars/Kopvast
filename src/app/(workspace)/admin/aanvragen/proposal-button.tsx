"use client";

import { useRef } from "react";
import Link from "next/link";
import { createProposalAction } from "@/app/(workspace)/admin/aanvragen/actions";
import { FormBusyOverlay, SubmitButton } from "@/components/workspace/form-busy";
import { workspaceRoutes } from "@/lib/product";

export function ProposalButton({ leadId, proposalId }: { leadId: string; proposalId?: string | null }) {
  const submitting = useRef(false);

  if (proposalId) {
    return (
      <Link
        href={`${workspaceRoutes.adminVoorstellen}/${proposalId}`}
        className="inline-flex h-12 items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-ivory"
      >
        Open voorstel
      </Link>
    );
  }

  return (
    <form
      action={createProposalAction}
      onSubmit={(event) => {
        if (submitting.current) {
          event.preventDefault();
          return;
        }
        submitting.current = true;
      }}
      className="relative"
    >
      <input type="hidden" name="id" value={leadId} />
      <FormBusyOverlay label="Voorstel maken…" />
      <SubmitButton
        pendingLabel="Voorstel maken…"
        className="inline-flex h-12 cursor-pointer items-center justify-center rounded-md bg-copper-dark px-5 text-sm font-semibold text-ivory"
      >
        Maak voorstel
      </SubmitButton>
    </form>
  );
}
