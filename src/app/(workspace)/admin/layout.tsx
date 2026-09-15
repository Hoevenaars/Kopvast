import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { KopvastAppShell } from "@/components/kopvast-app-shell";
import { requireSession } from "@/lib/auth";
import { workspaceRoutes } from "@/lib/product";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireSession("admin");
  if (!session) redirect(`${workspaceRoutes.login}?next=${workspaceRoutes.admin}`);
  return <KopvastAppShell variant="admin" email={session.email}>{children}</KopvastAppShell>;
}
