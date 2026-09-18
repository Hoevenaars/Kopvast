import * as cheerio from "cheerio";
import { fetchPublicResource, normalizeWebsiteUrl } from "@/lib/ssrf";
import type { ScoutFinding } from "./types";

export type PageFacts = {
  url: string;
  fetchedUrl: string;
  https: boolean;
  title: string | null;
  description: string | null;
  canonical: string | null;
  viewport: string | null;
  lang: string | null;
  h1: string | null;
  jsonLd: Record<string, unknown>[];
  emails: string[];
  phones: string[];
  linkedin: string | null;
  forms: number;
  mailto: boolean;
  tel: boolean;
  ctaHints: string[];
  ogTitle: string | null;
  ogImage: string | null;
  robotsMeta: string | null;
  images: number;
  imagesMissingAlt: number;
  wordCount: number;
  headings: string[];
  internalLinks: string[];
  brokenSample: Array<{ href: string; status?: number; error?: string }>;
  htmlBytes: number;
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractEmails(text: string, domain: string) {
  const found = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  return unique(
    found
      .map((item) => item.toLowerCase())
      .filter((item) => !item.endsWith(".png") && !item.endsWith(".jpg") && item.includes(domain.split(".").slice(-2).join(".")))
  ).slice(0, 3);
}

function extractPhones(hrefs: string[], text: string) {
  const fromTel = hrefs.filter((href) => href.startsWith("tel:")).map((href) => href.replace(/^tel:/i, "").trim());
  const fromText = text.match(/(?:\+31|0)[\d\s()-]{8,14}/g) ?? [];
  return unique([...fromTel, ...fromText.map((item) => item.replace(/\s+/g, " ").trim())]).slice(0, 3);
}

function parseJsonLd($: cheerio.CheerioAPI) {
  const blocks: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text();
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) if (item && typeof item === "object") blocks.push(item as Record<string, unknown>);
      } else if (parsed && typeof parsed === "object") {
        blocks.push(parsed as Record<string, unknown>);
      }
    } catch {
      /* ignore invalid json-ld */
    }
  });
  return blocks;
}

function scoreClamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function heuristicScores(facts: PageFacts, findings: ScoutFinding[]) {
  let technical = 78;
  let conversion = 72;
  let design = 70;
  let brand = 68;
  let content = 70;

  if (!facts.https) technical -= 28;
  if (!facts.viewport) technical -= 14;
  if (!facts.title) technical -= 8;
  if (facts.robotsMeta?.toLowerCase().includes("noindex")) technical -= 18;
  if (!facts.lang) technical -= 4;
  if (facts.brokenSample.length) technical -= Math.min(16, facts.brokenSample.length * 6);

  if (!facts.forms && !facts.mailto && !facts.tel) conversion -= 22;
  if (!facts.ctaHints.length) conversion -= 12;
  if (!facts.tel && !facts.mailto) conversion -= 8;
  if (facts.forms) conversion += 6;

  if (!facts.viewport) design -= 16;
  if (facts.images >= 3 && facts.imagesMissingAlt / facts.images > 0.5) design -= 10;
  if (!facts.ogImage) design -= 6;
  if (facts.wordCount < 80) design -= 8;

  if (!facts.ogTitle && !facts.title) brand -= 12;
  if (facts.title && facts.h1 && facts.title.split("|")[0]?.trim() !== facts.h1 && facts.h1.length > 40) brand -= 4;
  if (!facts.jsonLd.length) brand -= 6;

  if (!facts.h1) content -= 12;
  if (!facts.description || facts.description.length < 40) content -= 10;
  if (facts.wordCount < 60) content -= 14;
  if (facts.wordCount > 180) content += 4;

  const byDim = {
    technical: findings.filter((item) => item.dimension === "technical").length,
    conversion: findings.filter((item) => item.dimension === "conversion").length,
    design: findings.filter((item) => item.dimension === "design").length,
    brand: findings.filter((item) => item.dimension === "brand").length,
    content: findings.filter((item) => item.dimension === "content").length,
  };
  technical -= byDim.technical * 3;
  conversion -= byDim.conversion * 3;
  design -= byDim.design * 3;
  brand -= byDim.brand * 3;
  content -= byDim.content * 3;

  const scores = {
    technical: scoreClamp(technical),
    conversion: scoreClamp(conversion),
    design: scoreClamp(design),
    brand: scoreClamp(brand),
    content: scoreClamp(content),
    overall: 0,
  };
  scores.overall = scoreClamp(
    scores.technical * 0.2 + scores.conversion * 0.22 + scores.design * 0.2 + scores.brand * 0.18 + scores.content * 0.2
  );
  return scores;
}

