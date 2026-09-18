import type { ScoutFinding, ScoutOpportunity } from "./types";
import type { PageFacts } from "./scanner";
import { heuristicScores } from "./scanner";
import { allowExpensiveSideEffects } from "./config";

export type ScoutAiResult = {
  scores: ReturnType<typeof heuristicScores>;
  commercial_summary: string;
  biggest_opportunity: string;
  why_interesting: string;
  opportunities: ScoutOpportunity[];
  findings: ScoutFinding[];
  industry: string | null;
  industryInferred: boolean;
  city: string | null;
  draftSubject: string;
  draftMessage: string;
  usedAi: boolean;
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "technical_score",
    "conversion_score",
    "design_score",
    "brand_score",
    "content_score",
    "commercial_summary",
    "biggest_opportunity",
    "why_interesting",
    "opportunities",
    "industry",
    "industry_inferred",
    "city",
    "draft_subject",
    "draft_message",
    "inferred_findings",
  ],
  properties: {
    technical_score: { type: "number" },
    conversion_score: { type: "number" },
    design_score: { type: "number" },
    brand_score: { type: "number" },
    content_score: { type: "number" },
    commercial_summary: { type: "string" },
    biggest_opportunity: { type: "string" },
    why_interesting: { type: "string" },
    opportunities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail"],
        properties: { title: { type: "string" }, detail: { type: "string" } },
      },
    },
    industry: { type: ["string", "null"] },
    industry_inferred: { type: "boolean" },
    city: { type: ["string", "null"] },
    draft_subject: { type: "string" },
    draft_message: { type: "string" },
    inferred_findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["dimension", "title", "detail"],
        properties: {
          dimension: { type: "string", enum: ["technical", "conversion", "design", "brand", "content"] },
          title: { type: "string" },
          detail: { type: "string" },
        },
      },
    },
  },
} as const;

function clamp(value: unknown, fallback: number) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function fallbackCommercialCopy(input: {
  companyName: string | null;
  domain: string;
  note: string | null;
  facts: PageFacts;
  findings: ScoutFinding[];
}): Pick<ScoutAiResult, "commercial_summary" | "biggest_opportunity" | "why_interesting" | "opportunities" | "draftSubject" | "draftMessage"> {
  const name = input.companyName || input.domain;
  const note = input.note?.trim();
  const biggest = note
    ? "De fysieke of persoonlijke indruk lijkt sterker dan wat de huidige website nu uitstraalt."
    : "De online uitstraling kan beter aansluiten bij het niveau van de organisatie erachter.";
  const summary = note
    ? `Kopvast-notitie (persoonlijke observatie, niet onafhankelijk geverifieerd): “${note}” De homepage van ${name} laat nog weinig van die indruk zien.`
    : `De homepage van ${name} is bereikbaar, maar de digitale presentatie laat commerciële ruimte liggen. Dit is een Kopvast-prioritering, geen objectieve benchmark.`;
  const opportunities: ScoutOpportunity[] = [
    { title: "Eerste indruk", detail: "De website mag sneller het niveau van het bedrijf voelbaar maken." },
    input.facts.forms || input.facts.mailto || input.facts.tel
      ? { title: "Conversiepad", detail: "Maak de volgende stap nog vanzelfsprekender, in de taal van het bedrijf." }
      : { title: "Contactroute", detail: "Bezoekers hebben nu geen vanzelfsprekende manier om contact te zoeken." },
  ].slice(0, 3);
  const draftSubject = `Korte observatie over ${name}`;
  const noteLine = note
    ? `Ik kwam jullie tegen en noteerde voor mezelf: ${note} Dat gebruik ik alleen als context, niet als vaststaand feit.\n\n`
    : "";
  const draftMessage = `Beste ${name},\n\nIk kwam jullie website tegen en er vielen me een paar concrete zaken op waarmee de online uitstraling volgens mij beter kan aansluiten bij de organisatie die erachter zit.\n\n${noteLine}Met name de eerste indruk en de route naar contact kunnen scherper. Als het nuttig is, denk ik daar graag in één korte reactie over mee.\n\nMet vriendelijke groet,\nKopvast`;
  return {
    commercial_summary: summary,
    biggest_opportunity: biggest,
    why_interesting: note
      ? `Persoonlijke observatie: ${note}`
      : `Website van ${name} laat ruimte om de digitale uitstraling naar het organisatieniveau te tillen.`,
    opportunities,
    draftSubject,
    draftMessage,
  };
}

