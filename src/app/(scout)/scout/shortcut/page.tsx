import { scoutAppUrl } from "@/lib/scout/config";

export default function ScoutShortcutPage() {
  const origin = scoutAppUrl().replace(/\/scout$/, "");
  const example = `${origin}/new?url=https%3A%2F%2Fbedrijf.nl`;
  return (
    <main className="space-y-5">
      <p className="text-[11px] tracking-[0.28em] text-olive uppercase">iPhone</p>
      <h1 className="font-heading mt-3 text-4xl text-ink">Deel-shortcut</h1>
      <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-olive">
        <li>Open de app Opdrachten op je iPhone.</li>
        <li>Tik op + en kies Nieuwe opdracht.</li>
        <li>Voeg “URL” toe. De waarde is {origin}/new?url= plus de URL-encoded gedeelde link.</li>
        <li>
          Voorbeeld:
          <code className="mt-2 block break-all rounded-xl bg-white px-3 py-2 text-ink">{example}</code>
        </li>
        <li>Voeg “URL coderen” toe op de gedeelde webpagina, plak die in de queryparameter url.</li>
        <li>Voeg “URL openen” toe.</li>
        <li>Deelblad: toon in Deelblad. Naam: Kopvast Scout.</li>
      </ol>
      <p className="text-sm leading-6 text-olive">
        Vanuit Safari: Deel → Kopvast Scout. Scout opent met de website ingevuld. Jij tikt Push. Er gaat niets
        automatisch de deur uit.
      </p>
    </main>
  );
}
