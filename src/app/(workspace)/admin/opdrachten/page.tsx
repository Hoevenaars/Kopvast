import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/workspace/page-frame";
import { EmptyState } from "@/components/workspace/shell";
import { PendingLink } from "@/components/workspace/pending-nav";
import { formatNlDate } from "@/lib/acquisition-constants";
import {
  formatEuro,
  isOrderFilter,
  labelForOrderStatus,
  orderFilters,
} from "@/lib/orders";
import { loadOrders } from "@/lib/order-ops";
import { workspaceRoutes } from "@/lib/product";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Opdrachten", robots: { index: false, follow: false } };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filter && isOrderFilter(params.filter) ? params.filter : "alles";
  const orders = await loadOrders(filter);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Opdrachten"
        title="Opdrachten"
        text="Van geaccepteerd voorstel naar uitvoering. Eén commerciële afspraak wordt één opdracht."
        action={
          <Link
            href={`${workspaceRoutes.adminOrders}/nieuw`}
            className="inline-flex h-12 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-ivory"
          >
            + Nieuwe opdracht
          </Link>
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {orderFilters.map((item) => {
          const href = item.value === "alles" ? workspaceRoutes.adminOrders : `${workspaceRoutes.adminOrders}?filter=${item.value}`;
          const active = filter === item.value;
          return (
            <Link
              key={item.value}
              href={href}
              className={cn(
                "inline-flex h-11 shrink-0 items-center rounded-full px-4 text-sm font-medium",
                active ? "bg-ink text-ivory" : "border border-ink/10 bg-white text-ink/70"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="Nog geen opdrachten"
          text="Na akkoord op een voorstel ontstaat hier exact één opdracht, met prijs, onboarding en volgende actie."
        />
      ) : (
        <ul className="grid gap-4">
          {orders.map((order) => (
            <li key={order.id}>
              <PendingLink
                href={`${workspaceRoutes.adminOrders}/${order.id}`}
                pendingLabel="Opdracht openen…"
                className="block rounded-2xl border border-ink/10 bg-white p-5 transition hover:bg-[#F8F6F1]"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs tracking-wide text-ink/40 uppercase">{order.order_number}</p>
                    <h2 className="mt-1 text-lg font-semibold">{order.customer_name}</h2>
                    <p className="text-sm text-ink/45">{order.product_label}</p>
                  </div>
                  <p className="text-sm font-medium">{labelForOrderStatus(order.status)}</p>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <Meta label="Bedrag" value={order.agreed_price_label || formatEuro(order.agreed_price_amount)} />
                  <Meta label="Target live" value={formatNlDate(order.target_live_at)} />
                  <Meta label="Next action" value={order.next_action || "—"} />
                  <Meta label="Actiedatum" value={formatNlDate(order.next_action_at)} />
                </dl>
              </PendingLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-ink/40 uppercase">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
