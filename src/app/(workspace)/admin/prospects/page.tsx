import { redirect } from "next/navigation";
import { workspaceRoutes } from "@/lib/product";

export default function AdminProspectsRedirect() {
  redirect(workspaceRoutes.adminAcquisition);
}
