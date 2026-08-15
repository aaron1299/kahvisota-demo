// Operaattorirajapinta. Peli ajetaan kasinon sivulla kehyksessa, ja
// yhteydenpito hoidetaan postMessage-viesteilla. Rajapinta on sama kuin
// aiemmassa toteutuksessa, joten kasinon puolelle kirjoitettu koodi kelpaa
// sellaisenaan.
//
// Ulos:
//   { source: "kahvisota", type: "ready",          version, locale, balance }
//   { source: "kahvisota", type: "round_start",    roundId, stake, mode }
//   { source: "kahvisota", type: "round_end",      roundId, result, payout, checksum, replayId }
//   { source: "kahvisota", type: "balance_update", balance }
//   { source: "kahvisota", type: "session_time",   minutes }
//   { source: "kahvisota", type: "lobby_exit" }
//
// Sisaan:
//   { type: "set_locale", locale: "fi" | "en" }
//   { type: "set_balance", balance: <sentteina> }
//   { type: "set_muted",  muted: true | false }
//   { type: "open_lobby" }

export const VERSIO = '0.4.0';

let kasittelija = null;

export function kuuntele(fn) {
	kasittelija = fn;
	window.addEventListener('message', (e) => {
		const data = e.data;
		if (!data || typeof data !== 'object' || !data.type) return;
		if (data.source === 'kahvisota') return;   // omat viestit takaisin
		kasittelija(String(data.type), data);
	});
}

export function laheta(tyyppi, sisalto = {}) {
	const viesti = Object.assign({ source: 'kahvisota', type: tyyppi, version: VERSIO }, sisalto);
	try {
		window.parent.postMessage(viesti, '*');
	} catch (e) { /* kehysta ei ole, ei haittaa */ }
	// Testit ja esittelysivu lukevat taman.
	window.kahvisotaViimeisin = viesti;
}

// Ottelutunnus. Ei arvontaa: aika ja jarjestysnumero riittavat, ja tunnus
// kirjataan myos toistotiedostoon, joten ottelun voi jalkikateen osoittaa.
let juokseva = 0;
export function uusiTunnus() {
	juokseva += 1;
	const aika = Date.now().toString(36).toUpperCase().slice(-6);
	return 'KS-' + aika + '-' + String(juokseva).padStart(3, '0');
}
