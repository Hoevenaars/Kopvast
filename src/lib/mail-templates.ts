import { confirmationCopy, notificationIntro } from "@/emails/copy";
import { isDomainLandingSource } from "@/lib/domain-landing";
import { products, site } from "@/lib/site";
import { refreshClient } from "@/lib/refresh";
import { mutateStore, nowIso, readStore } from "@/lib/workspace-store";

export const MAIL_TEMPLATE_KEYS = [
  "confirm_website",
  "confirm_maatwerk",
  "notify_website",
  "notify_maatwerk",
  "acquisition",
] as const;

export type MailTemplateKey = (typeof MAIL_TEMPLATE_KEYS)[number];

export type MailTemplateFields = Record<string, string>;

export type MailTemplateRecord = {
  key: MailTemplateKey;
  title: string;
  help: string;
  placeholders: string;
  fields: Array<{ id: string; label: string; multiline?: boolean }>;
  values: MailTemplateFields;
};

export type AcquisitionMailTemplate = {
  greeting: string;
  opening: string;
  pitch: string;
  offerStandard: string;
  offerCustom: string;
  closing: string;
  signatureName: string;
  signatureTagline: string;
  subjectDomain: string;
  subjectCompany: string;
  subjectPoints: string;
};

export type ConfirmationMailCopy = ReturnType<typeof confirmationCopy>;

function confirmFields() {
  return [
    { id: "subject", label: "Onderwerp" },
    { id: "eyebrow", label: "Label boven de titel" },
    { id: "title", label: "Titel" },
    { id: "text", label: "Tekst", multiline: true },
    { id: "preview", label: "Previewregel" },
    { id: "ctaLabel", label: "Knoptekst" },
    { id: "ctaHref", label: "Knop-link" },
  ];
}

function notifyFields() {
  return [{ id: "intro", label: "Introtekst", multiline: true }];
}

function acquisitionFields() {
  return [
    { id: "greeting", label: "Aanhef" },
    { id: "signatureName", label: "Ondertekening" },
    { id: "signatureTagline", label: "Ondertitel" },
    { id: "offerCustom", label: "Aanbod maatwerk", multiline: true },
  ];
}

export function applyPlaceholders(text: string, vars: Record<string, string | null | undefined>) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}

export function defaultAcquisitionMailTemplate(): AcquisitionMailTemplate {
  return {
    greeting: "Goedendag,",
    opening:
      "Ik kwam jullie website tegen en heb er kort naar gekeken.\n\nDaarbij vielen een paar punten op die volgens mij sterker kunnen.",
    pitch:
      "Kopvast helpt bedrijven met professionele websites die helder laten zien waar een organisatie voor staat en bezoekers gericht naar contact leiden.",
    offerStandard: `Een complete Kopvast Website start vanaf {{price}} excl. btw.`,
    offerCustom:
      "De website lijkt commercieel interessant, maar de benodigde functionaliteit valt waarschijnlijk buiten het vaste websitepakket. Daarover denk ik graag een keer met jullie mee.",
    closing: "Met vriendelijke groet,",
    signatureName: site.name,
    signatureTagline: site.tagline,
    subjectDomain: "Een paar punten die opvielen aan {{domain}}",
    subjectCompany: "Kort gekeken naar {{company}}",
    subjectPoints: "3 punten over jullie website",
  };
}

export function defaultMailTemplateValues(): Record<MailTemplateKey, MailTemplateFields> {
  const website = confirmationCopy("website-aanvraag");
  const maatwerk = confirmationCopy("maatwerk");
  return {
    confirm_website: { ...website },
    confirm_maatwerk: { ...maatwerk },
    notify_website: {
      intro:
        "Er staat een nieuwe aanvraag voor Kopvast Website klaar. Antwoord op deze mail om {{name}} te bereiken.",
    },
    notify_maatwerk: {
      intro: "Er staat een nieuwe maatwerkvraag klaar. Antwoord op deze mail om {{name}} te bereiken.",
    },
    acquisition: { ...defaultAcquisitionMailTemplate() },
  };
}

export const MAIL_TEMPLATE_META: Array<Omit<MailTemplateRecord, "values">> = [
  {
    key: "confirm_website",
    title: "Bevestiging Kopvast Website",
    help: "Deze mail gaat naar de aanvrager na een website-aanvraag.",
    placeholders: "{{name}}",
    fields: confirmFields(),
  },
  {
    key: "confirm_maatwerk",
    title: "Bevestiging maatwerk",
    help: "Deze mail gaat naar de aanvrager na een maatwerkvraag.",
    placeholders: "{{name}}",
    fields: confirmFields(),
  },
  {
    key: "notify_website",
    title: "Interne melding website-aanvraag",
    help: "Deze mail komt binnen bij Kopvast als er een website-aanvraag binnenkomt.",
    placeholders: "{{name}} {{company}}",
    fields: notifyFields(),
  },
  {
    key: "notify_maatwerk",
    title: "Interne melding maatwerk",
    help: "Deze mail komt binnen bij Kopvast als er een maatwerkvraag binnenkomt.",
    placeholders: "{{name}} {{company}}",
    fields: notifyFields(),
  },
  {
    key: "acquisition",
    title: "Acquisitie-outreach",
    help: "Aanhef, ondertekening en maatwerkaanbod. Opening, bevindingen, prijs en korting volgen de spelregels persoonlijke benadering hierboven.",
    placeholders: "{{domain}} {{company}} {{price}}",
    fields: acquisitionFields(),
  },
];

