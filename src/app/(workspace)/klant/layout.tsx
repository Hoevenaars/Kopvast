import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { KopvastAppShell } from "@/components/kopvast-app-shell";
import { requireSession } from "@/lib/auth";
import { workspaceRoutes } from "@/lib/product";

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const session = await requireSession("customer");
  if (!session?.organizationId) {
    const admin = await requireSession("admin");
    if (admin) redirect(workspaceRoutes.admin);
    redirect(`${workspaceRoutes.login}?next=${workspaceRoutes.console}`);
  }
  return <KopvastAppShell variant="customer" email={session.email}>{children}</KopvastAppShell>;
}
