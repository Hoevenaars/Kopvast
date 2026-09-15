import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageIntro } from "@/components/workspace/page-frame";
import { PasswordForm } from "@/components/workspace/password-form";
import { hasPassword, requireSession } from "@/lib/auth";
import { workspaceRoutes } from "@/lib/product";

export const metadata: Metadata = { title: "Instellingen", robots: { index: false, follow: false } };

export default async function AdminSettingsPage() {
  const session = await requireSession("admin");
  if (!session) redirect(workspaceRoutes.login);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Instellingen"
        title="Beveiliging"
        text="Beheer het wachtwoord voor de Admin Console. Rollen en koppelingen volgen later."
      />
      <PasswordForm hasPassword={await hasPassword(session.email)} />
    </div>
  );
}
