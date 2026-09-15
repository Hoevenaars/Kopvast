"use server";

import { requireSession } from "@/lib/auth";
import { loadAdminNotifications, type NotificationItem } from "@/lib/notifications";

export async function loadAdminNotificationsAction(): Promise<NotificationItem[]> {
  const session = await requireSession("admin");
  if (!session) return [];
  return loadAdminNotifications();
}
