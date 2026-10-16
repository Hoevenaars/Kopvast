# PRE_FLIGHT — audit van de actuele repo

Datum: 16 oktober 2026. Bron: de checkout van `Hoevenaars/Kopvast` op `main` (`cbbf602`), plus `START_HIER_CURSOR`. De historisch bedoelde stack is niet overgenomen; onderstaande komt uit `package.json`, de routes en de code.

## Wat deze repo werkelijk is

Dit is **Kopvast**: publieke site van een digitaal bureau, plus adminconsole, klantportaal, voorstellen en de Scout-PWA. Er is geen product voor voorstellingen, capaciteit, verkoopfases, tickets of een publieke checkout.

| Onderdeel | Actueel |
| --- | --- |
| Framework | Next.js 16.3.5 (App Router, route groups), React 19.2.8, TypeScript 5 |
| Styling | Tailwind CSS 4, shadcn / Base UI, Lucide |
| Data | Supabase (project Website Refresh). Migraties staan in `supabase/migrations/` en zijn niet gedraaid |
| Mail | Resend + React Email. Lokaal blijft `EMAIL_MODE=TEST` tenzij expliciet anders |
| Auth | Eigen sessies (`KOPVAST_SESSION_SECRET`), scrypt-wachtwoorden, Scout-allowlist |
| Hosting | Vercel. Crons: `/api/scout/jobs` en `/api/acquisition/jobs` |
| Dev | `npm run dev` op poort **43127** |
| Tests | `npm test` via `tsx --test` op `src/lib` |

Publieke marketingroutes komen uit `src/lib/site.ts`: `/`, `/websites`, `/merk`, `/marketingmiddelen`, `/automatisering`, `/werk`, `/werkwijze`, `/over-kopvast`, `/websitecheck`, `/aanvraag`, `/start`, `/maatwerk`, `/contact`, plus privacy, cookies en voorwaarden. Daarnaast: `/admin`, `/klant`, `/scout`, `/voorstel/[token]`, `/domein`, `/inloggen`.

Prijzen in `src/lib/products.ts` zijn bureau-pakketten (o.a. website €1.495 excl. btw). Facturen in de admin zijn aanbetaling en restant voor opdrachten. Er is geen Stripe, Mollie of andere betaalprovider in de dependencies. “Tickets” in de code zijn supporttickets van klanten.

Beelden in `public/images` (`hero.jpg`, `house.jpg`, `venue.jpg`) zijn Unsplash-conceptbeelden, geen bevestigde locatiefoto’s.

## Afwijkingen en ontbrekende invoer

Niet aanwezig in de repo of in de uploads:

- `05_CURSOR_BUILD_BRIEF_V2_1.md` (inclusief STOP-criteria §0 en acceptatiematrix §9)
- `01_Kerklicht_Premium_Prototype.html`

Daardoor is Concept A niet te bouwen zonder het ontwerp, de faseregels en de productfeiten te verzinnen. Dat is verboden.

De opdracht vraagt een redesign **met behoud van het bestaande product** en hergebruik van bestaande bronnen voor shows, capaciteit, prijzen, fases, tickets en checkout. Die bronnen bestaan hier niet. Een Kerklicht-frontend op deze branch zou een nieuw product zijn, geen redesign.

## Besluit

**STOP.** Concept A is niet gestart. Geen branch met UI-wijzigingen, geen preview-deploy, geen migratie, geen mail, geen live-secret, geen merge naar `main`.

Hervatten kan pas als de brief en het prototype er zijn, én als duidelijk is welke repo het bestaande ticketproduct is. Is dat een andere repository, dan hoort het werk dáár. Is de bedoeling toch de publieke Kopvast-site, dan moet de opdracht worden herschreven naar de routes en data die hier wél bestaan.

## Veilige preview, zodra er een GO is

1. Featurebranch `cursor/<onderwerp>-a1e0`, nooit `main`.
2. Alleen lokaal: `npm install` en `npm run dev` (poort 43127). Geen `vercel --prod`.
3. `.env.local` alleen met al aanwezige lokale waarden. `EMAIL_MODE` blijft `TEST`. Geen nieuwe secrets, geen service-role in de client.
4. Geen `supabase`-migraties en geen writes naar productie.
5. Preview-placeholders voor ontbrekende beelden of feiten zichtbaar labelen.
6. Checkout, mailverzending en live data niet nabouwen met demo-JavaScript.

## Wat nog nodig is voor de rest van de opdracht

- De build brief en het HTML-prototype.
- Bevestiging van de juiste repo (Kopvast is dit niet als ticketproduct).
- Echte shows, capaciteit, prijzen, fases en checkoutbronnen, of een expliciet besluit om met gelabelde placeholders te werken.
