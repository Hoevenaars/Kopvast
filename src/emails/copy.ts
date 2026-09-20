import { DOMAIN_LANDING_SOURCE, isDomainLandingSource } from "@/lib/domain-landing";
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
  if (source === "acquisitie-voorstel") return "Acquisitie · voorstel";
  if (source === "acquisitie-info") return "Acquisitie · meer info";
  if (isDomainLandingSource(source)) return "DOMEININTERESSE";
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

  if (isDomainLandingSource(source) || source === DOMAIN_LANDING_SOURCE) {
    return {
      eyebrow: "Domein",
      subject: "Kopvast heeft je bericht ontvangen",
      title: "We hebben je aanvraag ontvangen.",
      text: "We hebben je bericht over dit domein ontvangen. We nemen contact met je op.",
      preview: "We nemen contact met je op.",
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
  if (isDomainLandingSource(lead.source)) {
    return domainNotificationFields(lead);
  }

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

export function confirmationPlainText(
  name: string,
  source: string,
  copy = confirmationCopy(source)
) {
  return [`Hallo ${name},`, "", copy.text, "", site.name, site.tagline, site.url].join("\n");
}

export function notificationIntro(lead: LeadEmailFields) {
  if (isDomainLandingSource(lead.source)) {
    const domain = lead.details?.Domein || lead.website || "dit domein";
    return `DOMEININTERESSE voor ${domain}. Antwoord op deze mail om ${lead.name} te bereiken.`;
  }
  if (lead.source === "maatwerk") {
    return `Er staat een nieuwe maatwerkvraag klaar. Antwoord op deze mail om ${lead.name} te bereiken.`;
  }
  return `Er staat een nieuwe aanvraag voor Kopvast Website klaar. Antwoord op deze mail om ${lead.name} te bereiken.`;
}

function domainNotificationFields(lead: LeadEmailFields): EmailField[] {
  const details = lead.details ?? {};
  const domain = details.Domein || lead.website || "";
  const fields: EmailField[] = [
    { label: "Domein", value: domain, href: domain ? websiteHref(domain) : undefined },
    { label: "Type", value: details.Type || "Prijsaanvraag" },
    { label: "Naam", value: lead.name },
    { label: "E-mail", value: lead.email, href: `mailto:${lead.email}` },
    { label: "Bod", value: details.Bod || "—" },
    { label: "Website interesse", value: details["Website interesse"] || "Nee" },
  ];
  const message = lead.message?.trim();
  const reconstructed = Object.entries(details)
    .filter(([, value]) => value.trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  if (message && message !== reconstructed) fields.push({ label: "Bericht", value: message });
  return fields.filter((field) => field.value);
}
