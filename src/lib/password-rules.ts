import { normalizeEmail } from "@/lib/product";

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

const rejected = new Set([
  "wachtwoord123",
  "password1234",
  "kopvast12345",
  "admin1234567",
  "welkom123456",
  "123456789012",
  "qwerty123456",
]);

export function validatePassword(password: string, email?: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false as const, message: `Kies een wachtwoord van minimaal ${MIN_PASSWORD_LENGTH} tekens.` };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false as const, message: "Dit wachtwoord is te lang." };
  }
  if (/\s/.test(password)) {
    return { ok: false as const, message: "Gebruik geen spaties in het wachtwoord." };
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return { ok: false as const, message: "Gebruik minstens één letter en één cijfer." };
  }
  const normalized = password.toLowerCase();
  if (rejected.has(normalized)) {
    return { ok: false as const, message: "Kies een minder voorspelbaar wachtwoord." };
  }
  if (email) {
    const address = normalizeEmail(email);
    const local = address.split("@")[0] ?? "";
    if (normalized.includes(address) || (local.length >= 4 && normalized.includes(local))) {
      return { ok: false as const, message: "Het wachtwoord mag niet op je e-mailadres lijken." };
    }
  }
  return { ok: true as const };
}

export const passwordHint = "Minimaal 12 tekens, met een letter en een cijfer. Geen spaties.";
