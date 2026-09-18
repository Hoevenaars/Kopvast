import { redirect } from "next/navigation";
import { readScoutUser } from "@/lib/scout/auth";
import { scoutPublicBase, withBase } from "@/lib/scout/base-path";
import { CameraCapture } from "@/components/scout/camera-capture";

export default async function ScoutCameraPage() {
  const user = await readScoutUser();
  const base = await scoutPublicBase();
  if (!user) redirect(withBase(base, "/login"));
  return (
    <main>
      <p className="text-[11px] tracking-[0.28em] text-olive uppercase">Camera</p>
      <h1 className="font-heading mt-3 text-4xl text-ink">Maak een foto</h1>
      <p className="mt-3 text-sm leading-6 text-olive">
        Gevel, bus, bord of visitekaartje. Kopvast Scout stelt alleen voor. Jij bevestigt voordat er iets in de pipeline
        belandt. Foto’s worden niet bewaard.
      </p>
      <div className="mt-8">
        <CameraCapture base={base} />
      </div>
    </main>
  );
}
