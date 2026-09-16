"use client";

import { useMemo, useState } from "react";
import { saveOrderStatus } from "@/app/(workspace)/admin/opdrachten/actions";
import { FormBusyOverlay, SubmitButton } from "@/components/workspace/form-busy";
import { fieldClass } from "@/components/form-fields";
import {
  evaluateStatusChange,
  labelForOrderStatus,
  orderStatuses,
  type OrderStatus,
} from "@/lib/orders";

export function OrderStatusForm({
  orderId,
  status,
  visited,
}: {
  orderId: string;
  status: OrderStatus;
  visited: OrderStatus[];
}) {
  const [next, setNext] = useState(status);
  const evaluation = useMemo(
    () => evaluateStatusChange({ from: status, to: next, visited, override: true }),
    [status, next, visited]
  );
  const skipped = evaluation.ok ? evaluation.skipped : evaluation.skipped;

  return (
    <form action={saveOrderStatus} className="relative space-y-3">
      <FormBusyOverlay label="Status opslaan…" />
      <input type="hidden" name="id" value={orderId} />
      <label htmlFor="status" className="text-sm font-medium text-ink">
        Status
      </label>
      <select
        id="status"
        name="status"
        value={next}
        onChange={(event) => setNext(event.target.value as OrderStatus)}
        className={fieldClass}
      >
        {orderStatuses.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      {skipped.length ? (
        <label className="flex items-start gap-2 rounded-xl border border-copper/30 bg-copper/5 px-3 py-3 text-sm text-ink">
          <input type="checkbox" name="override" className="mt-1" required />
          <span>
            Je slaat {skipped.map((item) => labelForOrderStatus(item)).join(", ")} over. Zet dit alleen door
            met een bewuste override.
          </span>
        </label>
      ) : null}
      <SubmitButton className="text-sm underline underline-offset-4" pendingLabel="Opslaan…">
        Status opslaan
      </SubmitButton>
    </form>
  );
}
