import { site } from "@/lib/site";
import {
  CHOICE_INTRO,
  DEFAULT_CHOICE_A_URL,
  DEFAULT_CHOICE_B_URL,
  DUPLICATE_EMAIL_CONTENT_ERROR,
  MORE_INFO_CTA_LABEL,
  PROPOSAL_CTA_LABEL,
  REPLY_HINT,
  emailPropsFromDraft,
  findDuplicatedAcquisitionContent,
} from "@/emails/acquisition-outreach-copy";
import { isUnreachableSiteMail } from "@/lib/acquisition/unreachable-site-mail";
import { splitMailParagraphs } from "@/lib/mail-body";

export function MailPreview({
  subject,
  body,
  companyName,
  domain,
  layout = "outreach",
}: {
  subject: string;
  body: string;
  companyName?: string | null;
  domain: string;
  layout?: "outreach" | "short";
}) {
  if (layout === "short") {
    const blocks = splitMailParagraphs(body).filter(
      (item) => item !== PROPOSAL_CTA_LABEL && item !== MORE_INFO_CTA_LABEL && !/^KOPVAST$/i.test(item)
    );
    const showChoices = body.includes(PROPOSAL_CTA_LABEL) || body.includes(MORE_INFO_CTA_LABEL);
    return (
      <div className="overflow-hidden rounded-xl border border-ink/10 bg-white">
        <div className="px-6 pt-7 pb-8 text-[15px] leading-6 text-ink">
          <p className="mb-7 text-[19px] leading-6 font-extrabold tracking-[-0.5px]">{site.name.toUpperCase()}</p>
          {subject.trim() ? <p className="mb-5 text-sm text-ink/45">{subject.trim()}</p> : null}
          {blocks.map((item) => (
            <p key={item} className="mb-4">
              {item}
            </p>
          ))}
          {showChoices ? (
            <>
          <p className="mb-3">
            <a href={DEFAULT_CHOICE_A_URL} className="inline-block rounded-[4px] bg-[#121212] px-[18px] py-[13px] text-sm font-bold text-white no-underline">
              {PROPOSAL_CTA_LABEL}
            </a>
          </p>
          <p className="mb-4">
            <a href={DEFAULT_CHOICE_B_URL} className="inline-block rounded-[4px] border border-[#121212] bg-white px-[18px] py-[12px] text-sm font-bold text-[#121212] no-underline">
              {MORE_INFO_CTA_LABEL}
            </a>
          </p>
            </>
          ) : null}
          <p className="mb-0">{site.name}</p>
          <p className="mt-0.5 text-[13px] text-ink/45">{site.tagline}</p>
        </div>
      </div>
    );
  }
  if (isUnreachableSiteMail(body)) {
    const blocks = splitMailParagraphs(body);
    const proposalUrl =
      blocks.find((item) => item.startsWith("http") && item.includes("keuze=voorstel")) || DEFAULT_CHOICE_A_URL;
    const moreInfoUrl = blocks.find((item) => item.startsWith("http") && item.includes("keuze=info")) || DEFAULT_CHOICE_B_URL;
    return (
      <div className="overflow-hidden rounded-xl border border-ink/10 bg-white">
        <div className="px-6 pt-7 pb-8 text-[15px] leading-6 text-ink">
          <p className="mb-7 text-[19px] leading-6 font-extrabold tracking-[-0.5px]">{site.name.toUpperCase()}</p>
          {subject.trim() ? <p className="mb-5 text-sm text-ink/45">{subject.trim()}</p> : null}
          {blocks
            .filter(
              (item) =>
                item !== site.name &&
                item !== site.tagline &&
                item !== CHOICE_INTRO &&
                item !== REPLY_HINT &&
                !item.startsWith(PROPOSAL_CTA_LABEL) &&
                !item.startsWith(MORE_INFO_CTA_LABEL) &&
                !item.startsWith("http")
            )
            .map((item) => (
              <p key={item} className="mb-4">
                {item}
              </p>
            ))}
          <p className="mb-4 font-bold">{CHOICE_INTRO}</p>
          <p className="mb-3">
            <a href={proposalUrl} className="inline-block rounded-[4px] bg-[#121212] px-[18px] py-[13px] text-sm font-bold text-white no-underline">
              {PROPOSAL_CTA_LABEL}
            </a>
          </p>
          <p className="mb-4">
            <a href={moreInfoUrl} className="inline-block rounded-[4px] border border-[#121212] bg-white px-[18px] py-[12px] text-sm font-bold text-[#121212] no-underline">
              {MORE_INFO_CTA_LABEL}
            </a>
          </p>
          <p className="mb-6 text-[14px] leading-[22px] text-ink/60">{REPLY_HINT}</p>
          <p className="mb-0">{site.name}</p>
          <p className="mt-0.5 text-[13px] text-ink/45">{site.tagline}</p>
        </div>
      </div>
    );
  }

  if (!body.trim()) {
    return (
      <div className="overflow-hidden rounded-xl border border-ink/10 bg-white">
        <div className="px-6 pt-7 pb-8 text-[15px] leading-6 text-ink/35">De preview verschijnt terwijl je typt.</div>
      </div>
    );
  }

  let emailProps: ReturnType<typeof emailPropsFromDraft> | null = null;
  let error: string | null = null;

  try {
    emailProps = emailPropsFromDraft({ domain, companyName, subject, body });
    error = findDuplicatedAcquisitionContent(body);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : DUPLICATE_EMAIL_CONTENT_ERROR;
  }

  if (error) {
    return (
      <div className="overflow-hidden rounded-xl border border-destructive/30 bg-white">
        <div className="px-6 pt-7 pb-8 text-[15px] leading-6 text-ink">
          {subject.trim() ? <p className="mb-5 text-sm text-ink/45">{subject.trim()}</p> : null}
          <p className="font-semibold text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (!emailProps) {
    return (
      <div className="overflow-hidden rounded-xl border border-ink/10 bg-white">
        <div className="px-6 pt-7 pb-8 text-[15px] leading-6 text-ink/35">De preview verschijnt terwijl je typt.</div>
      </div>
    );
  }

  const proposalUrl = emailProps.choiceAUrl;
  const moreInfoUrl = emailProps.choiceBUrl;

  return (
    <div className="overflow-hidden rounded-xl border border-ink/10 bg-white">
      <div className="px-6 pt-7 pb-8 text-[15px] leading-6 text-ink">
        <p className="mb-7 text-[19px] leading-6 font-extrabold tracking-[-0.5px]">{site.name.toUpperCase()}</p>
        {subject.trim() ? <p className="mb-5 text-sm text-ink/45">{subject.trim()}</p> : null}

        <p className="mb-4">{emailProps.greeting}</p>
        <p className="mb-4">{`Ik kwam ${emailProps.domain} tegen en heb de website kort bekeken.`}</p>
        <p className="mb-4">{emailProps.openingObservation}</p>
        <p className="mb-4 font-semibold">Twee dingen vielen direct op:</p>

        <div className="mb-4">
          <p className="font-bold">{emailProps.finding1.title}</p>
          <p className="text-[14px] leading-[22px] text-ink/70">{emailProps.finding1.description}</p>
        </div>
        <div className="mb-4">
          <p className="font-bold">{emailProps.finding2.title}</p>
          <p className="text-[14px] leading-[22px] text-ink/70">{emailProps.finding2.description}</p>
        </div>

        <p className="mb-4">Daar kunnen we iets sterkers van maken.</p>
        <p className="my-6 border-y border-[#dedbd4] py-6">{emailProps.specialOfferParagraph}</p>
        <p className="mb-4 font-bold">{CHOICE_INTRO}</p>

        <p className="mb-3">
          <a
            href={proposalUrl}
            className="inline-block rounded-[4px] bg-[#121212] px-[18px] py-[13px] text-sm font-bold text-white no-underline"
          >
            {PROPOSAL_CTA_LABEL}
          </a>
        </p>
        <p className="mb-4">
          <a
            href={moreInfoUrl}
            className="inline-block rounded-[4px] border border-[#121212] bg-white px-[18px] py-[12px] text-sm font-bold text-[#121212] no-underline"
          >
            {MORE_INFO_CTA_LABEL}
          </a>
        </p>

        <p className="mb-6 text-[14px] leading-[22px] text-ink/60">{REPLY_HINT}</p>
        <p className="mb-0">{emailProps.signatureName}</p>
        <p className="mt-0.5 text-[13px] text-ink/45">{emailProps.signatureTagline}</p>
        <div className="mt-8 border-t border-ink/10 pt-5 text-[11px] leading-[18px] text-ink/45">
          <p className="mb-0.5">{site.email}</p>
          <p>
            <a href={site.url} className="underline">
              kopvast.nl
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
