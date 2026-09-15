import { splitMailParagraphs } from "@/lib/mail-body";
import { site } from "@/lib/site";

export function MailPreview({
  subject,
  body,
}: {
  subject: string;
  body: string;
  companyName?: string | null;
  domain: string;
}) {
  const blocks = splitMailParagraphs(body);

  return (
    <div className="overflow-hidden rounded-xl border border-ink/10 bg-white">
      <div className="px-6 pt-7 pb-8 text-[15px] leading-6 text-ink">
        <p className="mb-7 text-[19px] leading-6 font-extrabold tracking-[-0.5px]">{site.name.toUpperCase()}</p>
        {subject.trim() ? <p className="mb-5 text-sm text-ink/45">{subject.trim()}</p> : null}
        {blocks.length === 0 ? (
          <p className="text-ink/35">De preview verschijnt terwijl je typt.</p>
        ) : (
          blocks.map((block, index) => (
            <p key={`${index}-${block.slice(0, 24)}`} className="mb-4 whitespace-pre-wrap">
              {block}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
