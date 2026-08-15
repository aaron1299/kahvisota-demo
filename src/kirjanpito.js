// Panosten kirjanpito ja tilitys. Kaannos tiedostosta game/scripts/kirjanpito.gd.
//
// Talo ei ole koskaan ottelun osapuoli. Molemmat pelaajat asettavat saman
// panoksen, voittaja saa potin ja talo ottaa siita ennalta ilmoitetun
// komissiopalkkion. Tasapelissa panokset palautetaan kokonaan eika komissiota
// perita, koska taitopelissa tasapeli ei ole kummankaan tappio.
//
// KAIKKI RAHASUMMAT OVAT KOKONAISLUKUJA SENTTEINA. Jos summat olisivat
// kokonaisia krediitteja, komissio katkeaisi kokonaislukujaossa: kahden euron
// potista kahdeksan prosenttia on 16 senttia, joka pyoristyisi nollaan ja talo
// jaisi ilman tuloa pienilla panoksilla.

export const RAKE_PPM_OLETUS = 80000;   // 8,0 % miljoonasosina

// tulos: 0 = sininen voitti, 1 = punainen voitti, 2 = tasapeli
export function tilita(panos, rake_ppm, tulos) {
	const potti = panos * 2;
	if (tulos === 2) {
		return {
			potti,
			rake: 0,
			maksu: [panos, panos],
			peruste: 'tasapeli: panokset palautetaan, ei komissiota',
		};
	}
	// Pyoristys lahimpaan senttiin, ei aina alaspain.
	const rake = Math.trunc((potti * rake_ppm + 500000) / 1000000);
	const maksu = potti - rake;
	const rivi = [0, 0];
	rivi[tulos] = maksu;
	return {
		potti,
		rake,
		maksu: rivi,
		peruste: 'voittaja saa potin komissiolla vahennettyna',
	};
}

// Senttisumma luettavaan muotoon: 1000 -> "10,00" tai "10.00".
export function rahaksi(sentit, erotin = ',') {
	const etumerkki = sentit < 0 ? '-' : '';
	const itseis = Math.abs(sentit);
	return etumerkki + Math.trunc(itseis / 100) + erotin + String(itseis % 100).padStart(2, '0');
}
