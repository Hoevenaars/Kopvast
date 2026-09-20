import {
  CHOICE_INTRO,
  MORE_INFO_CTA_LABEL,
  PROPOSAL_CTA_LABEL,
  REPLY_HINT,
  STANDARD_PRICE_PARAGRAPH,
} from "@/emails/acquisition-outreach-copy";
import { acquisitionChoiceUrls } from "@/lib/acquisition-start";
import { site } from "@/lib/site";

export const UNREACHABLE_SITE_PROMPT_VERSION = "kopvast-unreachable-site-v1";
export const UNREACHABLE_SITE_TEMPLATE_VERSION = "unreachable-site-v1";

export function unreachableSiteIntro(domain: string) {
  return `Ik kwam ${domain} tegen, maar de website was niet bereikbaar.`;
}

export function isUnreachableSiteMail(body: string | null | undefined) {
  return /maar de website was niet bereikbaar/i.test(body ?? "");
}

export function buildUnreachableSiteMail(input: { domain: string; companyName?: string | null }) {
  const who = input.companyName?.trim() || input.domain;
  const subject = `De website van ${input.domain} is nu niet bereikbaar`;
  const opening = `Als klanten ${who} nu zoeken, komen ze nergens terecht. Ik help ondernemers om zo'n site weer op te zetten: helder, bereikbaar en klaar voor contact.`;
  const urls = acquisitionChoiceUrls({
    domain: input.domain,
    companyName: input.companyName,
    offerPrice: 1495,
  });
  const body = [
    "Goedendag,",
    "",
    unreachableSiteIntro(input.domain),
    "",
    opening,
    "",
    STANDARD_PRICE_PARAGRAPH,
    "",
    CHOICE_INTRO,
    "",
    `${PROPOSAL_CTA_LABEL}:`,
    urls.choiceAUrl,
    "",
    `${MORE_INFO_CTA_LABEL}:`,
    urls.choiceBUrl,
    "",
    REPLY_HINT,
    "",
    site.name,
    site.tagline,
  ].join("\n");

  return {
    subject,
    body,
    greeting: "Goedendag,",
    intro: unreachableSiteIntro(input.domain),
    opening,
    offer: STANDARD_PRICE_PARAGRAPH,
    promptVersion: UNREACHABLE_SITE_PROMPT_VERSION,
    templateVersion: UNREACHABLE_SITE_TEMPLATE_VERSION,
  };
}

export function isUnreachableProspect(input: { status?: string | null; scanStatus?: string | null; scanError?: string | null }) {
  return (
    input.status === "SCAN_FAILED" ||
    input.scanStatus === "failed" ||
    Boolean(input.scanError?.trim())
  );
}
