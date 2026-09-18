import * as cheerio from "cheerio";
import { assertPublicHostname, fetchPublicResource, normalizeWebsiteUrl } from "./ssrf";

export type FindingKind = "feit" | "observatie";

export type ScanFinding = {
  id: string;
  kind: FindingKind;
  title: string;
  detail: string;
  evidence: string;
};

export type ScanSuccess = {
  status: "ok";
  url: string;
  fetchedUrl: string;
  title: string | null;
  coverage: string[];
  findings: ScanFinding[];
  scannedAt: string;
};

export type ScanFailure = {
  status: "blocked" | "unreachable" | "invalid";
  message: string;
};

export type ScanResult = ScanSuccess | ScanFailure;

const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 8000;

async function fetchPublicHtml(start: URL): Promise<{ finalUrl: string; html: string }> {
  const fetched = await fetchPublicResource(start, {
    timeoutMs: FETCH_TIMEOUT_MS,
    maxBytes: MAX_BYTES,
    maxRedirects: MAX_REDIRECTS,
    userAgent: "KopvastWebsiteCheck/1.0 (+https://kopvast.nl/websitecheck)",
  });
  if (fetched.contentType && !fetched.contentType.includes("html") && !fetched.contentType.includes("text/plain")) {
    throw new Error("Dit adres levert geen webpagina.");
  }
  return {
    finalUrl: fetched.finalUrl,
    html: fetched.body.toString("utf8"),
  };
}

function text($: cheerio.CheerioAPI, selector: string): string {
  return $(selector).first().text().replace(/\s+/g, " ").trim();
}

