import assert from "node:assert/strict";
import test from "node:test";
import { parseProspectImportText } from "./acquisition-import";

const LIST = `Websites koud mailen

Naam website	E-mail
Pizzaria Leuth	cemalcanbulat57@gmail.com
Loopgroepooijpolder 
	info@loopgroepooijpolder.nl
Henkbaron.nl
	info@henkbaron.nl
Ploegdriever.nl
	info@ploegdriever.nl 
Vierhetlandschap.nl
	info@vierhetlandschap.nl
Vianatura.nl
	secretariaat@vianatura.nl

	
Oortjeshekken.nl
	info@oortjeshekken.nl
Derozet.media
	 redactie@derozet.media
Waardvankekerdom.nl
	waardvankekerdom@gmail.com
Bbchethoekje.nl
	info@bbchethoekje.nl
Vrijheidsmuseum.nl
	welkom@vrijheidsmuseum.nl
Dorpshuisdesprong.nl
	info@dorpshuisdesprong.nl
Rijschoolericvandervelden.nl 	info@rijschoolericvandervelden.nl 
Brasseriecharley.nl	info@brasseriecharley.nl
dethornschemolen.nl	info@dethornschemolen.nl
Kulturhusbeek.nl 	info@kulturhusbeek.nl
byevestudio.com	Info@byevestudio.com
floorpieper.nl	0657596681
Baarsfietsen.nl	info@baarsfietsen.nl
www.mariusdhzmarkt.nl	info@mariusdhzmarkt.nl
www.vioollesnijmegen.nl	guido@vioollesnijmegen.nl
daadnotarissen.nl	info@daadnotarissen.nl
targetpt.nl	 info@targetpt.nl
nenini.nl	info@nenini.nl
dasenboom.nl	info@dasenboom.nl
strandpaviljoendushi.nl	info@strandpaviljoendushi.nl
www.duivelsberg.nl	 info@duivelsberg.nl
kerstendal.nl	info@kerstendal.nl
bloemenvanmoniek.nl	 info@bloemenvanmoniek.nl
www.kringloop-groesbeek.eu	kringloopgbk@hotmail.nl 
groesbeekairbornevrienden.nl	info@groesbeekairbornevrienden.nl
stbouw.nu 	stan@stbouw.nu
www.ijssalonpassione.nl	info@ijssalonpassione.nl
panoramaberggroesbeek.nl	panoramaberg@live.nl
fotokunstig.nl	 info@fotokunstig.nl
makanistudio.com	studio@makanistudio.com
www.uitvaartcentrumsion.nl	info@uitvaartcentrumsion.nl
www.schietverenigingrobinhood.nl	svrobinhoodgroesbeek@live.nl
snackbarhans.nl	info@snackbarhans.nl
topdakwerken.nl	info@topdakwerken.nl
www.djhen.nl	info@djhen.nl
bjoetie4u.nl	fredie@bjoetie4u.nl 
loonbedrijfgroesbeek.nl	j.albers@loonbedrijfgroesbeek.com
garagederen.nl	info@garagederen.nl
www.schoonmaakorganisatiewouters.nl	info@wouters-groesbeek.nl
Fakro.nl	info@fakronederland.nl
zandri.nl	 info@zandri.nl
www.schmidt-trucks.com	info@schmidt-trucks.com
Bloemisterijhetmolentje.nl 	info@bloemisterijhetmolentje.nl
Computergrei.nl 	info@computergrei.nl
www.alexjoostenpersonaltraining.nl	alexjoostenpt@gmail.com
Apkvitaal.nl	info@apkvitaal.nl
Ballonunique.com	Mail?`;

test("leest een koude lijst met tabs, gesplitste regels en ontbrekende mail", () => {
  const parsed = parseProspectImportText(LIST);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.rows.length, 53);

  const pizza = parsed.rows.find((row) => row.email === "cemalcanbulat57@gmail.com");
  assert.ok(pizza);
  assert.equal(pizza.website, "cafetarialeuth.nl");
  assert.equal(pizza.company, "Pizzaria Leuth");

  const loopgroep = parsed.rows.find((row) => row.email === "info@loopgroepooijpolder.nl");
  assert.ok(loopgroep);
  assert.equal(loopgroep.website, "loopgroepooijpolder.nl");

  const henk = parsed.rows.find((row) => row.email === "info@henkbaron.nl");
  assert.ok(henk);
  assert.equal(henk.website, "Henkbaron.nl");

  const floor = parsed.rows.find((row) => row.website.toLowerCase() === "floorpieper.nl");
  assert.ok(floor);
  assert.equal(floor.email, null);
  assert.equal(floor.phone, "0657596681");
  assert.match(floor.notes ?? "", /0657596681/);

  const byeve = parsed.rows.find((row) => row.website.toLowerCase() === "byevestudio.com");
  assert.ok(byeve);
  assert.equal(byeve.email, "info@byevestudio.com");

  const ballon = parsed.rows.find((row) => row.website.toLowerCase() === "ballonunique.com");
  assert.ok(ballon);
  assert.equal(ballon.email, null);
  assert.match(ballon.notes ?? "", /Geen e-mailadres/);
});

test("negeert kopregels en houdt unieke websites over", () => {
  const parsed = parseProspectImportText(`Naam website\tE-mail
henkbaron.nl\tinfo@henkbaron.nl
www.henkbaron.nl\tinfo@henkbaron.nl`);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.errors.length, 1);
});
