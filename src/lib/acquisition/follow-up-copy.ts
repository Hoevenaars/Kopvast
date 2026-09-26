import { MORE_INFO_CTA_LABEL, PROPOSAL_CTA_LABEL } from "@/emails/acquisition-outreach-copy";
import { splitMailParagraphs } from "@/lib/mail-body";
import { site } from "@/lib/site";

export function mailHasClosingSignature(body: string) {
  return splitMailParagraphs(body).some((block) =>
    block.split(/\n/).some((line) => {
      const trimmed = line.trim();
      return trimmed === site.name || trimmed === site.tagline;
    })
  );
}

export function followUpPlainText(body: string, choiceAUrl?: string | null, choiceBUrl?: string | null) {
  const blocks = splitMailParagraphs(body).filter((item) => !/^KOPVAST$/i.test(item));
  const lines = ["KOPVAST", ""];
  for (const block of blocks) {
    if (block === PROPOSAL_CTA_LABEL || block.startsWith(`${PROPOSAL_CTA_LABEL}:`)) {
      lines.push(`${PROPOSAL_CTA_LABEL}:`, choiceAUrl || "", "");
      continue;
    }
    if (block === MORE_INFO_CTA_LABEL || block.startsWith(`${MORE_INFO_CTA_LABEL}:`)) {
      lines.push(`${MORE_INFO_CTA_LABEL}:`, choiceBUrl || "", "");
      continue;
    }
    if (block === site.name || block === site.tagline) continue;
    lines.push(block, "");
  }
  if (!mailHasClosingSignature(body)) {
    lines.push(site.name, site.tagline, "");
  }
  return lines.join("\n").trim();
}
