import { EmailButton, EmailShell } from "@/emails/_components/email-shell";
import { Text } from "react-email";

export type LoginLinkEmailProps = {
  email: string;
  verifyUrl: string;
  role: "admin" | "customer";
};

export function LoginLinkEmail({ email, verifyUrl, role }: LoginLinkEmailProps) {
  const admin = role === "admin";
  return (
    <EmailShell
      preview={admin ? "Log in bij de Kopvast-admin" : "Log in bij je Kopvast-omgeving"}
      eyebrow={admin ? "Admin Console" : "Mijn Kopvast"}
      title={admin ? "Je beheerscherm staat klaar." : "Je omgeving staat klaar."}
    >
      <Text className="mt-0 mb-[16px] text-[15px] leading-[24px] text-ink">{`Hallo,`}</Text>
      <Text className="mt-0 mb-[24px] text-[15px] leading-[24px] text-olive">
        {admin
          ? "Gebruik de knop hieronder om aanvragen, klanten en mail te openen. De link is twintig minuten geldig."
          : "Gebruik de knop hieronder om je projecten, bestanden en verzoeken te openen. De link is twintig minuten geldig."}
      </Text>
      <EmailButton href={verifyUrl}>{admin ? "Open Admin Console" : "Open Mijn Kopvast"}</EmailButton>
      <Text className="mt-[24px] mb-0 text-[13px] leading-[20px] text-olive">
        Deze mail is bedoeld voor {email}. Heb je niet om deze link gevraagd? Dan kun je hem negeren.
      </Text>
    </EmailShell>
  );
}

LoginLinkEmail.PreviewProps = {
  email: "eva@atelierlint.nl",
  verifyUrl: "https://kopvast.nl/inloggen/verify?token=demo",
  role: "customer",
} satisfies LoginLinkEmailProps;

export default LoginLinkEmail;
