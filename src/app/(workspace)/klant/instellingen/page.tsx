import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageIntro } from "@/components/workspace/page-frame";
import { PasswordForm } from "@/components/workspace/password-form";
import { hasPassword, requireSession } from "@/lib/auth";
import { workspaceRoutes } from "@/lib/product";

export const metadata: Metadata = { title: "Instellingen", robots: { index: false, follow: false } };

export default async function CustomerSettingsPage() {
  const session = await requireSession("customer");
  if (!session) redirect(workspaceRoutes.login);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Instellingen"
        title="Beveiliging"
        text="Stel een wachtwoord in voor Mijn Kopvast. Je e-mailadres blijft het account dat Kopvast voor je heeft aangemaakt."
      />
      <PasswordForm hasPassword={await hasPassword(session.email)} />
    </div>
  );
}
