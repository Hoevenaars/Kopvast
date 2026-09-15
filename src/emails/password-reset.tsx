import { EmailCode, EmailShell } from "@/emails/_components/email-shell";
import { Text } from "react-email";

export type PasswordResetEmailProps = {
  email: string;
  code: string;
};

export function PasswordResetEmail({ email, code }: PasswordResetEmailProps) {
  return (
    <EmailShell
      preview="Code om je Kopvast-wachtwoord opnieuw in te stellen"
      eyebrow="Beveiliging"
      title="Stel je wachtwoord opnieuw in."
    >
      <Text className="mt-0 mb-[16px] text-[15px] leading-[24px] text-ink">Hallo,</Text>
      <Text className="mt-0 mb-[16px] text-[15px] leading-[24px] text-olive">
        Er is gevraagd om een nieuw wachtwoord voor {email}. Voer de code hieronder in op het
        inlogscherm. De code is twintig minuten geldig. Heb je dit niet zelf gevraagd? Dan kun je
        deze mail negeren.
      </Text>
      <EmailCode code={code} />
    </EmailShell>
  );
}

PasswordResetEmail.PreviewProps = {
  email: "eva@atelierlint.nl",
  code: "482917",
} satisfies PasswordResetEmailProps;

export default PasswordResetEmail;
