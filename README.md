# Kopvast

Publieke website voor **Kopvast** — scherp denken, sterk uitvoeren.

Kopvast helpt ondernemers en organisaties sterker naar buiten te komen met websites, merkidentiteit en marketingmiddelen. Duidelijke pakketten waar het kan. Maatwerk waar het nodig is.

## Wat erin zit

- Merkpagina’s: home, websites, merk, marketingmiddelen, werk, werkwijze, over Kopvast
- Twee aanvraagroutes: vast websitepakket en maatwerk
- Websitecheck: veilige homepage-check met maximaal drie aandachtspunten
- Conceptcases tot echte klantcases beschikbaar zijn
- Leads worden eerst opgeslagen, daarna bevestigd via Resend
- Webhook voor delivered / bounced / failed
- Mijn Kopvast (`/klant`) voor website, merk, bestanden en wijzigingsverzoeken
- Admin Console (`/admin`) voor acquisitie, aanvragen, klanten en mail

Testprijzen (excl. btw): Kopvast Website €1.495 eenmalig, Kopvast Beheer €199 per maand.

Acquisitie start leeg. Onder `/admin/instellingen` zet je LIVE aan (typ `LIVE`) of haal je de omgeving leeg (typ `LEEGMAKEN`). Testmail blijft intern, ook in LIVE.

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
| `RESEND_FROM_EMAIL` | Geverifieerde afzender. Standaard `Kopvast <contact@kopvast.nl>`. Niet de Resend-sandbox gebruiken. |
| `CONTACT_TO_EMAIL` | Ontvangstadres voor aanvragen, standaard `contact@kopvast.nl`. |
| `RESEND_WEBHOOK_SECRET` | Controleert Resend-webhooks op `/api/resend/webhook`. |
| `KOPVAST_SESSION_SECRET` | Tekent inlogsessies voor `/klant` en `/admin`. In productie verplicht als er geen service-role is. |
| `KOPVAST_ADMIN_EMAILS` | Kommagescheiden adminadressen. Adressen op `@kopvast.nl` zijn altijd admin. |
| `OPENAI_API_KEY` | Optioneel. Zonder sleutel wordt de URL wel opgeslagen, maar draait de AI niet. |
| `EMAIL_MODE` | Lokaal: `TEST` (standaard) of `LIVE`. Buiten productie blijft verzending TEST, tenzij je hier expliciet `LIVE` zet. In productie wint Admin → Instellingen. |
| `EMAIL_TEST_ADDRESS` | Intern testadres voor de knop Testmail, standaard `contact@kopvast.nl`. |

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
3. **E-mail** — de TransIP-mailbox `contact@kopvast.nl` is voor gewone post. Aanvraagformulieren gaan via Resend. In [resend.com/domains](https://resend.com/domains) moet `kopvast.nl` op **Verified** staan. Maak een API-key op [resend.com/api-keys](https://resend.com/api-keys). Zet in Vercel (Production) en deploy daarna opnieuw:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL="Kopvast <contact@kopvast.nl>"`
   - `CONTACT_TO_EMAIL=contact@kopvast.nl`
   Zet een webhook naar `/api/resend/webhook` voor delivered, bounced en failed. MX blijft `mx.transip.email`; Resend gebruikt alleen `send` / `rsend` voor uitgaande post.
4. **Naam** — voer Kopvast in de [KVK/BOIP Naamchecker](https://www.kvk.nl/starten/naamchecker/tool/). Let op gelijkende namen: [Klikvast](https://klikvast.com/) (websites/marketing) en Koopvast B.V. (andere spelling, vastgoed). Dit is geen juridisch advies.
5. **Voorwaarden** — laat AV, privacy en orderbevestiging door een jurist toetsen vóór betalende verkoop.
6. **Website Refresh** — de publieke check op `/websitecheck` en een aanvraag met website worden intern opgeslagen in het Supabase-project **Website Refresh**. Aanvraag- en maatwerkformulieren landen in `inbound_leads`, ook zonder website. Zet in Vercel:
   - `WEBSITE_REFRESH_SUPABASE_URL`
   - `WEBSITE_REFRESH_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY` (anders wordt alleen de URL + homepage-feiten bewaard, zonder interne score)

   De bezoeker ziet nog steeds alleen de drie feiten/observaties. De interne analyse draait daarna op de server. Dezelfde URL wordt binnen 24 uur niet opnieuw intern geanalyseerd.
7. **Consoles** — `/inloggen` werkt met e-mail + wachtwoord. Wachtwoorden staan als scrypt-hash in `kopvast_credentials` (of lokaal in `/tmp` zonder service-role). Lukt het wachtwoord niet, dan sturen we een zescijferige code via Resend. Wachtwoord vergeten gaat via `/inloggen/wachtwoord` met dezelfde code. In Instellingen kun je een wachtwoord zetten of wijzigen; andere sessies vervallen dan. Lokaal toont het inlogscherm de code als er geen mail wordt verstuurd. Zet `KOPVAST_SESSION_SECRET` en eventueel extra adminadressen. Een gewonnen aanvraag zet je in `/admin` om naar een klant; die persoon kan daarna `/klant` openen. In `/admin/gebruikers` zet je per gebruiker toegang tot Mijn Kopvast aan of uit.

## Beeld

Locatie- en sfeerbeelden in `public/images` komen van Unsplash (Unsplash License). Ze worden gebruikt als beeld in conceptcases, niet als klantportretten of AI-gegenereerde personen.
