import { EmailButton, EmailShell } from "@/emails/_components/email-shell";
import { Text } from "react-email";

export type PasswordResetEmailProps = {
  email: string;
  resetUrl: string;
};

export function PasswordResetEmail({ email, resetUrl }: PasswordResetEmailProps) {
  return (
    <EmailShell
      preview="Stel je Kopvast-wachtwoord opnieuw in"
      eyebrow="Beveiliging"
      title="Stel je wachtwoord opnieuw in."
    >
      <Text className="mt-0 mb-[16px] text-[15px] leading-[24px] text-ink">Hallo,</Text>
      <Text className="mt-0 mb-[24px] text-[15px] leading-[24px] text-olive">
        Er is gevraagd om een nieuw wachtwoord voor {email}. De link hieronder is twintig minuten
        geldig. Heb je dit niet zelf gevraagd? Dan kun je deze mail negeren.
      </Text>
      <EmailButton href={resetUrl}>Nieuw wachtwoord kiezen</EmailButton>
    </EmailShell>
  );
}

PasswordResetEmail.PreviewProps = {
  email: "eva@atelierlint.nl",
  resetUrl: "https://kopvast.nl/inloggen/wachtwoord/nieuw?token=demo",
} satisfies PasswordResetEmailProps;

export default PasswordResetEmail;
