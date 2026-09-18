import { redirect } from "next/navigation";
import { extractUrlFromShare } from "@/lib/scout/urls";
import { scoutPublicBase, withBase } from "@/lib/scout/base-path";

export default async function ScoutSharePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; text?: string; title?: string }>;
}) {
  const params = await searchParams;
  const extracted = extractUrlFromShare(params);
  const base = await scoutPublicBase();
  const next = new URLSearchParams({ source: "safari_share" });
  if (extracted) next.set("url", extracted);
  redirect(`${withBase(base, "/")}?${next.toString()}`);
}
