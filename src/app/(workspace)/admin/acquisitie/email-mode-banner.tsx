import type { EmailMode } from "@/lib/email-mode";

export function EmailModeBanner({ mode, testTo }: { mode: EmailMode; testTo: string }) {
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
          <strong>LIVE MODE</strong> — acquisitiemails gaan naar het echte prospectadres. Testmail blijft intern.
        </>
      )}
    </div>
  );
}
