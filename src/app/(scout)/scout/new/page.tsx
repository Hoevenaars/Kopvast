import { redirect } from "next/navigation";
import { extractUrlFromShare } from "@/lib/scout/urls";
import { scoutPublicBase, withBase } from "@/lib/scout/base-path";

export default async function ScoutNewPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; text?: string; title?: string; source?: string }>;
}) {
  const params = await searchParams;
  const extracted = extractUrlFromShare(params) || params.url || "";
  const base = await scoutPublicBase();
  const next = new URLSearchParams();
  if (extracted) next.set("url", extracted);
  if (params.source) next.set("source", params.source);
  else if (params.url) next.set("source", "shortcut");
  redirect(`${withBase(base, "/")}?${next.toString()}`);
}
