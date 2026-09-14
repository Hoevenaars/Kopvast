import {
  assetOptions,
  brandStates,
  customFeatures,
  sizeOptions,
  site,
  timingOptions,
} from "@/lib/site";

const valueLabels = Object.fromEntries(
  [...brandStates, ...assetOptions, ...customFeatures, ...sizeOptions, ...timingOptions].map((item) => [
    item.value,
    item.label,
  ])
);

export type LeadEmailFields = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
  source: string;
  message?: string;
  details?: Record<string, string>;
};

export type EmailField = {
  label: string;
  value: string;
  href?: string;
};

export function sourceLabel(source: string) {
  if (source === "maatwerk") return "Maatwerk";
  if (source === "website-aanvraag") return "Kopvast Website";
  return "Aanvraag";
}

export function confirmationCopy(source: string) {
  if (source === "maatwerk") {
    return {
      eyebrow: "Maatwerk",
      subject: "Kopvast heeft je idee ontvangen",
      title: "We hebben je idee ontvangen.",
      text: "We hebben je maatwerkvraag ontvangen. We beoordelen wat nodig is en nemen contact met je op. Dit is nog geen opdracht en geen vaste prijs.",
      preview: "We beoordelen wat nodig is en nemen contact met je op.",
      ctaLabel: "Naar kopvast.nl",
      ctaHref: site.url,
    };
  }

  return {
    eyebrow: "Kopvast Website",
    subject: "Kopvast heeft je aanvraag ontvangen",
    title: "We hebben je aanvraag ontvangen.",
    text: "We hebben je aanvraag voor Kopvast Website ontvangen. Je hoort van ons over de volgende stap. Stilte behandelen we niet als akkoord of opdracht.",
    preview: "Je hoort van ons over de volgende stap.",
    ctaLabel: "Bekijk het websitepakket",
    ctaHref: `${site.url}/websites`,
  };
}

export function humanizeValue(value: string) {
  return value
    .split(/,\s*/)
    .map((part) => valueLabels[part] ?? part)
    .join(", ");
}

function websiteHref(website: string) {
  if (/^https?:\/\//i.test(website)) return website;
  return `https://${website}`;
}

export function notificationFields(lead: LeadEmailFields): EmailField[] {
  const fields: EmailField[] = [
    { label: "Naam", value: lead.name },
    { label: "E-mail", value: lead.email, href: `mailto:${lead.email}` },
  ];

  if (lead.phone) fields.push({ label: "Telefoon", value: lead.phone });
  if (lead.company) fields.push({ label: "Bedrijf", value: lead.company });
  if (lead.website) {
    fields.push({ label: "Website", value: lead.website, href: websiteHref(lead.website) });
  }
  fields.push({ label: "Bron", value: sourceLabel(lead.source) });

  const details = lead.details ?? {};
  const detailValues = new Set<string>();
  for (const [label, raw] of Object.entries(details)) {
    const value = raw.trim();
    if (!value) continue;
    detailValues.add(value);
    fields.push({ label, value: humanizeValue(value) });
  }

  const message = lead.message?.trim();
  if (message && !detailValues.has(message)) {
    const reconstructed = Object.entries(details)
      .filter(([, value]) => value.trim())
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");
    if (message !== reconstructed) {
      fields.push({ label: "Toelichting", value: message });
    }
  }

  return fields;
}

export function notificationPlainText(lead: LeadEmailFields) {
  return notificationFields(lead)
    .map((field) => `${field.label}: ${field.value}`)
    .join("\n");
}

export function confirmationPlainText(name: string, source: string) {
  const copy = confirmationCopy(source);
  return [`Hallo ${name},`, "", copy.text, "", site.name, site.tagline, site.url].join("\n");
}

export function notificationIntro(lead: LeadEmailFields) {
  if (lead.source === "maatwerk") {
    return `Er staat een nieuwe maatwerkvraag klaar. Antwoord op deze mail om ${lead.name} te bereiken.`;
  }
  return `Er staat een nieuwe aanvraag voor Kopvast Website klaar. Antwoord op deze mail om ${lead.name} te bereiken.`;
}