export function isMailTemplateKey(value: string): value is MailTemplateKey {
  return MAIL_TEMPLATE_KEYS.includes(value as MailTemplateKey);
}

function mergeFields(key: MailTemplateKey, stored?: MailTemplateFields | null): MailTemplateFields {
  const defaults = defaultMailTemplateValues()[key];
  const next = { ...defaults };
  for (const [field, value] of Object.entries(stored ?? {})) {
    if (field in defaults && typeof value === "string") next[field] = value;
  }
  return next;
}

export function mailTemplateRecords(stored: Partial<Record<MailTemplateKey, MailTemplateFields>> = {}): MailTemplateRecord[] {
  return MAIL_TEMPLATE_META.map((meta) => ({
    ...meta,
    values: mergeFields(meta.key, stored[meta.key]),
  }));
}

async function readStoredTemplates(): Promise<Partial<Record<MailTemplateKey, MailTemplateFields>>> {
  const supabase = refreshClient();
  if (supabase) {
    const { data, error } = await supabase.from("kopvast_mail_templates").select("key, fields");
    if (error) {
      console.error("[kopvast] Mailtemplates laden mislukt", error.message);
      return {};
    }
    const stored: Partial<Record<MailTemplateKey, MailTemplateFields>> = {};
    for (const row of data ?? []) {
      if (!isMailTemplateKey(row.key)) continue;
      stored[row.key] = (row.fields ?? {}) as MailTemplateFields;
    }
    return stored;
  }

  const store = await readStore();
  const stored: Partial<Record<MailTemplateKey, MailTemplateFields>> = {};
  for (const row of store.mailTemplates) {
    if (!isMailTemplateKey(row.key)) continue;
    stored[row.key] = row.fields;
  }
  return stored;
}

export async function loadMailTemplates(): Promise<MailTemplateRecord[]> {
  return mailTemplateRecords(await readStoredTemplates());
}

export async function loadMailTemplateValues(): Promise<Record<MailTemplateKey, MailTemplateFields>> {
  const stored = await readStoredTemplates();
  return {
    confirm_website: mergeFields("confirm_website", stored.confirm_website),
    confirm_maatwerk: mergeFields("confirm_maatwerk", stored.confirm_maatwerk),
    notify_website: mergeFields("notify_website", stored.notify_website),
    notify_maatwerk: mergeFields("notify_maatwerk", stored.notify_maatwerk),
    acquisition: mergeFields("acquisition", stored.acquisition),
  } satisfies Record<MailTemplateKey, MailTemplateFields>;
}

export async function loadConfirmationCopy(
  source: string,
  vars: Record<string, string> = {}
): Promise<ConfirmationMailCopy> {
  if (isDomainLandingSource(source)) {
    return confirmationCopy(source);
  }
  const key: MailTemplateKey = source === "maatwerk" ? "confirm_maatwerk" : "confirm_website";
  const values = (await loadMailTemplateValues())[key];
  const fallback = confirmationCopy(source);
  return {
    eyebrow: applyPlaceholders(values.eyebrow || fallback.eyebrow, vars),
    subject: applyPlaceholders(values.subject || fallback.subject, vars),
    title: applyPlaceholders(values.title || fallback.title, vars),
    text: applyPlaceholders(values.text || fallback.text, vars),
    preview: applyPlaceholders(values.preview || fallback.preview, vars),
    ctaLabel: applyPlaceholders(values.ctaLabel || fallback.ctaLabel, vars),
    ctaHref: applyPlaceholders(values.ctaHref || fallback.ctaHref, vars),
  };
}

export async function loadNotificationIntro(input: {
  name: string;
  source: string;
  company?: string;
  website?: string;
  details?: Record<string, string>;
}) {
  if (isDomainLandingSource(input.source)) {
    return notificationIntro({ ...input, email: "" });
  }
  const key: MailTemplateKey = input.source === "maatwerk" ? "notify_maatwerk" : "notify_website";
  const values = (await loadMailTemplateValues())[key];
  return applyPlaceholders(values.intro, { name: input.name, company: input.company ?? "" });
}

export async function loadAcquisitionMailTemplate(): Promise<AcquisitionMailTemplate> {
  const values = (await loadMailTemplateValues()).acquisition;
  return { ...defaultAcquisitionMailTemplate(), ...values };
}

export async function saveMailTemplate(input: {
  key: MailTemplateKey;
  fields: MailTemplateFields;
  actorEmail: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const values = mergeFields(input.key, input.fields);
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_mail_templates").upsert(
      {
        key: input.key,
        fields: values,
        updated_at: nowIso(),
        updated_by: input.actorEmail,
      },
      { onConflict: "key" }
    );
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  await mutateStore((store) => {
    const existing = store.mailTemplates.find((item) => item.key === input.key);
    if (existing) {
      existing.fields = values;
      existing.updated_at = nowIso();
      existing.updated_by = input.actorEmail;
    } else {
      store.mailTemplates.push({
        key: input.key,
        fields: values,
        updated_at: nowIso(),
        updated_by: input.actorEmail,
      });
    }
  });
  return { ok: true };
}

export function acquisitionVars(input: { companyName?: string | null; domain: string }) {
  return {
    domain: input.domain,
    company: input.companyName ?? "",
    price: products.website.price,
  };
}