export function findingsFromFacts(facts: PageFacts): ScoutFinding[] {
  const findings: ScoutFinding[] = [];
  if (!facts.https) {
    findings.push({
      dimension: "technical",
      kind: "found",
      title: "Geen HTTPS op het opgevraagde adres",
      detail: "De site laadt via http. Dat is een feitelijke technische bevinding, geen oordeel over het bedrijf.",
      evidence: facts.url,
    });
  }
  if (!facts.viewport) {
    findings.push({
      dimension: "technical",
      kind: "found",
      title: "Geen viewport-meta",
      detail: "Zonder viewport-instelling is de pagina op een iPhone vaak lastig bruikbaar.",
      evidence: "Geen meta viewport gevonden.",
    });
  }
  if (facts.robotsMeta?.toLowerCase().includes("noindex")) {
    findings.push({
      dimension: "technical",
      kind: "found",
      title: "Pagina vraagt om niet-indexeren",
      detail: "De homepage bevat een noindex-instructie.",
      evidence: facts.robotsMeta,
    });
  }
  if (!facts.forms && !facts.mailto && !facts.tel && !facts.ctaHints.length) {
    findings.push({
      dimension: "conversion",
      kind: "found",
      title: "Geen duidelijke contactroute",
      detail: "Op de homepage is geen formulier, belknop of mail-link zichtbaar.",
      evidence: "Geen form/mailto/tel/CTA-hint.",
    });
  }
  if (!facts.h1) {
    findings.push({
      dimension: "content",
      kind: "found",
      title: "Geen H1",
      detail: "De belangrijkste boodschap is niet als hoofdkop gezet.",
      evidence: "Geen H1 op de homepage.",
    });
  }
  if (!facts.description || facts.description.length < 40) {
    findings.push({
      dimension: "content",
      kind: "found",
      title: "Zwakke of ontbrekende meta-omschrijving",
      detail: "Zoekresultaten en deelkaarten hebben weinig concrete belofte.",
      evidence: facts.description ? `${facts.description.length} tekens` : "Geen meta description.",
    });
  }
  if (facts.images >= 3 && facts.imagesMissingAlt / facts.images >= 0.5) {
    findings.push({
      dimension: "design",
      kind: "found",
      title: "Veel beeld zonder alt-tekst",
      detail: "Dat raakt toegankelijkheid en de professionele indruk van de pagina.",
      evidence: `${facts.imagesMissingAlt}/${facts.images} zonder alt.`,
    });
  }
  if (!facts.ogTitle && !facts.ogImage) {
    findings.push({
      dimension: "brand",
      kind: "found",
      title: "Geen Open Graph-merkpresentatie",
      detail: "Gedeelde links tonen zelden de uitstraling van het bedrijf.",
      evidence: "Geen og:title of og:image.",
    });
  }
  return findings.slice(0, 12);
}

export async function scanPublicWebsite(input: string): Promise<{ facts: PageFacts; findings: ScoutFinding[] }> {
  const start = normalizeWebsiteUrl(input);
  const fetched = await fetchPublicResource(start, {
    timeoutMs: 8000,
    maxBytes: 1_500_000,
    maxRedirects: 3,
    userAgent: "KopvastScout/1.0 (+https://scout.kopvast.nl)",
  });
  if (fetched.contentType && !fetched.contentType.includes("html") && !fetched.contentType.includes("text/plain")) {
    throw new Error("Dit adres levert geen webpagina.");
  }
  const html = fetched.body.toString("utf8");
  const $ = cheerio.load(html);
  const pageUrl = new URL(fetched.finalUrl);
  const title = $("title").first().text().replace(/\s+/g, " ").trim() || null;
  const description = $('meta[name="description"]').attr("content")?.replace(/\s+/g, " ").trim() || null;
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() || null;
  const viewport = $('meta[name="viewport"]').attr("content")?.trim() || null;
  const lang = $("html").attr("lang")?.trim() || null;
  const h1 = $("h1").first().text().replace(/\s+/g, " ").trim() || null;
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const hrefs = $("a[href]")
    .map((_, el) => $(el).attr("href") ?? "")
    .get();
  const ctaHints = unique(
    $("a, button")
      .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
      .get()
      .filter((text) => /contact|offerte|afspraak|bel ons|plan|aanvraag|mail/i.test(text))
      .slice(0, 8)
  );
  const linkedin =
    hrefs.find((href) => /linkedin\.com\/(company|in)\//i.test(href))?.split("?")[0] ?? null;
  const images = $("img");
  const facts: PageFacts = {
    url: start.toString(),
    fetchedUrl: fetched.finalUrl,
    https: pageUrl.protocol === "https:",
    title,
    description,
    canonical,
    viewport,
    lang,
    h1,
    jsonLd: parseJsonLd($),
    emails: extractEmails(`${bodyText} ${hrefs.join(" ")}`, pageUrl.hostname),
    phones: extractPhones(hrefs, bodyText),
    linkedin,
    forms: $("form").length,
    mailto: hrefs.some((href) => href.startsWith("mailto:")),
    tel: hrefs.some((href) => href.startsWith("tel:")),
    ctaHints,
    ogTitle: $('meta[property="og:title"]').attr("content")?.trim() || null,
    ogImage: $('meta[property="og:image"]').attr("content")?.trim() || null,
    robotsMeta: $('meta[name="robots"]').attr("content")?.trim() || null,
    images: images.length,
    imagesMissingAlt: images.filter((_, el) => !$(el).attr("alt")?.trim()).length,
    wordCount: bodyText.split(/\s+/).filter(Boolean).length,
    headings: $("h1,h2,h3")
      .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
      .get()
      .filter(Boolean)
      .slice(0, 12),
    internalLinks: unique(
      hrefs
        .map((href) => {
          try {
            return new URL(href, pageUrl).toString();
          } catch {
            return "";
          }
        })
        .filter((href) => {
          try {
            return new URL(href).hostname.replace(/^www\./, "") === pageUrl.hostname.replace(/^www\./, "");
          } catch {
            return false;
          }
        })
    ).slice(0, 12),
    brokenSample: [],
    htmlBytes: fetched.body.byteLength,
  };

  const sample = facts.internalLinks.filter((href) => href !== fetched.finalUrl).slice(0, 4);
  for (const href of sample) {
    try {
      const head = await fetchPublicResource(new URL(href), {
        method: "HEAD",
        timeoutMs: 3000,
        maxRedirects: 2,
        maxBytes: 8_000,
        userAgent: "KopvastScout/1.0 (+https://scout.kopvast.nl)",
      });
      if (head.status >= 400) facts.brokenSample.push({ href, status: head.status });
    } catch (error) {
      facts.brokenSample.push({ href, error: error instanceof Error ? error.message : "onbereikbaar" });
    }
  }

  return { facts, findings: findingsFromFacts(facts) };
}
