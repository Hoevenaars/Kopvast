import { splitMailParagraphs } from "@/lib/mail-body";
import { site } from "@/lib/site";

export function MailPreview({
  subject,
  body,
  companyName,
  domain,
}: {
  subject: string;
  body: string;
  companyName?: string | null;
  domain: string;
}) {
  const blocks = splitMailParagraphs(body);
  const eyebrow = companyName || domain;

  return (
    <div className="overflow-hidden rounded-xl border border-ink/10 bg-ivory">
      <div className="h-1 bg-copper" />
      <div className="px-6 pt-7">
        <p className="text-[13px] font-semibold tracking-[0.22em] text-ink">{site.name.toUpperCase()}</p>
        <p className="mt-2 text-[11px] tracking-[0.16em] text-olive uppercase">{site.tagline}</p>
      </div>
      <div className="px-6 pt-5">
        <p className="text-[11px] tracking-[0.18em] text-olive uppercase">{eyebrow}</p>
        <h3 className="font-heading mt-2 text-[26px] leading-8 text-ink italic">{subject.trim() || "Onderwerp"}</h3>
      </div>
      <div className="px-6 pt-4 pb-2 text-[15px] leading-6 text-ink">
        {blocks.length === 0 ? (
          <p className="text-ink/35">De preview verschijnt terwijl je typt.</p>
        ) : (
          blocks.map((block, index) => (
            <p key={`${index}-${block.slice(0, 24)}`} className="mb-4 whitespace-pre-wrap">
              {block}
            </p>
          ))
        )}
        <span className="mb-6 inline-flex rounded-md bg-copper-dark px-5 py-3 text-sm font-medium text-ivory">
          Bekijk het websitepakket
        </span>
      </div>
      <div className="px-6 pt-2 pb-7">
        <hr className="border-stone" />
        <p className="mt-4 text-xs leading-5 text-olive">
          {site.name} — {site.tagline}
        </p>
        <p className="mt-1 text-xs leading-5 text-olive">
          {site.email} · kopvast.nl
        </p>
      </div>
    </div>
  );
}
