import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { routes } from "@/lib/site";

export const metadata: Metadata = {
  title: "Aanvraag",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = new URLSearchParams();
  next.set("dienst", "website-nieuw");
  next.set("cta", "aanvraag");
  const website = first(params.website)?.trim();
  const company = first(params.bedrijf)?.trim();
  if (website) next.set("website", website);
  if (company) next.set("bedrijf", company);
  redirect(`${routes.contact}?${next.toString()}`);
}
