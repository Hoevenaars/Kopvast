"use client";

import { useActionState } from "react";
import { areaClass, fieldClass } from "@/components/form-fields";
import { SubmitButton } from "@/components/workspace/form-busy";
import { StatusBadge, toneForStatus } from "@/components/workspace/status-badge";
import {
  ONBOARDING_ITEM_STATUSES,
  ONBOARDING_ITEM_TYPES,
  ONBOARDING_SECTIONS,
  itemsBySection,
  type OnboardingFileRow,
  type OnboardingItemRow,
} from "@/lib/onboarding";

function labelForItemStatus(status: string) {
  return ONBOARDING_ITEM_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export type OnboardingFormState = { ok: true; message?: string } | { ok: false; message: string } | null;

type ItemActions = {
  save: (state: OnboardingFormState, formData: FormData) => Promise<OnboardingFormState>;
  upload: (state: OnboardingFormState, formData: FormData) => Promise<OnboardingFormState>;
  removeFile: (state: OnboardingFormState, formData: FormData) => Promise<OnboardingFormState>;
};

type AdminActions = ItemActions & {
  review: (state: OnboardingFormState, formData: FormData) => Promise<OnboardingFormState>;
  addCustom: (state: OnboardingFormState, formData: FormData) => Promise<OnboardingFormState>;
  removeCustom: (state: OnboardingFormState, formData: FormData) => Promise<OnboardingFormState>;
  override: (state: OnboardingFormState, formData: FormData) => Promise<OnboardingFormState>;
  clearOverride: (state: OnboardingFormState, formData: FormData) => Promise<OnboardingFormState>;
};

export function OnboardingChecklist({
  items,
  files,
  mode,
  onboardingId,
  organizationId,
  projectId,
  overrideReason,
  actions,
}: {
  items: OnboardingItemRow[];
  files: OnboardingFileRow[];
  mode: "customer" | "admin";
  onboardingId: string;
  organizationId: string;
  projectId: string;
  overrideReason?: string | null;
  actions: ItemActions | AdminActions;
}) {
  const sections = itemsBySection(items);
  const admin = mode === "admin" ? (actions as AdminActions) : null;

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <h2 className="text-xl text-ink">{section.label}</h2>
          <div className="space-y-3">
            {section.items.map((item) => (
              <OnboardingItemForm
                key={item.id}
                item={item}
                files={files.filter((file) => file.item_id === item.id)}
                mode={mode}
                organizationId={organizationId}
                projectId={projectId}
                actions={actions}
              />
            ))}
          </div>
        </section>
      ))}

      {admin ? (
        <section className="space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="text-lg font-semibold">Maatwerk</h2>
          <p className="text-sm text-ink/50">Voeg extra items toe als deze opdracht meer nodig heeft.</p>
          <CustomItemForm action={admin.addCustom} onboardingId={onboardingId} projectId={projectId} />
          <OverrideForm
            overrideAction={admin.override}
            clearAction={admin.clearOverride}
            onboardingId={onboardingId}
            projectId={projectId}
            overrideReason={overrideReason}
          />
        </section>
      ) : null}
    </div>
  );
}

