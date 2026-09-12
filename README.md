# Kopvast

Publieke website voor **Kopvast** — scherp denken, sterk uitvoeren.

Kopvast helpt ondernemers hun bedrijf sterker naar buiten te brengen. De eerste dienst is een professionele website met doorlopend beheer. Daarna volgen merkidentiteit en bewerkbare sjablonen. Activatie en bedrijfsadvies worden pas getoond wanneer ze leverbaar zijn.

## Wat erin zit

- Merkpagina’s: home, websites, merkidentiteit, sjablonen, werkwijze, resultaten, over ons
- Aanvraagroute met server-side opslag en optionele e-mail via Resend
- Websitekansen: veilige homepage-check met maximaal drie bevindingen, daarna vaste prijs en scope
- Geen verzonnen reviews, groeipercentages of verkochte adviesdiensten

Testprijzen (excl. btw): Kopvast Website € 1.495 eenmalig, Kopvast Beheer € 199 per maand.

## Lokaal starten

```bash
npm install
npm run dev
```

De ontwikkelserver draait standaard op [http://localhost:3000](http://localhost:3000). Voor een vast poortnummer:

```bash
npm run dev -- --port 43127
```

```bash
npm run build
npm start
```

```bash
npm test
```

## Omgeving

Kopieer `.env.example` naar `.env.local` als je e-mailnotificaties wilt.

| Variabele | Functie |
| --- | --- |
| `RESEND_API_KEY` | Verstuurt aanvragen via Resend. Zonder sleutel wordt de lead wel opgeslagen, maar niet gemaild. |
| `RESEND_FROM_EMAIL` | Geverifieerde afzender, bijvoorbeeld `Kopvast <hello@kopvast.nl>` |
| `CONTACT_TO_EMAIL` | Ontvangstadres voor aanvragen |

## Publiceren op Vercel

Koppel deze repository aan een nieuw Vercel-project. Zet daarna je domein (bijvoorbeeld kopvast.nl) in Vercel onder Domains. Voeg de Resend-variabelen toe in Project Settings → Environment Variables.

## Beeld

Sfeerfotografie in `public/images` komt van Unsplash (Unsplash License). Het zijn sfeerbeelden, geen klantportretten.
