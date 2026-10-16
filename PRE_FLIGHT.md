# PRE_FLIGHT — audit tegen brief 2.1

Datum: 16 oktober 2026. Deze agent draait in `Hoevenaars/Kopvast`. De brief beschrijft het ticketproduct KERKLICHT. Dat is een andere repository. Besluit volgens §0.5: **STOP**. Concept A is niet gebouwd.

## 1. Deze checkout

| Feit | Waarde |
| --- | --- |
| Remote | `Hoevenaars/Kopvast` |
| Branch bij audit | `main` |
| Commit | `cbbf602` |
| Working tree | schoon, daarna alleen dit document |
| Stack | Next.js 16.3.5, React 19.2.8, Tailwind CSS 4, Supabase, Resend |
| Dev | `npm run dev` op poort 43127 |
| Deploy | Vercel. Crons: `/api/scout/jobs`, `/api/acquisition/jobs` |

Kopvast is de site en console van een digitaal bureau: marketingroutes, `/admin`, `/klant`, `/scout`, `/voorstel/[token]`. Prijzen in `src/lib/products.ts` zijn bureau-pakketten. Facturen zijn aanbetalingen voor opdrachten. Er is geen Mollie, geen `performances`, geen ticketcheckout. De enige treffer op Persingen is acquisitiecopy over `kerkjepersingen.nl`.

Beelden in `public/images` zijn Unsplash-conceptbeelden, geen kerkfoto’s.

## 2. Wat de brief verwacht, en waar dat wél staat

Read-only bekeken op GitHub, niet gecloned en niet gewijzigd: private repo [Hoevenaars/kerklicht.nl](https://github.com/Hoevenaars/kerklicht.nl).

| Feit | Waarde |
| --- | --- |
| Taal | Astro |
| Tip van `main` | `8bc942a` (11 okt 2026, “Release 2: digitale geschenkverpakking”) |
| Homepage-vermelding | `https://kerklichtnl.vercel.app` |
| Dependencies | `astro` ^5, `@astrojs/vercel` ^8, `@supabase/supabase-js`, `@mollie/api-client`, `resend`, Bodoni Moda, Hanken Grotesk |
| Scripts | `dev`, `build`, `preview`, `check`, `test` |

Aanwezig, passend bij §2 en §3 van de brief:

- Pagina’s: `src/pages/index.astro`, `de-avond.astro`, `praktisch.astro`, `vragen.astro`, `tickets.astro`, `bedankt.astro`, `privacy.astro`, `voorwaarden.astro`, `prive-avonden.astro`
- Componenten: `Header.astro`, `Footer.astro`, `ShowList.astro`, `PriceNote.astro`, `PreviewCheckout.astro`, `GuestlistForm.astro`, `Wordmark.astro`, `Monogram.astro`
- Lib: `settings.ts`, `performances.ts`, `orders.ts`, `mollie.ts`, `mail.ts`, `sales-mode.ts`, `sales-decision.ts`, `auth.ts`, `db.ts`, `gift.ts`
- `supabase/`, `astro.config.mjs`, `.env.example`

Een eerdere commit op die repo zet `SALES_PREVIEW` als Vercel-runtimevlag en houdt bestellen en de gastenlijst dicht. Juridische teksten staan daar als concept-2026-10-10. Die vlag en de echte fase zijn niet in deze Kopvast-checkout gecontroleerd.

## 3. Risicomatrix (deze workspace)

| Keten | Pad hier | Intact laten | Verificatie |
| --- | --- | --- | --- |
| Homepage / UI | `src/app/(marketing)/` | ja, niet aangeraakt | bestandslocaties |
| Showdata, prijs, voorraad, fases | ontbreekt | n.v.t. | geen `performances` of Mollie |
| Bestellen, webhooks, QR, beheer | ontbreekt | n.v.t. | geen order-API |
| Resend | aanvragen, acquisitie, webhook | ja | `EMAIL_MODE=TEST` in voorbeeld-env |
| Privacy / auth | Kopvast-sessies en Scout-allowlist | ja | `.env.example` |

Een redesign in deze repo zou de bureau-site vervangen of een tweede product verzinnen. Beide vallen buiten de brief. Backend, database of betaling wijzigen is niet nodig en niet toegestaan; de juiste code staat elders.

## 4. Ontbrekende ontwerpinvoer

Wel aanwezig: de brief, drie pagina-overzichten (desktop, mobiel, tablet) en twee illustraties (spitsboog, nachtkerk). Die illustraties zijn volgens de brief alleen compositie, geen campagnefoto’s.

Niet aanwezig: `01_Kerklicht_Premium_Prototype.html`. Zonder dat bestand en zonder de kerklicht-repo is de frontend niet te bouwen op bestaande shows, prijzen en checkout.

## 5. Stop en gevraagde beslissing

§0.5: de repo wijkt wezenlijk af van de brief. Geen featurebranch met UI, geen preview, geen migratie, geen mail, geen secret, geen merge, geen productiedeploy.

Beslissing die nodig is: start deze opdracht in `Hoevenaars/kerklicht.nl` op `main` (`8bc942a` of nieuwer na fetch). Lever daar ook het HTML-prototype aan. In Kopvast blijft het bij dit document.

## 6. Veilige preview, pas in de kerklicht-repo

1. Branch `cursor/kerklicht-concept-a-v2-a1e0` vanaf actuele `main`.
2. Alleen frontend: homepage, header, footer, `/de-avond`, `/praktisch`, `/vragen`, tokens en gelabelde placeholders.
3. Niet wijzigen: `supabase/`, `src/pages/api/`, `orders.ts`, `mollie.ts`, `mail.ts`, `auth.ts`, prijs- en faselogica, voorwaarden.
4. Preview zonder productie-Supabase-writes, live Mollie of Resend. Bestaande `SALES_PREVIEW` respecteren.
5. Ontbrekende kerkfoto’s en onbevestigde feiten zichtbaar als placeholder labelen.