function OnboardingItemForm({
  item,
  files,
  mode,
  organizationId,
  projectId,
  actions,
}: {
  item: OnboardingItemRow;
  files: OnboardingFileRow[];
  mode: "customer" | "admin";
  organizationId: string;
  projectId: string;
  actions: ItemActions | AdminActions;
}) {
  const [saveState, saveAction] = useActionState(actions.save, null);
  const [uploadState, uploadAction] = useActionState(actions.upload, null);
  const [fileState, fileAction] = useActionState(actions.removeFile, null);
  const admin = mode === "admin" ? (actions as AdminActions) : null;
  const [reviewState, reviewAction] = useActionState(admin?.review ?? actions.save, null);
  const [removeState, removeAction] = useActionState(admin?.removeCustom ?? actions.save, null);
  const acceptsFiles = item.item_type === "file" || item.item_type === "files";
  const state = saveState || uploadState || fileState || reviewState || removeState;

  return (
    <article className="rounded-2xl border border-ink/10 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{item.title}</h3>
            {item.required ? (
              <span className="text-[11px] font-semibold tracking-wide text-copper-dark uppercase">Verplicht</span>
            ) : (
              <span className="text-[11px] font-semibold tracking-wide text-ink/35 uppercase">Optioneel</span>
            )}
          </div>
          {item.help_text ? <p className="mt-1 text-sm text-ink/45">{item.help_text}</p> : null}
        </div>
        <StatusBadge label={labelForItemStatus(item.status)} tone={toneForStatus(item.status)} />
      </div>

      {item.admin_note ? <p className="mt-3 text-sm text-copper-dark">{item.admin_note}</p> : null}

      <form action={saveAction} className="mt-4 space-y-3">
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="projectId" value={projectId} />
        {acceptsFiles ? null : item.item_type === "textarea" || item.item_type === "url" ? (
          <textarea
            name="value"
            defaultValue={item.value_text ?? ""}
            className={areaClass}
            placeholder={item.item_type === "url" ? "https://" : "Vul in of sla tussentijds op"}
          />
        ) : (
          <input name="value" defaultValue={item.value_text ?? ""} className={fieldClass} />
        )}
        <textarea name="note" defaultValue={item.note ?? ""} className={areaClass} placeholder="Toelichting, optioneel" />
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" name="notRequired" value="1" defaultChecked={item.status === "not_required"} />
          Niet van toepassing
        </label>
        <SubmitButton className="inline-flex h-11 items-center rounded-md bg-ink px-4 text-sm font-semibold text-ivory">
          Opslaan
        </SubmitButton>
      </form>

      {acceptsFiles ? (
        <div className="mt-4 space-y-3">
          {files.length ? (
            <ul className="divide-y divide-ink/8 rounded-xl border border-ink/10">
              {files.map((file) => (
                <li key={file.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <a href={`/api/onboarding/files/${file.id}`} className="underline underline-offset-4">
                    {file.original_name}
                  </a>
                  <form action={fileAction}>
                    <input type="hidden" name="fileId" value={file.id} />
                    <input type="hidden" name="organizationId" value={organizationId} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <SubmitButton className="text-sm text-copper-dark underline underline-offset-4" pendingLabel="Weg…">
                      Verwijderen
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink/45">Nog geen bestand.</p>
          )}
          <form action={uploadAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="projectId" value={projectId} />
            {item.item_type === "file" ? <input type="hidden" name="replace" value="1" /> : null}
            <input name="file" type="file" required className="text-sm" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,application/pdf,application/zip,text/plain,text/csv,.docx" />
            <SubmitButton className="inline-flex h-11 items-center rounded-md border border-stone px-4 text-sm">
              {item.item_type === "file" && files.length ? "Bestand vervangen" : "Bestand uploaden"}
            </SubmitButton>
          </form>
        </div>
      ) : null}

      {admin ? (
        <form action={reviewAction} className="mt-4 grid gap-3 border-t border-ink/8 pt-4 md:grid-cols-[1fr_auto]">
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <select
            name="status"
            defaultValue={
              item.status === "rejected" || item.status === "not_required" || item.status === "approved"
                ? item.status
                : "approved"
            }
            className={fieldClass}
          >
            <option value="approved">Goedkeuren</option>
            <option value="rejected">Aanpassen</option>
            <option value="not_required">Niet verplicht / n.v.t.</option>
            <option value="missing">Terug naar ontbreekt</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="required" value="1" defaultChecked={item.required} />
            Verplicht
          </label>
          <textarea name="adminNote" defaultValue={item.admin_note ?? ""} className={areaClass} placeholder="Interne of klantgerichte toelichting" />
          <SubmitButton className="text-sm underline underline-offset-4">Beoordeling opslaan</SubmitButton>
        </form>
      ) : null}

      {admin && item.custom ? (
        <form action={removeAction} className="mt-3">
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <SubmitButton className="text-sm text-copper-dark underline underline-offset-4">Item verwijderen</SubmitButton>
        </form>
      ) : null}

      {state && !state.ok ? <p className="mt-3 text-sm text-destructive">{state.message}</p> : null}
      {state?.ok ? <p className="mt-3 text-sm text-olive">{state.message || "Opgeslagen."}</p> : null}
    </article>
  );
}

function CustomItemForm({
  action,
  onboardingId,
  projectId,
}: {
  action: (state: OnboardingFormState, formData: FormData) => Promise<OnboardingFormState>;
  onboardingId: string;
  projectId: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="onboardingId" value={onboardingId} />
      <input type="hidden" name="projectId" value={projectId} />
      <input name="title" required placeholder="Nieuw item" className={fieldClass} />
      <select name="section" defaultValue="maatwerk" className={fieldClass}>
        {ONBOARDING_SECTIONS.map((section) => (
          <option key={section.id} value={section.id}>
            {section.label}
          </option>
        ))}
      </select>
      <select name="itemType" defaultValue="textarea" className={fieldClass}>
        {ONBOARDING_ITEM_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="required" value="1" defaultChecked />
        Verplicht
      </label>
      <input name="helpText" placeholder="Toelichting voor de klant" className={`${fieldClass} md:col-span-2`} />
      <SubmitButton className="inline-flex h-11 items-center rounded-md bg-copper-dark px-4 text-sm text-ivory">
        Item toevoegen
      </SubmitButton>
      {state && !state.ok ? <p className="text-sm text-destructive md:col-span-2">{state.message}</p> : null}
      {state?.ok ? <p className="text-sm text-olive md:col-span-2">Item toegevoegd.</p> : null}
    </form>
  );
}

function OverrideForm({
  overrideAction,
  clearAction,
  onboardingId,
  projectId,
  overrideReason,
}: {
  overrideAction: (state: OnboardingFormState, formData: FormData) => Promise<OnboardingFormState>;
  clearAction: (state: OnboardingFormState, formData: FormData) => Promise<OnboardingFormState>;
  onboardingId: string;
  projectId: string;
  overrideReason?: string | null;
}) {
  const [overrideState, overrideForm] = useActionState(overrideAction, null);
  const [clearState, clearForm] = useActionState(clearAction, null);
  const state = overrideState || clearState;
  if (overrideReason) {
    return (
      <form action={clearForm} className="rounded-xl border border-ink/10 bg-ivory p-4">
        <input type="hidden" name="onboardingId" value={onboardingId} />
        <input type="hidden" name="projectId" value={projectId} />
        <p className="text-sm text-ink">Override actief: {overrideReason}</p>
        <SubmitButton className="mt-3 text-sm underline underline-offset-4" pendingLabel="Bezig…">
          Override intrekken
        </SubmitButton>
        {state && !state.ok ? <p className="mt-2 text-sm text-destructive">{state.message}</p> : null}
        {state?.ok ? <p className="mt-2 text-sm text-olive">{state.message}</p> : null}
      </form>
    );
  }
  return (
    <form action={overrideForm} className="space-y-3">
      <input type="hidden" name="onboardingId" value={onboardingId} />
      <input type="hidden" name="projectId" value={projectId} />
      <label htmlFor="reason" className="text-sm font-medium">
        Klaarzetten met reden
      </label>
      <textarea
        id="reason"
        name="reason"
        required
        className={areaClass}
        placeholder="Bijvoorbeeld: logo volgt per post, bouw mag starten."
      />
      <SubmitButton className="inline-flex h-11 items-center rounded-md border border-stone px-5 text-sm">
        Override: zet klaar
      </SubmitButton>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      {state?.ok ? <p className="text-sm text-olive">{state.message}</p> : null}
    </form>
  );
}
