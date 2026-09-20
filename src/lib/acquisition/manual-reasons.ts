import { FINDING_CATEGORY_LABELS } from "@/lib/acquisition-constants";

export type ManualMailFinding = {
  finding_type: "OBSERVATION";
  category: ManualReasonCategory;
  title: string;
  description: string;
  severity: "important";
  confidence: number;
};

export const MANUAL_REASONS_PROMPT_VERSION = "kopvast-manual-reasons-v1";

export const MANUAL_MAIL_REASONS = [
  {
    category: "commercial",
    title: "De diensten mogen duidelijker naar voren komen.",
    description: "Wat jullie aanbieden komt nu nog te weinig naar voren.",
  },
  {
    category: "visual",
    title: "De eerste indruk kan sterker.",
    description: "Wat jullie onderscheidt komt nu nog te weinig naar voren.",
  },
  {
    category: "trust",
    title: "Het vertrouwen mag eerder voelbaar zijn.",
    description: "Een bezoeker ziet nog te weinig waarom hij jullie kan vertrouwen.",
  },
  {
    category: "conversion",
    title: "De route naar contact kan directer.",
    description: "Een bezoeker moet nu te veel zoeken voordat de volgende stap duidelijk is.",
  },
  {
    category: "mobile",
    title: "Op mobiel verdwijnt de belangrijkste boodschap.",
    description: "Op een telefoon verdwijnt te snel wat jullie belangrijk vinden.",
  },
  {
    category: "content",
    title: "Het verhaal mag scherper.",
    description: "Het verhaal is er, maar het blijft te algemeen om te overtuigen.",
  },
  {
    category: "navigation",
    title: "De weg door de website kan eenvoudiger.",
    description: "De weg door de website vraagt nu te veel zoeken.",
  },
] as const;

export type ManualReasonCategory = (typeof MANUAL_MAIL_REASONS)[number]["category"];

const REASON_BY_CATEGORY = new Map(MANUAL_MAIL_REASONS.map((item) => [item.category, item]));

export function isManualReasonCategory(value: string): value is ManualReasonCategory {
  return REASON_BY_CATEGORY.has(value as ManualReasonCategory);
}

export function manualReasonLabel(category: ManualReasonCategory) {
  return FINDING_CATEGORY_LABELS[category] ?? category;
}

export function parseManualReasonCategories(values: string[]):
  | { ok: true; categories: [ManualReasonCategory, ManualReasonCategory] }
  | { ok: false; message: string } {
  const unique = [...new Set(values.map((item) => item.trim()).filter(Boolean))];
  if (unique.length !== 2) {
    return { ok: false, message: "Kies precies twee redenen." };
  }
  if (!unique.every(isManualReasonCategory)) {
    return { ok: false, message: "Een van de gekozen redenen is ongeldig." };
  }
  return { ok: true, categories: [unique[0], unique[1]] };
}

export function findingsFromManualReasons(categories: [ManualReasonCategory, ManualReasonCategory]): ManualMailFinding[] {
  return categories.map((category) => {
    const reason = REASON_BY_CATEGORY.get(category);
    if (!reason) {
      throw new Error(`Onbekende reden: ${category}`);
    }
    return {
      finding_type: "OBSERVATION",
      category: reason.category,
      title: reason.title,
      description: reason.description,
      severity: "important",
      confidence: 0.7,
    };
  });
}

export function mailHasFindings(mail: { findings_used?: unknown } | null | undefined) {
  const used = mail?.findings_used;
  return Array.isArray(used) ? used.length > 0 : Boolean(used);
}

export function isManualReasonsMail(input: { prompt_version?: string | null; findings_used?: unknown } | null | undefined) {
  if (!input) return false;
  return input.prompt_version === MANUAL_REASONS_PROMPT_VERSION || mailHasFindings(input);
}
