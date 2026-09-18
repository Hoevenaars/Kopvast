import { Resend } from "resend";

/**
 * Resend is voorbereid. Scout verstuurt in deze versie NOOIT automatisch acquisitie.
 * Versturen gebeurt pas na een expliciete latere actie, niet bij goedkeuren.
 */
export function resendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendApprovedOutreach(_input: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}): Promise<{ ok: false; message: string }> {
  return {
    ok: false,
    message: "Automatisch versturen staat uit. Keur het concept goed en verstuur later handmatig.",
  };
}
