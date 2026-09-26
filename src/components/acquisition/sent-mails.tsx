import { sentMailKindLabel } from "@/lib/acquisition/sent-mails";
import { formatNlDateTime } from "@/lib/acquisition-constants";
import type { ProspectMail } from "@/lib/acquisition";

export function SentMails({ mails }: { mails: ProspectMail[] }) {
  if (!mails.length) return null;

  return (
    <section className="space-y-4">
      <h2 className="font-semibold">Verzonden</h2>
      {mails.map((mail) => {
        const when = formatNlDateTime(mail.sent_at ?? mail.delivered_at ?? mail.created_at);
        const recipient = mail.to_email || mail.intended_to_email || "onbekend adres";
        const test = mail.email_mode === "TEST";
        return (
          <article key={mail.id} className="space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
            <div>
              <p className="text-xs font-semibold tracking-wide text-ink/45">
                {sentMailKindLabel(mail.kind)}
                {test ? " · test" : ""}
              </p>
              <h3 className="mt-1 text-lg font-semibold">{mail.subject || "Zonder onderwerp"}</h3>
              <p className="mt-1 text-sm text-ink/60">
                {when} · naar {recipient}
              </p>
            </div>
            <div className="max-w-xl overflow-hidden rounded-xl border border-ink/10 bg-ivory px-5 py-4 text-[15px] leading-6 whitespace-pre-wrap text-ink">
              {mail.body_text?.trim() || "De tekst van deze verzending is niet bewaard."}
            </div>
          </article>
        );
      })}
    </section>
  );
}
