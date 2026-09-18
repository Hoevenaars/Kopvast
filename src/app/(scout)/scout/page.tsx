import type { Metadata } from "next";
import { scoutPublicBase, withBase } from "@/lib/scout/base-path";
import { readScoutUser } from "@/lib/scout/auth";
import { ScoutCaptureForm } from "@/components/scout/capture-form";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Scout" };

export default async function ScoutHomePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; text?: string; title?: string; source?: string; note?: string }>;
}) {
  const user = await readScoutUser();
  const base = await scoutPublicBase();
  if (!user) redirect(withBase(base, "/login"));
  const params = await searchParams;
  return (
    <main className="flex flex-1 flex-col">
      <header className="mb-10 pt-6 text-center">
        <p className="text-[11px] tracking-[0.28em] text-olive uppercase">Kopvast Scout</p>
        <h1 className="font-heading mt-4 text-4xl leading-none text-ink">Zien. Pushen. Verder.</h1>
      </header>
      <ScoutCaptureForm
        base={base}
        initialUrl={params.url || params.text}
        initialSource={params.source}
        initialNote={params.note}
      />
    </main>
  );
}
