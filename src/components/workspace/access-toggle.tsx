"use client";

import { saveMemberAccess } from "@/app/(workspace)/admin/gebruikers/actions";

export function AccessToggle({
  memberId,
  organizationId,
  enabled,
}: {
  memberId: string;
  organizationId: string;
  enabled: boolean;
}) {
  return (
    <form action={saveMemberAccess} key={`${memberId}-${enabled}`} className="flex items-center gap-3">
      <input type="hidden" name="id" value={memberId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-ink">
        <input
          type="checkbox"
          name="access"
          value="1"
          defaultChecked={enabled}
          className="size-5 rounded border-stone accent-olive"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        />
        Toegang tot Mijn Kopvast
      </label>
    </form>
  );
}
