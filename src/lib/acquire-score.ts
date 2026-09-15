import { domainFromUrl } from "./acquire-map";
import { normalizeWebsiteUrl } from "./ssrf";
import { DEFAULT_SCORE_THRESHOLDS, SCORE_WEIGHTS, statusFromScore, type ProductFit, type ScoreThresholds } from "./acquisition-constants";
import type { MappedFinding, RefreshStatus } from "./acquire-map";
import type { AiAnalysis } from "./acquire-map";

export type ScoreBreakdown = {
  websiteImprovement: number;
  commercialFit: number;
  productFit: number;
  evidenceQuality: number;
  total: number;
  status: RefreshStatus;
};

export function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function evidenceQualityScore(findings: MappedFinding[]): number {
  if (!findings.length) return 3;
  const facts = findings.filter((item) => item.finding_type === "FACT");
  const confidence =
    findings.reduce((sum, item) => sum + (Number.isFinite(item.confidence) ? item.confidence : 0.5), 0) /
    findings.length;
  const fromFacts = Math.min(7, facts.length * 2);
  const fromConfidence = Math.round(confidence * 3);
  return clamp(fromFacts + fromConfidence, 0, SCORE_WEIGHTS.evidenceQuality);
}

export function productFitPoints(fit: ProductFit): number {
  switch (fit) {
    case "STANDARD_FIT":
      return 22;
    case "CUSTOM_FIT":
      return 16;
    case "REVIEW_REQUIRED":
      return 10;
    case "NOT_FIT":
      return 2;
  }
}

export function websiteImprovementScore(input: {
  visual?: number | null;
  conversion?: number | null;
  content?: number | null;
  findings: MappedFinding[];
}): number {
  const qualities = [input.visual, input.conversion, input.content].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );
  const quality = qualities.length ? average(qualities) : 55;
  let points = ((100 - quality) / 100) * SCORE_WEIGHTS.websiteImprovement;
  for (const finding of input.findings) {
    if (finding.severity === "critical") points += 2;
    else if (finding.severity === "important") points += 1;
  }
  return clamp(Math.round(points), 0, SCORE_WEIGHTS.websiteImprovement);
}

export function commercialFitScore(value: number | null | undefined, findings: MappedFinding[]): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clamp(Math.round(value), 0, SCORE_WEIGHTS.commercialFit);
  }
  const conversion = findings.filter((item) => item.category === "conversion" || item.category === "commercial");
  return clamp(12 + conversion.length * 3, 8, SCORE_WEIGHTS.commercialFit);
}

export function calculateOpportunityScore(input: {
  visual?: number | null;
  conversion?: number | null;
  content?: number | null;
  commercialFit?: number | null;
  productFit: ProductFit;
  findings: MappedFinding[];
  thresholds?: ScoreThresholds;
}): ScoreBreakdown {
  const websiteImprovement = websiteImprovementScore(input);
  const commercialFit = commercialFitScore(input.commercialFit, input.findings);
  const productFit = productFitPoints(input.productFit);
  const evidenceQuality = evidenceQualityScore(input.findings);
  const total = clamp(websiteImprovement + commercialFit + productFit + evidenceQuality, 0, 100);
  return {
    websiteImprovement,
    commercialFit,
    productFit,
    evidenceQuality,
    total,
    status: statusFromScore(total, input.thresholds ?? DEFAULT_SCORE_THRESHOLDS),
  };
}

export function thresholdsFromSettings(row: {
  score_rejected_max?: number | null;
  score_watchlist_max?: number | null;
  score_qualified_max?: number | null;
  score_sales_ready_max?: number | null;
} | null): ScoreThresholds {
  return {
    rejectedMax: row?.score_rejected_max ?? DEFAULT_SCORE_THRESHOLDS.rejectedMax,
    watchlistMax: row?.score_watchlist_max ?? DEFAULT_SCORE_THRESHOLDS.watchlistMax,
    qualifiedMax: row?.score_qualified_max ?? DEFAULT_SCORE_THRESHOLDS.qualifiedMax,
    salesReadyMax: row?.score_sales_ready_max ?? DEFAULT_SCORE_THRESHOLDS.salesReadyMax,
  };
}

export function canonicalDomainFromInput(input: string): { url: URL; domain: string; websiteUrl: string } {
  const url = normalizeWebsiteUrl(input);
  const domain = domainFromUrl(url.toString());
  const websiteUrl = `${url.protocol}//${url.host}`;
  return { url, domain, websiteUrl };
}

export function analysisToFindingInputs(analysis: AiAnalysis): MappedFinding[] {
  return analysis.findings.map((finding) => ({
    category: finding.category,
    finding_type: finding.type,
    title: finding.title,
    description: finding.description,
    severity: finding.severity,
    confidence: finding.confidence,
    evidence_type: "ai",
    evidence_reference: finding.evidence_reference,
    created_by: "agent",
  }));
}