function buildFindings(url: URL, fetchedUrl: string, html: string): {
  title: string | null;
  coverage: string[];
  findings: ScanFinding[];
} {
  const $ = cheerio.load(html);
  const title = $("title").first().text().replace(/\s+/g, " ").trim() || null;
  const description =
    $('meta[name="description"]').attr("content")?.replace(/\s+/g, " ").trim() ?? "";
  const viewport = $('meta[name="viewport"]').attr("content") ?? "";
  const h1 = text($, "h1");
  const hasForm = $("form").length > 0;
  const hasMailto = $('a[href^="mailto:"]').length > 0;
  const hasTel = $('a[href^="tel:"]').length > 0;
  const contactHint = /contact|aanvraag|offerte|afspraak|boek/i.test(
    $("a, button").text() + " " + $('a[href]').map((_, el) => $(el).attr("href") ?? "").get().join(" ")
  );
  const images = $("img");
  const missingAlt = images.filter((_, el) => !$(el).attr("alt")?.trim()).length;
  const ogTitle = $('meta[property="og:title"]').attr("content") ?? "";
  const lang = $("html").attr("lang") ?? "";
  const candidates: ScanFinding[] = [];
  const coverage: string[] = [
    "Paginatitel",
    "Meta-omschrijving",
    "Mobiele weergave",
    "Hoofdkop",
    "Aanvraagroute",
  ];

  if (url.protocol !== "https:" && !fetchedUrl.startsWith("https://")) {
    candidates.push({
      id: "https",
      kind: "feit",
      title: "De verbinding is niet beveiligd",
      detail:
        "De site laadt via http. Bezoekers en formulieren lopen daardoor onnodig risico, en browsers markeren dit als onveilig.",
      evidence: `Opgevraagd adres: ${url.toString()}`,
    });
  }

  if (!title || title.length < 12 || /^home$/i.test(title) || title.toLowerCase() === url.hostname) {
    candidates.push({
      id: "title",
      kind: "feit",
      title: "De titelbalk vertelt te weinig",
      detail:
        "Zoekmachines en browsertabs tonen nu geen scherpe belofte. Een sterke titel maakt in één zin duidelijk wat je bedrijf doet.",
      evidence: title ? `Huidige titel: “${title}”` : "Er is geen <title> gevonden op de homepage.",
    });
  }

  if (!description || description.length < 40) {
    candidates.push({
      id: "description",
      kind: "feit",
      title: "Er ontbreekt een duidelijke belofte in zoekresultaten",
      detail:
        "Zonder meta-omschrijving vult Google vaak een willekeurig tekstfragment in. Dat is zelden de zin waarmee je een ondernemer wilt binnenhalen.",
      evidence: description
        ? `Huidige omschrijving telt ${description.length} tekens.`
        : "Er is geen meta description gevonden.",
    });
  }

  if (!viewport.toLowerCase().includes("width")) {
    candidates.push({
      id: "viewport",
      kind: "feit",
      title: "De homepage is niet klaar voor de telefoon",
      detail:
        "Er ontbreekt een viewport-instelling. Op een telefoon oogt de site dan snel te klein, te breed of lastig om een aanvraag te doen.",
      evidence: viewport ? `Viewport: ${viewport}` : "Geen meta viewport gevonden.",
    });
  }

  if (!h1) {
    candidates.push({
      id: "h1",
      kind: "observatie",
      title: "De belangrijkste boodschap is niet scherp gezet",
      detail:
        "We vonden geen H1. Daardoor is voor bezoekers en zoekmachines onduidelijk wat de pagina als eerste wil zeggen.",
      evidence: "Geen H1 op de opgehaalde homepage.",
    });
  }

  if (!hasForm && !hasMailto && !hasTel && !contactHint) {
    candidates.push({
      id: "contact",
      kind: "observatie",
      title: "Aanvragen hebben geen duidelijke route",
      detail:
        "We zagen geen formulier, mail- of belknop, en geen duidelijke contactlink. Een sterke website maakt de volgende stap onmiddellijk zichtbaar.",
      evidence: "Geen form, mailto, tel of herkenbare contactlink op de homepage.",
    });
  }

  if (images.length >= 3 && missingAlt / images.length >= 0.5) {
    candidates.push({
      id: "alt",
      kind: "feit",
      title: "Beeld is slecht toegankelijk",
      detail:
        "Een groot deel van de afbeeldingen heeft geen alternatieve tekst. Dat hindert screenreaders en maakt de pagina minder begrijpelijk.",
      evidence: `${missingAlt} van ${images.length} afbeeldingen missen alt-tekst.`,
    });
  }

  if (!ogTitle && !description) {
    candidates.push({
      id: "share",
      kind: "observatie",
      title: "Gedeelde links vertellen je verhaal niet",
      detail:
        "Er is geen Open Graph-titel. Als iemand de site deelt, toont dat zelden de uitstraling die bij het bedrijf past.",
      evidence: "Geen og:title gevonden.",
    });
  }

  if (!lang) {
    candidates.push({
      id: "lang",
      kind: "feit",
      title: "De taal van de pagina is niet vastgelegd",
      detail:
        "Zonder taalmarkering kunnen browsers en hulptechnologie de tekst verkeerd voorlezen. Dat is een kleine, concrete verbetering.",
      evidence: "Het html-element heeft geen lang-attribuut.",
    });
  }

  return {
    title,
    coverage,
    findings: candidates.slice(0, 3),
  };
}

export async function scanWebsite(input: string): Promise<ScanResult> {
  let url: URL;
  try {
    url = normalizeWebsiteUrl(input);
  } catch (error) {
    return {
      status: "invalid",
      message: error instanceof Error ? error.message : "Dit adres is niet geldig.",
    };
  }

  try {
    await assertPublicHostname(url.hostname);
  } catch (error) {
    return {
      status: "blocked",
      message: error instanceof Error ? error.message : "Dit adres is niet toegestaan.",
    };
  }

  try {
    const { finalUrl, html } = await fetchPublicHtml(url);
    const parsed = buildFindings(url, finalUrl, html);
    return {
      status: "ok",
      url: url.toString(),
      fetchedUrl: finalUrl,
      title: parsed.title,
      coverage: parsed.coverage,
      findings: parsed.findings,
      scannedAt: new Date().toISOString(),
    };
  } catch {
    return {
      status: "unreachable",
      message:
        "Deze website is nu niet bereikbaar of blokkeert automatische controle. Dat is een technische status, geen oordeel over je bedrijf.",
    };
  }
}
