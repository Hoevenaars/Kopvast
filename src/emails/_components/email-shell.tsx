import type { ReactNode } from "react";
import {
  Body,
  Button,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
  pixelBasedPreset,
} from "react-email";
import { site } from "@/lib/site";

export const emailColors = {
  ink: "#121212",
  ivory: "#f3f0e8",
  olive: "#5a604c",
  stone: "#d4cfc3",
  copper: "#c7663a",
  copperDark: "#a64d27",
  card: "#f7f4ec",
} as const;

const tailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        ink: emailColors.ink,
        ivory: emailColors.ivory,
        olive: emailColors.olive,
        stone: emailColors.stone,
        copper: emailColors.copper,
        "copper-dark": emailColors.copperDark,
        card: emailColors.card,
      },
    },
  },
};

const sans = "Outfit, Helvetica, Arial, sans-serif";
const serif = "Newsreader, Georgia, 'Times New Roman', serif";

export function EmailShell({
  preview,
  eyebrow,
  title,
  children,
}: {
  preview: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Html lang="nl" dir="ltr">
      <Tailwind config={tailwindConfig}>
        <Head>
          <meta content="light" name="color-scheme" />
          <meta content="light" name="supported-color-schemes" />
          <Font
            fontFamily="Outfit"
            fallbackFontFamily={["Helvetica", "Arial", "sans-serif"]}
            webFont={{
              url: "https://fonts.gstatic.com/s/outfit/v15/QGYvz_MVcBeNP4NJtEtq.woff2",
              format: "woff2",
            }}
            fontWeight={400}
            fontStyle="normal"
          />
          <style>
            {`@font-face {
              font-family: 'Newsreader';
              font-style: italic;
              font-weight: 400;
              mso-font-alt: Georgia;
              src: url(https://fonts.gstatic.com/s/newsreader/v26/cY9XfjOCX1hbuyalUrK439vogqCz_goCYw7oRd6JFYYzbA.woff2) format('woff2');
            }`}
          </style>
        </Head>
        <Body
          className="m-0 bg-ivory p-0"
          lang="nl"
          style={{ backgroundColor: emailColors.ivory, fontFamily: sans }}
        >
          <Preview>{preview}</Preview>
          <Container className="mx-auto my-[32px] w-full max-w-[560px] bg-ivory">
            <Section style={{ backgroundColor: emailColors.copper }}>
              <Text className="m-0 text-[4px] leading-[4px]" style={{ color: emailColors.copper }}>
                &nbsp;
              </Text>
            </Section>
            <Section className="px-[32px] pt-[28px] pb-[8px]">
              <Text
                className="m-0 text-[13px] font-semibold text-ink"
                style={{ letterSpacing: "0.22em", fontFamily: sans }}
              >
                {site.name.toUpperCase()}
              </Text>
              <Text
                className="mt-[8px] mb-0 text-[11px] uppercase text-olive"
                style={{ letterSpacing: "0.16em", fontFamily: sans }}
              >
                {site.tagline}
              </Text>
            </Section>
            <Section className="px-[32px] pt-[20px] pb-[4px]">
              <Text
                className="m-0 text-[11px] uppercase text-olive"
                style={{ letterSpacing: "0.18em", fontFamily: sans }}
              >
                {eyebrow}
              </Text>
              <Heading
                as="h1"
                className="mt-[10px] mb-0 text-[28px] leading-[34px] font-normal text-ink"
                style={{ fontFamily: serif, fontStyle: "italic" }}
              >
                {title}
              </Heading>
            </Section>
            <Section className="px-[32px] pt-[12px] pb-[8px]">{children}</Section>
            <Section className="px-[32px] pt-[8px] pb-[32px]">
              <Hr
                className="mx-0 mt-[16px] mb-[16px] border-solid"
                style={{ borderColor: emailColors.stone, borderTop: `1px solid ${emailColors.stone}` }}
              />
              <Text className="m-0 text-[12px] leading-[20px] text-olive" style={{ fontFamily: sans }}>
                {site.name} — {site.tagline}
              </Text>
              <Text className="mt-[4px] mb-0 text-[12px] leading-[20px] text-olive" style={{ fontFamily: sans }}>
                <Link href={`mailto:${site.email}`} className="text-olive underline">
                  {site.email}
                </Link>
                {" · "}
                <Link href={site.url} className="text-olive underline">
                  kopvast.nl
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export function EmailButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      href={href}
      className="box-border rounded-[6px] px-[20px] py-[12px] text-[14px] font-medium no-underline"
      style={{
        fontFamily: sans,
        backgroundColor: emailColors.copperDark,
        color: emailColors.ivory,
      }}
    >
      {children}
    </Button>
  );
}

export function EmailCode({ code }: { code: string }) {
  const digits = code.replace(/\D/g, "");
  const display = digits.length === 6 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits;
  return (
    <Section
      className="my-[8px] rounded-[8px] px-[16px] py-[20px] text-center"
      style={{ backgroundColor: emailColors.card }}
    >
      <Text
        className="m-0 text-[28px] leading-[36px] font-semibold text-copper-dark"
        style={{ fontFamily: sans, letterSpacing: "0.28em", color: emailColors.copperDark }}
      >
        {display}
      </Text>
    </Section>
  );
}

export function EmailField({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <Section className="py-[10px]">
      <Text
        className="m-0 text-[11px] uppercase text-olive"
        style={{ letterSpacing: "0.14em", fontFamily: sans }}
      >
        {label}
      </Text>
      {href ? (
        <Link
          href={href}
          className="mt-[4px] mb-0 block text-[15px] leading-[22px] text-ink no-underline"
          style={{ fontFamily: sans, whiteSpace: "pre-wrap" }}
        >
          {value}
        </Link>
      ) : (
        <Text
          className="mt-[4px] mb-0 text-[15px] leading-[22px] text-ink"
          style={{ fontFamily: sans, whiteSpace: "pre-wrap" }}
        >
          {value}
        </Text>
      )}
    </Section>
  );
}
