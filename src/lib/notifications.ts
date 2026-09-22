import { loadDueRequestActions } from "@/lib/aanvragen";
import { loadDueOrderActions } from "@/lib/order-ops";
import { loadAcquisitionDashboard, type DashboardAction } from "@/lib/acquisition";
import { loadNurtureTodayActions } from "@/lib/acquisition/follow-up";
import { workspaceRoutes } from "@/lib/product";
import { productionNotifications } from "@/lib/production-board";
import { loadProposalTodayActions } from "@/lib/proposal-ops";
import { refreshClient } from "@/lib/refresh";
import { loadOpenSupportActions } from "@/lib/workspace";

export type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  status: string;
};

export function notificationsFromActions(actions: DashboardAction[]): NotificationItem[] {
  return actions.map((action, index) => ({
    id: `${action.href}-${action.title}-${index}`,
    title: action.title,
    detail: `${action.company} · ${action.age}`,
    href: action.href,
    status: action.status,
  }));
}

export async function loadAdminNotifications(): Promise<NotificationItem[]> {
  const [dash, proposalActions, requestActions, support, nurtureActions] = await Promise.all([
    loadAcquisitionDashboard(),
    loadProposalTodayActions(),
    loadDueRequestActions(),
    loadOpenSupportActions(),
    loadNurtureTodayActions(),
  ]);
  const items = [
    ...notificationsFromActions(nurtureActions),
    ...notificationsFromActions(proposalActions),
    ...notificationsFromActions(requestActions),
    ...support.map((action, index) => ({
      id: `support-${action.href}-${action.title}-${index}`,
      title: action.title,
      detail: `${action.company} · ${action.age}`,
      href: action.href,
      status: action.status,
    })),
    ...notificationsFromActions(dash.actions),
  ];

  const supabase = refreshClient();
  if (supabase) {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("kopvast_todos")
      .select("id, title, due_at")
      .eq("status", "open")
      .not("due_at", "is", null)
      .lte("due_at", today)
      .order("due_at", { ascending: true })
      .limit(6);
    for (const todo of data ?? []) {
      items.unshift({
        id: `todo-${todo.id}`,
        title: todo.title,
        detail: "Taak is vervallen of vervalt vandaag",
        href: workspaceRoutes.adminTaken,
        status: "Actie nodig",
      });
    }
  }

  try {
    const productionItems = await productionNotifications();
    items.unshift(...productionItems);
  } catch (error) {
    console.error("[kopvast] Productiemeldingen laden mislukt", error);
  }

  const dueOrders = await loadDueOrderActions();
  for (const order of dueOrders.slice(0, 6)) {
    items.unshift({
      id: `order-${order.id}`,
      title: order.next_action || `Opdracht ${order.order_number}`,
      detail: `${order.customer_name} · ${order.order_number}`,
      href: `${workspaceRoutes.adminOrders}/${order.id}`,
      status: "Actie nodig",
    });
  }

  return items.slice(0, 12);
}