export async function analyseScoutLead(input: {
  domain: string;
  url: string;
  companyName: string | null;
  note: string | null;
  facts: PageFacts;
  findings: ScoutFinding[];
}): Promise<ScoutAiResult> {
  const scores = heuristicScores(input.facts, input.findings);
  const fallback = fallbackCommercialCopy(input);
  const base: ScoutAiResult = {
    scores,
    ...fallback,
    findings: input.findings,
    industry: null,
    industryInferred: false,
    city: null,
    usedAi: false,
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !allowExpensiveSideEffects()) return base;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        temperature: 0.3,
        response_format: {
          type: "json_schema",
          json_schema: { name: "kopvast_scout_analysis", strict: false, schema: SCHEMA },
        },
        messages: [
          {
            role: "system",
            content:
              "Je bent de stille analist van Kopvast Scout. Je verzint geen feiten. Gevonden HTML-feiten blijven feiten. AI-lezingen markeer je als inferentie. De persoonlijke notitie van de gebruiker is context, geen geverifieerd feit. Schrijf acquisitieconcepten concreet, in het Nederlands, zonder generieke zinnen als 'wij maken websites en willen graag kennismaken'. Geen automatische verzending. Scores zijn Kopvast-prioritering, geen wetenschappelijke benchmark.",
          },
          {
            role: "user",
            content: JSON.stringify({
              website_url: input.url,
              domain: input.domain,
              company_name: input.companyName,
              scout_note: input.note,
              scout_note_instruction:
                "Gebruik de notitie als commerciële context. Presenteer die observatie niet als onafhankelijk vastgesteld feit. Bewaar de strekking.",
              page_facts: {
                title: input.facts.title,
                description: input.facts.description,
                https: input.facts.https,
                viewport: Boolean(input.facts.viewport),
                h1: input.facts.h1,
                forms: input.facts.forms,
                mailto: input.facts.mailto,
                tel: input.facts.tel,
                ctaHints: input.facts.ctaHints,
                wordCount: input.facts.wordCount,
                headings: input.facts.headings,
                city_candidates: input.facts.jsonLd,
              },
              found_findings: input.findings,
              heuristic_scores: scores,
            }),
          },
        ],
      }),
    });
    if (!response.ok) {
      console.error("[scout] OpenAI-fout", response.status);
      return base;
    }
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return base;
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const inferred = Array.isArray(parsed.inferred_findings) ? parsed.inferred_findings : [];
    const extraFindings: ScoutFinding[] = inferred.slice(0, 8).map((item) => {
      const row = item as Record<string, string>;
      return {
        dimension: (row.dimension as ScoutFinding["dimension"]) || "content",
        kind: "inferred",
        title: String(row.title ?? "").slice(0, 160),
        detail: String(row.detail ?? "").slice(0, 500),
        evidence: "AI-inferentie op basis van homepage-feiten.",
      };
    });
    const nextScores = {
      technical: clamp(parsed.technical_score, scores.technical),
      conversion: clamp(parsed.conversion_score, scores.conversion),
      design: clamp(parsed.design_score, scores.design),
      brand: clamp(parsed.brand_score, scores.brand),
      content: clamp(parsed.content_score, scores.content),
      overall: 0,
    };
    nextScores.overall = clamp(
      nextScores.technical * 0.2 +
        nextScores.conversion * 0.22 +
        nextScores.design * 0.2 +
        nextScores.brand * 0.18 +
        nextScores.content * 0.2,
      scores.overall
    );
    return {
      scores: nextScores,
      commercial_summary: String(parsed.commercial_summary || fallback.commercial_summary).slice(0, 800),
      biggest_opportunity: String(parsed.biggest_opportunity || fallback.biggest_opportunity).slice(0, 400),
      why_interesting: String(parsed.why_interesting || fallback.why_interesting).slice(0, 400),
      opportunities: Array.isArray(parsed.opportunities)
        ? (parsed.opportunities as ScoutOpportunity[]).slice(0, 5)
        : fallback.opportunities,
      findings: [...input.findings, ...extraFindings],
      industry: typeof parsed.industry === "string" ? parsed.industry : null,
      industryInferred: Boolean(parsed.industry_inferred),
      city: typeof parsed.city === "string" ? parsed.city : null,
      draftSubject: String(parsed.draft_subject || fallback.draftSubject).slice(0, 140),
      draftMessage: String(parsed.draft_message || fallback.draftMessage).slice(0, 4000),
      usedAi: true,
    };
  } catch (error) {
    console.error("[scout] AI-analyse mislukt", error instanceof Error ? error.message : error);
    return base;
  }
}
