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
| `RESEND_FROM_EMAIL` | Geverifieerde afzender. Standaard de Resend-sandbox; daarna `Kopvast <contact@send.kopvast.nl>`. |
| `CONTACT_TO_EMAIL` | Ontvangstadres voor aanvragen. |

## Livegang

Niet via **Upload files** in GitHub. Die pagina is voor losse bestanden; Vercel heeft git-commits nodig. De code staat in deze repo. Het GitHub-project [Hoevenaars/Kopvast](https://github.com/Hoevenaars/Kopvast) is de lege schil waarnaar je pusht.

Vanuit de projectmap (Cursor-terminal of WSL), als `main` up-to-date is:

```bash
git remote add github https://github.com/Hoevenaars/Kopvast.git
git checkout main
git pull origin main
git push -u github main
```

Heb je de remote al toegevoegd, sla `git remote add` over. GitHub vraagt om in te loggen (browser of Personal Access Token).

Daarna in Vercel: **Add New Project → Import `Hoevenaars/Kopvast`**. Maak een **nieuw** project; koppel het niet aan een ander bestaand Vercel-project.

1. **Publiceren** — in dit Cursor-gesprek op **Publish** klikken (zonder GitHub), of na de push hierboven het GitHub-repo in Vercel importeren.
2. **Domein** — `kopvast.nl` is gereserveerd (nu een TransIP-parkeerpagina). In Vercel: Add Domain `kopvast.nl` en `www.kopvast.nl`. In TransIP DNS:
   - A-record `@` → `10.0.1.2`
   - CNAME `www` → `cname.vercel-dns.com`
3. **E-mail** — maak een API-key op [resend.com/api-keys](https://resend.com/api-keys). Zet `RESEND_API_KEY` en `CONTACT_TO_EMAIL` in Vercel. Voeg daarna domein `send.kopvast.nl` toe in Resend (niet het hoofddomein, zodat bestaande mailboxen onaangetast blijven). Plak de DNS-records van Resend in TransIP. Zet daarna `RESEND_FROM_EMAIL="Kopvast <contact@send.kopvast.nl>"`.
4. **Naam** — voer Kopvast in de [KVK/BOIP Naamchecker](https://www.kvk.nl/starten/naamchecker/tool/). Let op gelijkende namen: [Klikvast](https://klikvast.com/) (websites/marketing) en Koopvast B.V. (andere spelling, vastgoed). Dit is geen juridisch advies.
5. **Voorwaarden** — laat AV, privacy en orderbevestiging door een jurist toetsen vóór betalende verkoop.
6. **Website Refresh** — de publieke check op `/kansen` en een aanvraag met website worden intern opgeslagen in het Supabase-project **Website Refresh**. Zet in Vercel:
   - `WEBSITE_REFRESH_SUPABASE_URL`
   - `WEBSITE_REFRESH_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY` (anders wordt alleen de URL + homepage-feiten bewaard, zonder AI-score)
   
   De bezoeker ziet nog steeds alleen de drie feiten/observaties. De AI draait daarna op de server en kost per scan enkele centen (model `gpt-4.1-mini`). Dezelfde URL wordt binnen 24 uur niet opnieuw door AI gehaald. De diepe crawl (meerdere pagina’s, Playwright) blijft in de interne Refresh-app.

## Beeld

Sfeerfotografie in `public/images` komt van Unsplash (Unsplash License). Het zijn sfeerbeelden, geen klantportretten.
