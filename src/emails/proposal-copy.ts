import { site } from "@/lib/site";

export function proposalMailCopy(input: { organization: string }) {
  const organization = input.organization.trim() || "jullie organisatie";
  return {
    subject: `Voorstel van Kopvast voor ${organization}`,
    preview: `Bekijk het voorstel van Kopvast voor ${organization}.`,
    eyebrow: "Voorstel",
    title: `Voorstel voor ${organization}`,
  };
}

export function proposalMailPlainText(
  input: { name: string; organization: string; url: string; amount: string },
  testTo?: string
) {
  const lines = [
    `Hallo ${input.name},`,
    "",
    `Hier is het voorstel van Kopvast voor ${input.organization}.`,
    `Investering: ${input.amount} excl. btw.`,
    "",
    `Bekijk het voorstel: ${input.url}`,
    "",
    site.name,
  ];
  if (testTo) {
    lines.push("", `TEST: deze mail is intern afgeleverd op ${testTo}.`);
  }
  return lines.join("\n");
}
