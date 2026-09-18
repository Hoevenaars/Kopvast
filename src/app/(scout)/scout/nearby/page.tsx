import { redirect } from "next/navigation";
import { readScoutUser } from "@/lib/scout/auth";
import { scoutPublicBase, withBase } from "@/lib/scout/base-path";
import { NearbyPanel } from "@/components/scout/nearby-panel";

export default async function ScoutNearbyPage() {
  const user = await readScoutUser();
  const base = await scoutPublicBase();
  if (!user) redirect(withBase(base, "/login"));
  return (
    <main>
      <p className="text-[11px] tracking-[0.28em] text-olive uppercase">Nearby</p>
      <h1 className="font-heading mt-3 text-4xl text-ink">Hier in de buurt</h1>
      <p className="mt-3 text-sm leading-6 text-olive">
        Locatie is optioneel en nooit nodig om een lead te pushen. Toestemming vraag ik alleen als jij hierop tikt.
      </p>
      <div className="mt-8">
        <NearbyPanel />
      </div>
    </main>
  );
}
