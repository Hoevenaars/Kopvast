import { getTestEmail, type EmailMode } from "@/lib/email-mode";

export function EmailModeBanner({ mode }: { mode: EmailMode }) {
  const testTo = getTestEmail();
  const test = mode !== "LIVE";
  return (
    <div
      className={
        test
          ? "rounded-2xl border border-copper/30 bg-[#F3E4DD] px-4 py-3 text-sm text-copper-dark"
          : "rounded-2xl border border-olive/30 bg-[#EDF0E9] px-4 py-3 text-sm text-olive"
      }
    >
      {test ? (
        <>
          <strong>TEST MODE</strong> — verzending gaat naar {testTo}, niet naar de prospect.
        </>
      ) : (
        <>
          <strong>LIVE MODE</strong> — mails gaan naar het echte prospectadres.
        </>
      )}
    </div>
  );
}
