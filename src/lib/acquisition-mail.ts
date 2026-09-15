import { FORBIDDEN_MAIL_CLAIMS, MAIL_PROMPT_VERSION, MAIL_TEMPLATE_VERSION, type ProductFit } from "./acquisition-constants";
import {
  applyPlaceholders,
  acquisitionVars,
  defaultAcquisitionMailTemplate,
  loadAcquisitionMailTemplate,
  type AcquisitionMailTemplate,
} from "./mail-templates";
import { site } from "./site";

export type MailFinding = {
  id?: string;
  finding_type: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  confidence?: number;
};

export type GeneratedAcquisitionMail = {
  subject: string;
  body: string;
  findingsUsed: MailFinding[];
  promptVersion: string;
  templateVersion: string;
};

export function selectableMailFindings(findings: MailFinding[]): MailFinding[] {
  return findings.filter((item) => item.finding_type !== "HYPOTHESIS");
}

export function pickMailFindings(findings: MailFinding[]): MailFinding[] {
  const usable = selectableMailFindings(findings);
  const ranked = [...usable].sort((a, b) => {
    const weight = (item: MailFinding) =>
      (item.severity === "critical" ? 3 : item.severity === "important" ? 2 : 1) +
      (item.finding_type === "OBSERVATION" ? 0.3 : 0);
    return weight(b) - weight(a);
  });
  return ranked.slice(0, 3);
}

function stripForbiddenClaims(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !FORBIDDEN_MAIL_CLAIMS.some((pattern) => pattern.test(sentence)))
    .join(" ")
    .trim();
}

function fill(text: string, vars: Record<string, string>) {
  return applyPlaceholders(text, vars);
}

function offerParagraph(fit: ProductFit, template: AcquisitionMailTemplate, vars: Record<string, string>) {
  if (fit === "CUSTOM_FIT") return fill(template.offerCustom, vars);
  return fill(template.offerStandard, vars);
}

export function composeAcquisitionBody(
  input: {
    companyName?: string | null;
    domain: string;
    fit: ProductFit;
    findings: MailFinding[];
    opening?: string;
    points?: string[];
  },
  template: AcquisitionMailTemplate = defaultAcquisitionMailTemplate()
): string {
  const findings = input.points?.length ? [] : pickMailFindings(input.findings);
  const pointTexts =
    input.points?.filter(Boolean).slice(0, 2) ??
    findings.slice(0, 2).map((item) => stripForbiddenClaims(item.description || item.title));
  const vars = acquisitionVars(input);
  const opening = input.opening || fill(template.opening, vars);

  const attention = pointTexts.length
    ? pointTexts.map((text) => text.replace(/\s+/g, " ").trim()).filter(Boolean)
    : ["De online presentatie kan scherper aansluiten op het niveau van jullie bedrijf."];

  const focus = attention.slice(0, 2);
  const focusLine =
    focus.length >= 2
      ? `Vooral ${shortFocus(focus[0])} en ${shortFocus(focus[1])} bieden ruimte om de online presentatie beter aan te laten sluiten op het niveau van jullie bedrijf.`
      : `Vooral ${shortFocus(focus[0])} biedt ruimte om de online presentatie beter aan te laten sluiten op het niveau van jullie bedrijf.`;

  return [
    fill(template.greeting, vars),
    "",
    opening.trim(),
    "",
    ...attention.flatMap((item) => [item, ""]),
    focusLine,
    "",
    fill(template.pitch, vars),
    "",
    offerParagraph(input.fit, template, vars),
    "",
    fill(template.closing, vars),
    "",
    fill(template.signatureName, vars) || site.name,
    fill(template.signatureTagline, vars) || site.tagline,
  ].join("\n");
}

function shortFocus(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim().replace(/\.+$/, "");
  const clipped = cleaned.length <= 80 ? cleaned : cleaned.slice(0, 76).replace(/\s+\S*$/, "");
  if (!clipped) return "dit aandachtspunt";
  return clipped.charAt(0).toLowerCase() + clipped.slice(1);
}

export function chooseSubject(
  input: { companyName?: string | null; domain: string; findings: MailFinding[] },
  template: AcquisitionMailTemplate = defaultAcquisitionMailTemplate()
) {
  const vars = acquisitionVars(input);
  if (input.companyName && input.findings.length >= 2) return fill(template.subjectCompany, vars);
  if (input.findings.length >= 2) return fill(template.subjectPoints, vars);
  return fill(template.subjectDomain, vars);
}

