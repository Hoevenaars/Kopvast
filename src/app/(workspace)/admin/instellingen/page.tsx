import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageIntro } from "@/components/workspace/page-frame";
import { PasswordForm } from "@/components/workspace/password-form";
import { MailTemplatesForm } from "@/app/(workspace)/admin/instellingen/mail-templates-form";
import { AcquisitionOpsForm } from "@/app/(workspace)/admin/instellingen/acquisition-ops-form";
import { OutreachRulesCard } from "@/app/(workspace)/admin/instellingen/outreach-rules-card";
import { hasPassword, requireSession } from "@/lib/auth";
import { resolveEmailSettings } from "@/lib/email-mode";
import { loadMailTemplates } from "@/lib/mail-templates";
import { workspaceRoutes } from "@/lib/product";

export const metadata: Metadata = { title: "Instellingen", robots: { index: false, follow: false } };

export default async function AdminSettingsPage() {
  const session = await requireSession("admin");
  if (!session) redirect(workspaceRoutes.login);

  const settings = await resolveEmailSettings();

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Instellingen"
        title="Instellingen"
        text="Beheer acquisitie LIVE/TEST, de spelregels voor persoonlijke benadering, het wachtwoord en de standaardteksten van Kopvast-mails."
      />
      <AcquisitionOpsForm mode={settings.mode} storedMode={settings.storedMode} testTo={settings.testEmail} />
      <OutreachRulesCard />
      <PasswordForm hasPassword={await hasPassword(session.email)} />
      <MailTemplatesForm templates={await loadMailTemplates()} />
    </div>
  );
}
