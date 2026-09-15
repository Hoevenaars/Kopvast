"use client";

import { useActionState } from "react";
import { areaClass, fieldClass, Field } from "@/components/form-fields";
import { SubmitButton } from "@/components/workspace/form-busy";
import { saveMailTemplateAction, type MailTemplateState } from "@/app/(workspace)/admin/instellingen/actions";
import type { MailTemplateRecord } from "@/lib/mail-templates";

export function MailTemplatesForm({ templates }: { templates: MailTemplateRecord[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold">Mailtemplates</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/45">
          Dit zijn de standaardteksten voor bevestigingen, interne meldingen en acquisitie. Placeholders zoals
          {" "}
          <code className="rounded bg-ivory px-1">{`{{name}}`}</code>
          {" "}
          worden bij verzenden ingevuld.
        </p>
      </div>
      {templates.map((template) => (
        <TemplateCard key={template.key} template={template} />
      ))}
    </div>
  );
}

function TemplateCard({ template }: { template: MailTemplateRecord }) {
  const [state, action] = useActionState(saveMailTemplateAction, null as MailTemplateState);

  return (
    <form action={action} className="relative space-y-4 rounded-2xl border border-ink/10 bg-white p-5 md:p-6">
      <input type="hidden" name="key" value={template.key} />
      <div>
        <h3 className="font-semibold">{template.title}</h3>
        <p className="mt-1 text-sm text-ink/45">{template.help}</p>
        <p className="mt-1 text-xs text-ink/35">Placeholders: {template.placeholders}</p>
      </div>
      {template.fields.map((field) => (
        <Field key={field.id} id={`${template.key}-${field.id}`} label={field.label}>
          {field.multiline ? (
            <textarea
              id={`${template.key}-${field.id}`}
              name={field.id}
              defaultValue={template.values[field.id] ?? ""}
              className={`${areaClass} min-h-28`}
            />
          ) : (
            <input
              id={`${template.key}-${field.id}`}
              name={field.id}
              defaultValue={template.values[field.id] ?? ""}
              className={fieldClass}
            />
          )}
        </Field>
      ))}
      {state && state.key === template.key && !state.ok ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      {state && state.key === template.key && state.ok ? (
        <p className="text-sm text-olive">{state.message}</p>
      ) : null}
      <SubmitButton
        pendingLabel="Opslaan…"
        className="inline-flex h-11 items-center rounded-md bg-ink px-5 text-sm font-semibold text-ivory"
      >
        Template opslaan
      </SubmitButton>
    </form>
  );
}
