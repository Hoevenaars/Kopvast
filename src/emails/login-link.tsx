import { EmailCode, EmailShell } from "@/emails/_components/email-shell";
import { Text } from "react-email";

export type LoginLinkEmailProps = {
  email: string;
  code: string;
  role: "admin" | "customer";
};

export function LoginLinkEmail({ email, code, role }: LoginLinkEmailProps) {
  const admin = role === "admin";
  return (
    <EmailShell
      preview={admin ? "Je inlogcode voor de Kopvast-admin" : "Je inlogcode voor Kopvast"}
      eyebrow={admin ? "Admin Console" : "Mijn Kopvast"}
      title={admin ? "Je inlogcode voor de admin." : "Je inlogcode staat klaar."}
    >
      <Text className="mt-0 mb-[16px] text-[15px] leading-[24px] text-ink">Hallo,</Text>
      <Text className="mt-0 mb-[16px] text-[15px] leading-[24px] text-olive">
        {admin
          ? "Voer deze code in op het inlogscherm om aanvragen, klanten en mail te openen. De code is twintig minuten geldig."
          : "Voer deze code in op het inlogscherm om je projecten, bestanden en verzoeken te openen. De code is twintig minuten geldig."}
      </Text>
      <EmailCode code={code} />
      <Text className="mt-[24px] mb-0 text-[13px] leading-[20px] text-olive">
        Deze mail is bedoeld voor {email}. Heb je niet om deze code gevraagd? Dan kun je hem negeren.
      </Text>
    </EmailShell>
  );
}

LoginLinkEmail.PreviewProps = {
  email: "eva@atelierlint.nl",
  code: "482917",
  role: "customer",
} satisfies LoginLinkEmailProps;

export default LoginLinkEmail;
