import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  deleteCustomerOnboardingFile,
  saveCustomerOnboardingItem,
  uploadCustomerOnboardingFile,
} from "@/app/(workspace)/klant/onboarding/actions";
import { OnboardingChecklist } from "@/components/workspace/onboarding-checklist";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { OnboardingProgressCard } from "@/components/workspace/onboarding-progress";
import { requireSession } from "@/lib/auth";
import { onboardingProgress } from "@/lib/onboarding";
import { loadOnboardingsForOrganization } from "@/lib/onboarding-store";
import { workspaceRoutes } from "@/lib/product";

export const metadata: Metadata = {
  title: "Onboarding",
  robots: { index: false, follow: false },
};

export default async function CustomerOnboardingPage() {
  const session = await requireSession("customer");
  if (!session?.organizationId) redirect(workspaceRoutes.login);
  const workspaces = await loadOnboardingsForOrganization(session.organizationId);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Onboarding"
        title="Gegevens en bestanden"
        text="Vul aan wat we nodig hebben, sla tussentijds op en vervang bestanden als dat nodig is. Wat ontbreekt zie je bovenin."
      />
      {workspaces.length === 0 ? (
        <EmptyState
          title="Nog geen onboarding"
          text="Zodra je opdracht start, verzamelen we hier bedrijfsgegevens, merk, content en techniek."
        />
      ) : (
        workspaces.map((workspace) => {
          const progress = onboardingProgress(workspace.onboarding, workspace.items);
          return (
            <div key={workspace.onboarding.id} className="space-y-6">
              <h2 className="text-xl font-semibold">{workspace.project.title}</h2>
              <OnboardingProgressCard progress={progress} readyLabel="Compleet" />
              <OnboardingChecklist
                items={workspace.items}
                files={workspace.files}
                mode="customer"
                onboardingId={workspace.onboarding.id}
                organizationId={workspace.organization.id}
                projectId={workspace.project.id}
                actions={{
                  save: saveCustomerOnboardingItem,
                  upload: uploadCustomerOnboardingFile,
                  removeFile: deleteCustomerOnboardingFile,
                }}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