export function fallbackAcquisitionMail(
  input: {
    companyName?: string | null;
    domain: string;
    fit: ProductFit;
    findings: MailFinding[];
  },
  template: AcquisitionMailTemplate = defaultAcquisitionMailTemplate()
): GeneratedAcquisitionMail {
  const used = pickMailFindings(input.findings);
  const body = composeAcquisitionBody(
    {
      companyName: input.companyName,
      domain: input.domain,
      fit: input.fit,
      findings: used,
    },
    template
  );
  const greeting = fill(template.greeting, acquisitionVars(input));
  return {
    subject: chooseSubject({ ...input, findings: used }, template),
    body: stripForbiddenClaims(body).includes(greeting.replace(/,$/, "")) ? body : composeAcquisitionBody(input, template),
    findingsUsed: used,
    promptVersion: MAIL_PROMPT_VERSION,
    templateVersion: MAIL_TEMPLATE_VERSION,
  };
}

const MAIL_SYSTEM_PROMPT = `Je schrijft een korte, persoonlijke acquisitiemail voor Kopvast.
Toon: kort, professioneel, direct, rustig, zelfverkeerd. Niet salesy, niet wollig, niet technisch, niet enthousiast.
Gebruik alleen de aangeleverde findings. Verzin geen omzet-, klant- of conversieclaims.
Een HYPOTHESIS mag nooit als feit worden opgeschreven.
Kies maximaal 1 openingsobservatie en 2 concrete verbeterpunten.
Onderwerpregels: geen clickbait, geen hoofdletters-schreeuwen, geen "gratis analyse".
Antwoord uitsluitend in JSON.`;

export async function generateAcquisitionMail(input: {
  companyName?: string | null;
  domain: string;
  fit: ProductFit;
  findings: MailFinding[];
  model?: string;
}): Promise<GeneratedAcquisitionMail> {
  const template = await loadAcquisitionMailTemplate();
  const fallback = fallbackAcquisitionMail(input, template);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;

  const usable = pickMailFindings(input.findings);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model || process.env.OPENAI_MODEL || "gpt-4.1-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: MAIL_SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              domain: input.domain,
              company_name: input.companyName ?? null,
              product_fit: input.fit,
              findings: usable,
              subject_options: [
                fill(template.subjectDomain, acquisitionVars(input)),
                input.companyName ? fill(template.subjectCompany, acquisitionVars(input)) : null,
                fill(template.subjectPoints, acquisitionVars(input)),
              ].filter(Boolean),
            }),
          },
        ],
      }),
    });
    if (!response.ok) {
      console.error("[kopvast] Mailgeneratie-fout", response.status, await response.text());
      return fallback;
    }
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return fallback;
    const parsed = JSON.parse(content) as {
      subject?: string;
      opening?: string;
      points?: string[];
    };
    const points = Array.isArray(parsed.points)
      ? parsed.points.map((item) => stripForbiddenClaims(String(item))).filter(Boolean).slice(0, 2)
      : [];
    const opening = parsed.opening ? stripForbiddenClaims(String(parsed.opening)) : undefined;
    const subject = sanitizeSubject(String(parsed.subject || fallback.subject), input, template);
    const body = composeAcquisitionBody(
      {
        companyName: input.companyName,
        domain: input.domain,
        fit: input.fit,
        findings: usable,
        opening,
        points: points.length ? points : undefined,
      },
      template
    );
    return {
      subject,
      body,
      findingsUsed: usable,
      promptVersion: MAIL_PROMPT_VERSION,
      templateVersion: MAIL_TEMPLATE_VERSION,
    };
  } catch (error) {
    console.error("[kopvast] Mailgeneratie mislukt", error instanceof Error ? error.message : error);
    return fallback;
  }
}

function sanitizeSubject(
  subject: string,
  input: { companyName?: string | null; domain: string },
  template: AcquisitionMailTemplate = defaultAcquisitionMailTemplate()
) {
  const cleaned = subject.replace(/\s+/g, " ").trim();
  if (!cleaned || /!!!|gratis analyse|verliest|BELANGRIJK/i.test(cleaned) || cleaned.length > 90) {
    return chooseSubject({ ...input, findings: [] }, template);
  }
  return cleaned;
}

export { MAIL_PROMPT_VERSION, MAIL_TEMPLATE_VERSION };
