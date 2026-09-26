import { STANDARD_PRICE_PARAGRAPH, validateOfferParagraph } from "@/emails/acquisition-outreach-copy";
import { offerPriceFromParagraph } from "@/lib/acquisition-start";
import {
  buildSpecialOffer,
  type ContentOfferReason,
  type GeographicOfferReason,
} from "@/lib/acquisition/special-offer-rules";

export function paragraphForManualDiscount(input: {
  geographicReason: GeographicOfferReason;
  contentReason: ContentOfferReason;
  allowLaunchOffer?: boolean;
}) {
  const offer = buildSpecialOffer({
    productFit: "STANDARD_FIT",
    manualReasons: {
      geographicReason: input.geographicReason,
      contentReason: input.contentReason,
    },
    allowLaunchOffer: input.allowLaunchOffer,
  });

  if (!offer.eligible) {
    return {
      discounted: false as const,
      paragraph: STANDARD_PRICE_PARAGRAPH,
      reasonLines: [] as string[],
    };
  }

  return {
    discounted: true as const,
    paragraph: offer.offerParagraph,
    reasonLines: offer.reasonLines,
  };
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

const PRICE_PARAGRAPH =
  /^Een complete Kopvast Website kost(?: normaal)? €\s*1[.,]?495 excl\. btw\./;
const FOLLOW_UP_PRICE =
  /^Voor jullie staat mijn aanbod van €\s*(?:995|1[.,]?495) excl\. btw\. nog steeds\.$/;
const INSERT_BEFORE =
  /^(?:Wat heeft jullie voorkeur|Ja, doe me een voorstel|Stuur me eerst meer info|Met vriendelijke groet|Als het nu niet speelt)\b/i;

function isReplaceablePriceBlock(block: string) {
  const collapsed = collapseWhitespace(block);
  return PRICE_PARAGRAPH.test(collapsed) || FOLLOW_UP_PRICE.test(collapsed);
}

export function applyManualOfferToMailBody(
  body: string,
  offerParagraph: string
): { ok: true; body: string } | { ok: false; message: string } {
  const nextParagraph = offerParagraph.trim();
  try {
    validateOfferParagraph(nextParagraph);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Ongeldige prijsalinea." };
  }

  const blocks = body.split(/\n{2,}/);
  const index = blocks.findIndex((block) => isReplaceablePriceBlock(block));
  if (index >= 0) {
    blocks[index] = nextParagraph;
  } else {
    const insertAt = blocks.findIndex((block) => INSERT_BEFORE.test(block.trim()));
    if (insertAt >= 0) blocks.splice(insertAt, 0, nextParagraph);
    else blocks.push(nextParagraph);
  }

  const price = offerPriceFromParagraph(nextParagraph);
  const next = blocks.join("\n\n").replace(/([?&]prijs=)(?:995|1495)\b/g, `$1${price}`);
  return { ok: true, body: next };
}
