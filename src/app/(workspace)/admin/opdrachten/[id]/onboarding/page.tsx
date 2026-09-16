import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addCustomOnboardingItemAction,
  clearOnboardingOverrideAction,
  deleteCustomOnboardingItemAction,
  deleteOnboardingFileAction,
  overrideOnboardingAction,
  reviewOnboardingItemAction,
  saveOnboardingItemAction,
  uploadOnboardingFileAction,
} from "@/app/(workspace)/admin/onboarding/actions";
import { OnboardingChecklist } from "@/components/workspace/onboarding-checklist";
import { PageIntro } from "@/components/workspace/page-frame";
import { OnboardingProgressCard } from "@/components/workspace/onboarding-progress";
import { loadOnboardingWorkspaceByProject } from "@/lib/onboarding-store";
import { onboardingProgress } from "@/lib/onboarding";
import { workspaceRoutes } from "@/lib/product";

export const metadata: Metadata = {
  title: "Opdracht-onboarding",
  robots: { index: false, follow: false },
};

export default async function AdminOrderOnboardingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await loadOnboardingWorkspaceByProject(id);
  if (!workspace) notFound();
  const progress = onboardingProgress(workspace.onboarding, workspace.items);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Opdracht"
        title={workspace.organization.name}
        text={`${workspace.project.title}. Checklist is configureerbaar; de klant vult aan vanuit Mijn Kopvast.`}
        action={
          <Link
            href={`${workspaceRoutes.adminCustomers}/${workspace.organization.id}`}
            className="text-sm underline underline-offset-4"
          >
            Naar klant
          </Link>
        }
      />
      <OnboardingProgressCard progress={progress} />
      <OnboardingChecklist
        items={workspace.items}
        files={workspace.files}
        mode="admin"
        onboardingId={workspace.onboarding.id}
        organizationId={workspace.organization.id}
        projectId={workspace.project.id}
        overrideReason={workspace.onboarding.override_reason}
        actions={{
          save: saveOnboardingItemAction,
          upload: uploadOnboardingFileAction,
          removeFile: deleteOnboardingFileAction,
          review: reviewOnboardingItemAction,
          addCustom: addCustomOnboardingItemAction,
          removeCustom: deleteCustomOnboardingItemAction,
          override: overrideOnboardingAction,
          clearOverride: clearOnboardingOverrideAction,
        }}
      />
    </div>
  );
}
