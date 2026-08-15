// Kahvisota, selainversio. Pelin runko: valikot, ottelu, toisto, piirtosilmukka
// ja syote. Simulaatio on erillaan tasta tiedostosta, eika tama koskaan muuta
// pelitilaa muuten kuin syotteiden kautta.

import { Sim, replay as toistaLoki, TPS, KIND_UNIT, KIND_BUILDING, KIND_PROJECTILE,
	RESULT_TASAPELI, COFFEE_MAX } from './sim.js';
import { Bot } from './bot.js';
import * as Cards from './cards.js';
import * as Kieli from './kieli.js';
import * as Piirto from './piirto.js';
import * as Aani from './aani.js';
import * as Operaattori from './operaattori.js';
import { Verkko, palvelimenOsoite } from './verkko.js';
import { rahaksi, RAKE_PPM_OLETUS } from './kirjanpito.js';

const kanvaasi = document.getElementById('peli');
const ctx = kanvaasi.getContext('2d');
const valikko = document.getElementById('valikko');

const TOISTOAVAIN = 'kahvisota_viimeisin_toisto';
const ASETUSAVAIN = 'kahvisota_asetukset';
const MUISTUTUSVALI = 20 * 60 * 1000;

Kieli.valitseKieli();

let pohja = null;
let hahmot = null;
let skaala = 1;
let siirtoX = 0;
let siirtoY = 0;

function mitoita() {
	const dpr = Math.min(window.devicePixelRatio || 1, 3);
	const w = Math.round(kanvaasi.clientWidth * dpr);
	const h = Math.round(kanvaasi.clientHeight * dpr);
	if (w < 2 || h < 2) return;
	// Koon asettaminen tyhjentaa kanvaasin, joten se tehdaan vain kun koko
	// oikeasti muuttuu.
	if (kanvaasi.width !== w || kanvaasi.height !== h) {
		kanvaasi.width = w;
		kanvaasi.height = h;
	}
	skaala = Math.min(kanvaasi.width / Piirto.LEVEYS, kanvaasi.height / Piirto.KORKEUS);
	siirtoX = (kanvaasi.width - Piirto.LEVEYS * skaala) / 2;
	siirtoY = (kanvaasi.height - Piirto.KORKEUS * skaala) / 2;
}
window.addEventListener('resize', mitoita);

// ---- pelitila ---------------------------------------------------------------

const peli = {
	tila: 'valikko',        // valikko | sivu | ottelu | toisto | tulos
	sim: null,
	botti: null,
	oma: 0,
	valittu: -1,
	kertyma: 0,
	aika: 0,
	tunnus: '',
	viesti: '',
	viestiAsti: 0,
	saldo: 10000,           // sentteina, vain esittelya varten
	sessioAlku: Date.now(),
	muistutuksia: 0,
	lisaaikaSoi: false,
	// verkko-ottelu
	verkko: null,
	verkkoOttelu: false,
	panos: 0,
	// toisto
	toisto: null,
	toistoLoppu: 0,
	toistoTauko: false,
	toistoNopeus: 1,
	toistoOdotettu: 0,
};

const jono = [];

function lataaAsetukset() {
	try {
		const a = JSON.parse(localStorage.getItem(ASETUSAVAIN) || '{}');
		if (a.mykka) Aani.asetaMykka(true);
		if (a.kieli) Kieli.aseta(a.kieli);
	} catch (e) { /* ensimmainen kaynnistys */ }
}

function tallennaAsetukset() {
	try {
		localStorage.setItem(ASETUSAVAIN, JSON.stringify({ mykka: Aani.onMykka(), kieli: Kieli.kieli }));
	} catch (e) { /* yksityinen tila */ }
}

// ---- ottelu -----------------------------------------------------------------

function aloitaHarjoitus(vaste) {
	peli.sim = new Sim();
	peli.botti = new Bot(1);
	peli.botti.reaction_ticks = vaste;
	peli.oma = 0;
	peli.valittu = -1;
	peli.kertyma = 0;
	peli.lisaaikaSoi = false;
	peli.tunnus = Operaattori.uusiTunnus();
	peli.tila = 'ottelu';
	peli.viesti = Kieli.t('vinkki');
	peli.viestiAsti = performance.now() + 4000;
	jono.length = 0;
	naytaValikko(false);
	Aani.asetaTila('ottelu');
	Operaattori.laheta('round_start', { roundId: peli.tunnus, stake: 0, mode: 'practice' });
}

function ottelunLoppu() {
	const s = peli.sim;
	const summa = s.stateHash();
	tallennaToisto(s, summa);
	Aani.asetaTila('valikko');
	const voitto = s.result === peli.oma;
	Aani.soita(voitto ? 'voitto' : 'tappio');
	if (voitto) Aani.soitaTunnus(1.12);
	Operaattori.laheta('round_end', {
		roundId: peli.tunnus,
		result: s.result,
		payout: 0,
		checksum: summa,
		replayId: 'viimeisin',
	});
	tulosnaytto(summa);
}

function tallennaToisto(s, summa) {
	try {
		localStorage.setItem(TOISTOAVAIN, JSON.stringify({
			ottelu: peli.tunnus,
			aika: new Date().toISOString(),
			tikkeja: s.tick,
			tulos: s.result,
			kaadot: s.kaadot,
			puoli: peli.oma,
			tarkistussumma: summa,
			syotteet: s.input_log,
		}));
	} catch (e) { /* tila loppu, ei esta pelaamista */ }
}

// ---- valikot (HTML, ei kanvaasilla) ----------------------------------------

function nappi(teksti, toiminto, korostus = false) {
	const b = document.createElement('button');
	b.textContent = teksti;
	if (korostus) b.className = 'korostus';
	b.addEventListener('click', toiminto);
	return b;
}

function naytaValikko(nakyy) {
	valikko.style.display = nakyy ? 'flex' : 'none';
}

function valikkoJuuri() {
	valikko.innerHTML = '';
	naytaValikko(true);
	const laatikko = document.createElement('div');
	laatikko.className = 'laatikko';
	valikko.appendChild(laatikko);
	return laatikko;
}

function raha(sentit) {
	return (sentit / 100).toFixed(2).replace('.', Kieli.kieli === 'fi' ? ',' : '.');
}

function paavalikko() {
	peli.tila = 'valikko';
	peli.sim = null;
	Aani.asetaTila('valikko');
	const l = valikkoJuuri();
	const h = document.createElement('h1');
	h.textContent = Kieli.t('otsikko');
	l.appendChild(h);
	const p = document.createElement('p');
	p.textContent = Kieli.t('tagline');
	l.appendChild(p);
	const s = document.createElement('p');
	s.className = 'saldo';
	s.textContent = Kieli.t('saldo', [raha(peli.saldo)]);
	l.appendChild(s);
	l.appendChild(nappi(Kieli.t('harjoitus'), tasovalikko, true));
	l.appendChild(nappi(Kieli.t('panos'), panosvalikko));
	if (localStorage.getItem(TOISTOAVAIN)) l.appendChild(nappi(Kieli.t('toisto'), avaaToisto));
	l.appendChild(nappi(Kieli.t('taito_otsikko'), () => sivu(Kieli.t('taito_otsikko'), Kieli.t('taito_teksti'))));
	l.appendChild(nappi(Kieli.t('saannot'), saantovalikko));
	l.appendChild(nappi(Kieli.t('vastuu'), () => sivu(Kieli.t('vastuu'), Kieli.t('vastuu_teksti'))));

	const alapalkki = document.createElement('div');
	alapalkki.className = 'alapalkki';
	alapalkki.appendChild(nappi(Aani.onMykka() ? Kieli.t('aanet_pois') : Kieli.t('aanet_paalla'), () => {
		Aani.asetaMykka(!Aani.onMykka());
		tallennaAsetukset();
		paavalikko();
	}));
	alapalkki.appendChild(nappi(Kieli.kieli === 'fi' ? 'In English' : 'Suomeksi', () => {
		Kieli.aseta(Kieli.kieli === 'fi' ? 'en' : 'fi');
		tallennaAsetukset();
		paavalikko();
	}));
	l.appendChild(alapalkki);
	const ika = document.createElement('div');
	ika.className = 'ika';
	ika.textContent = Kieli.t('ika', [Operaattori.VERSIO]);
	l.appendChild(ika);
}

function tasovalikko() {
	peli.tila = 'sivu';
	const l = valikkoJuuri();
	const h = document.createElement('h2');
	h.textContent = Kieli.t('taso_otsikko');
	l.appendChild(h);
	const tasot = [[Kieli.t('taso_helppo'), 36], [Kieli.t('taso_normaali'), 15], [Kieli.t('taso_kova'), 6]];
	for (const [nimi, vaste] of tasot) {
		const teksti = nimi + '  (' + Kieli.t('taso_vaste', [(vaste / TPS).toFixed(1).replace('.', ',')]) + ')';
		l.appendChild(nappi(teksti, () => aloitaHarjoitus(vaste), vaste === 15));
	}
	l.appendChild(nappi(Kieli.t('takaisin'), paavalikko));
}

// ---- panosottelu ------------------------------------------------------------

function panosvalikko() {
	if (!palvelimenOsoite()) {
		sivu(Kieli.t('panos'), Kieli.t('ei_palvelinta'));
		return;
	}
	peli.tila = 'sivu';
	const l = valikkoJuuri();
	const h = document.createElement('h2');
	h.textContent = Kieli.t('panos_otsikko');
	l.appendChild(h);
	const p = document.createElement('p');
	p.className = 'leipa';
	p.textContent = Kieli.t('panos_komissio', [(RAKE_PPM_OLETUS / 10000).toFixed(1).replace('.', ',')]);
	l.appendChild(p);
	for (const panos of [100, 500, 2000]) {
		l.appendChild(nappi(Kieli.t('panos_rivi', [rahaksi(panos, Kieli.kieli === 'fi' ? ',' : '.')]),
			() => liitaJonoon(panos), panos === 500));
	}
	l.appendChild(nappi(Kieli.t('takaisin'), paavalikko));
}

function liitaJonoon(panos) {
	peli.tila = 'sivu';
	const l = valikkoJuuri();
	const h = document.createElement('h2');
	h.textContent = Kieli.t('jono_etsitaan');
	l.appendChild(h);
	const tila = document.createElement('p');
	tila.className = 'leipa';
	tila.textContent = Kieli.t('panos_rivi', [rahaksi(panos, Kieli.kieli === 'fi' ? ',' : '.')]);
	l.appendChild(tila);
	l.appendChild(nappi(Kieli.t('jono_peru'), () => {
		if (peli.verkko) peli.verkko.katkaise();
		peli.verkko = null;
		paavalikko();
	}));

	peli.verkko = new Verkko({
		jono: (teksti) => { tila.textContent = teksti; },
		alku: (v) => aloitaVerkkoOttelu(v),
		tikki: (tick, syotteet) => {
			if (peli.tila !== 'ottelu' || !peli.sim) return;
			peli.sim.step(syotteet);
			aanetTapahtumista(peli.sim);
			if (peli.sim.overtime && !peli.lisaaikaSoi) {
				peli.lisaaikaSoi = true;
				Aani.asetaTila('lisaaika');
			}
		},
		summapyynto: () => {
			if (peli.sim && peli.verkko) peli.verkko.summa(peli.sim.tick, peli.sim.stateHash());
		},
		loppu: (v) => verkkoOtteluLoppui(v),
		virhe: (syy) => {
			peli.verkko = null;
			sivu(Kieli.t('panos'), syy === 'ei_palvelinta' ? Kieli.t('ei_palvelinta') : Kieli.t('yhteys_katkesi'));
		},
		katkesi: () => {
			if (peli.tila === 'ottelu' && peli.verkkoOttelu) {
				peli.verkko = null;
				sivu(Kieli.t('panos'), Kieli.t('yhteys_katkesi'));
			}
		},
	});
	peli.verkko.yhdista(panos);
}

function aloitaVerkkoOttelu(v) {
	peli.sim = new Sim();
	peli.botti = null;
	peli.oma = v.puoli;
	peli.valittu = -1;
	peli.kertyma = 0;
	peli.lisaaikaSoi = false;
	peli.tunnus = v.tunnus;
	peli.panos = v.panos;
	peli.verkkoOttelu = true;
	peli.tila = 'ottelu';
	jono.length = 0;
	naytaValikko(false);
	Aani.asetaTila('ottelu');
	Operaattori.laheta('round_start', { roundId: v.tunnus, stake: v.panos, mode: 'stake' });
}

function verkkoOtteluLoppui(v) {
	const s = peli.sim;
	peli.verkkoOttelu = false;
	tallennaToisto(s, v.checksum);
	peli.saldo += v.maksu - peli.panos;
	Aani.asetaTila('valikko');
	const voitto = v.tulos === peli.oma;
	Aani.soita(voitto ? 'voitto' : 'tappio');
	if (voitto) Aani.soitaTunnus(1.12);
	Operaattori.laheta('round_end', {
		roundId: v.tunnus, result: v.tulos, payout: v.maksu,
		checksum: v.checksum, replayId: 'viimeisin',
	});
	Operaattori.laheta('balance_update', { balance: peli.saldo });
	if (peli.verkko) peli.verkko.katkaise();
	peli.verkko = null;

	const l = valikkoJuuri();
	const h = document.createElement('h2');
	if (v.tulos === RESULT_TASAPELI) h.textContent = Kieli.t('tasapeli');
	else h.textContent = voitto ? Kieli.t('voitto') : Kieli.t('tappio');
	l.appendChild(h);
	const erotin = Kieli.kieli === 'fi' ? ',' : '.';
	const tiedot = document.createElement('p');
	tiedot.className = 'leipa';
	tiedot.textContent = Kieli.t('tilitys', [rahaksi(v.potti, erotin), rahaksi(v.rake, erotin), rahaksi(v.maksu, erotin)])
		+ '\n' + Kieli.t('kaadot', [s.kaadot[peli.oma], s.kaadot[1 - peli.oma]])
		+ '\n' + Kieli.t('tunnus', [v.tunnus])
		+ '\n' + Kieli.t('summa', [v.checksum]);
	l.appendChild(tiedot);
	l.appendChild(nappi(Kieli.t('toisto'), avaaToisto));
	l.appendChild(nappi(Kieli.t('valikkoon'), paavalikko));
	peli.tila = 'tulos';
}

function sivu(otsikko, teksti) {
	peli.tila = 'sivu';
	const l = valikkoJuuri();
	const h = document.createElement('h2');
	h.textContent = otsikko;
	l.appendChild(h);
	for (const kappale of String(teksti).split('\n\n')) {
		const p = document.createElement('p');
		p.className = 'leipa';
		p.textContent = kappale;
		l.appendChild(p);
	}
	l.appendChild(nappi(Kieli.t('takaisin'), paavalikko));
}

function saantovalikko() {
	peli.tila = 'sivu';
	const l = valikkoJuuri();
	const h = document.createElement('h2');
	h.textContent = Kieli.t('saannot');
	l.appendChild(h);
	for (const kappale of Kieli.t('saannot_teksti').split('\n\n')) {
		const p = document.createElement('p');
		p.className = 'leipa';
		p.textContent = kappale;
		l.appendChild(p);
	}
	const taulu = document.createElement('div');
	taulu.className = 'kortit';
	for (const avain of Cards.ORDER) {
		const c = Cards.CARDS[avain];
		const rivi = document.createElement('div');
		rivi.className = 'korttirivi';
		const nimi = document.createElement('b');
		nimi.textContent = Kieli.kieli === 'fi' ? c.nimi : c.nimi_en;
		const hinta = document.createElement('span');
		hinta.textContent = c.cost + ' ☕';
		rivi.appendChild(nimi);
		rivi.appendChild(hinta);
		taulu.appendChild(rivi);
	}
	l.appendChild(taulu);
	l.appendChild(nappi(Kieli.t('takaisin'), paavalikko));
}

function tulosnaytto(summa) {
	const s = peli.sim;
	const l = valikkoJuuri();
	const h = document.createElement('h2');
	if (s.result === RESULT_TASAPELI) h.textContent = Kieli.t('tasapeli');
	else h.textContent = s.result === peli.oma ? Kieli.t('voitto') : Kieli.t('tappio');
	l.appendChild(h);
	const tiedot = document.createElement('p');
	tiedot.className = 'leipa';
	tiedot.textContent = Kieli.t('kaadot', [s.kaadot[peli.oma], s.kaadot[1 - peli.oma]])
		+ '\n' + Kieli.t('tunnus', [peli.tunnus])
		+ '\n' + Kieli.t('summa', [summa]);
	l.appendChild(tiedot);
	l.appendChild(nappi(Kieli.t('toisto'), avaaToisto));
	l.appendChild(nappi(Kieli.t('uusi'), tasovalikko, true));
	l.appendChild(nappi(Kieli.t('valikkoon'), () => {
		Operaattori.laheta('lobby_exit', {});
		paavalikko();
	}));
	peli.tila = 'tulos';
}

// ---- toisto -----------------------------------------------------------------

function avaaToisto() {
	let data = null;
	try {
		data = JSON.parse(localStorage.getItem(TOISTOAVAIN) || 'null');
	} catch (e) { data = null; }
	if (!data) {
		sivu(Kieli.t('toisto'), Kieli.t('toisto_ei'));
		return;
	}
	peli.toisto = new Map();
	for (const rivi of data.syotteet) {
		if (!peli.toisto.has(rivi.tick)) peli.toisto.set(rivi.tick, []);
		peli.toisto.get(rivi.tick).push(rivi);
	}
	peli.sim = new Sim();
	peli.oma = Number(data.puoli) || 0;
	peli.toistoLoppu = Number(data.tikkeja);
	peli.toistoOdotettu = Number(data.tarkistussumma);
	peli.toistoTauko = false;
	peli.toistoNopeus = 1;
	peli.kertyma = 0;
	peli.tila = 'toisto';
	peli.valittu = -1;
	naytaValikko(false);
	Aani.asetaTila('ottelu');
}

// Tarkistus ajetaan selaimessa: sama syoteloki ajetaan uudelleen ja summa
// lasketaan alusta. Tama on se todiste, jonka kuka tahansa voi tehda itse.
function tarkistaToisto() {
	let data = null;
	try {
		data = JSON.parse(localStorage.getItem(TOISTOAVAIN) || 'null');
	} catch (e) { data = null; }
	if (!data) return null;
	const s = toistaLoki(data.syotteet, Number(data.tikkeja));
	return { saatu: s.stateHash(), odotettu: Number(data.tarkistussumma) };
}

function toistoValmis() {
	const tulos = tarkistaToisto();
	const l = valikkoJuuri();
	const h = document.createElement('h2');
	h.textContent = Kieli.t('toisto');
	l.appendChild(h);
	const p = document.createElement('p');
	p.className = 'leipa';
	if (tulos && tulos.saatu === tulos.odotettu) {
		p.textContent = Kieli.t('toisto_vahvistettu') + '\n' + Kieli.t('summa', [tulos.saatu]);
	} else if (tulos) {
		p.textContent = Kieli.t('toisto_ristiriita') + '\n' + tulos.saatu + ' / ' + tulos.odotettu;
	}
	l.appendChild(p);
	l.appendChild(nappi(Kieli.t('lataa_toisto'), lataaToistotiedosto));
	l.appendChild(nappi(Kieli.t('valikkoon'), paavalikko));
	peli.tila = 'tulos';
}

function lataaToistotiedosto() {
	const teksti = localStorage.getItem(TOISTOAVAIN) || '{}';
	const linkki = document.createElement('a');
	linkki.href = URL.createObjectURL(new Blob([teksti], { type: 'application/json' }));
	linkki.download = 'kahvisota-toisto.json';
	linkki.click();
	URL.revokeObjectURL(linkki.href);
}

// ---- vastuullisuus ----------------------------------------------------------

function tarkistaMuistutus() {
	const minuutit = Math.floor((Date.now() - peli.sessioAlku) / 60000);
	if (minuutit < (peli.muistutuksia + 1) * 20) return;
	peli.muistutuksia += 1;
	Operaattori.laheta('session_time', { minutes: minuutit });
	const oliOttelussa = peli.tila === 'ottelu';
	peli.tila = 'sivu';
	const l = valikkoJuuri();
	const h = document.createElement('h2');
	h.textContent = Kieli.t('muistutus_otsikko');
	l.appendChild(h);
	const p = document.createElement('p');
	p.className = 'leipa';
	p.textContent = Kieli.t('muistutus_teksti', [minuutit]);
	l.appendChild(p);
	l.appendChild(nappi(Kieli.t('jatka'), () => {
		naytaValikko(false);
		peli.tila = oliOttelussa ? 'ottelu' : 'valikko';
		if (!oliOttelussa) paavalikko();
	}, true));
	Aani.soita('varoitus');
}

// ---- syote ------------------------------------------------------------------

function paikka(tapahtuma) {
	const r = kanvaasi.getBoundingClientRect();
	const x = ((tapahtuma.clientX - r.left) * (kanvaasi.width / r.width) - siirtoX) / skaala;
	const y = ((tapahtuma.clientY - r.top) * (kanvaasi.height / r.height) - siirtoY) / skaala;
	return [x, y];
}

function korttiRect(i) {
	const w = 168, h = 82, x0 = 8, y0 = 1074, vali = 8;
	return [x0 + (i % 4) * (w + vali), y0 + Math.floor(i / 4) * (h + vali), w, h];
}

// Aanijarjestelma herataan vasta kayttajan eleesta, koska iOS vaatii sen.
function heraaAani() {
	Aani.kaynnista();
	Aani.asetaTila(peli.tila === 'ottelu' || peli.tila === 'toisto' ? 'ottelu' : 'valikko');
}
document.addEventListener('pointerdown', heraaAani, { once: true });

kanvaasi.addEventListener('pointerdown', (e) => {
	if (peli.tila === 'toisto') {
		e.preventDefault();
		const [, ty] = paikka(e);
		if (ty >= 1040) toistoValmis();
		else peli.toistoTauko = !peli.toistoTauko;
		return;
	}
	if (peli.tila !== 'ottelu') return;
	e.preventDefault();
	const [x, y] = paikka(e);
	if (y >= 1040) {
		for (let i = 0; i < Cards.ORDER.length; i++) {
			const [rx, ry, rw, rh] = korttiRect(i);
			if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) {
				peli.valittu = peli.valittu === i ? -1 : i;
				Aani.soita('kahvi', 1.2);
				return;
			}
		}
		return;
	}
	if (peli.valittu < 0) {
		peli.viesti = Kieli.t('vinkki');
		peli.viestiAsti = performance.now() + 2500;
		return;
	}
	const avain = Cards.ORDER[peli.valittu];
	const sx = Math.round(x * Piirto.U);
	const sy = Math.round(y * Piirto.U);
	if (peli.sim.canDeploy(peli.oma, avain, sx, sy)) {
		if (peli.verkkoOttelu && peli.verkko) {
			// Palvelin paattaa mihin tikkiin syote osuu, joten sita ei
			// koskaan ajeta paikallisesti etukateen.
			peli.verkko.syote(avain, sx, sy);
			Aani.soita('kahvi');
		} else {
			jono.push({ team: peli.oma, card: avain, x: sx, y: sy });
		}
		peli.valittu = -1;
	} else {
		Aani.soita('varoitus', 1.4);
		peli.viesti = Kieli.t('vinkki');
		peli.viestiAsti = performance.now() + 2000;
	}
}, { passive: false });

// ---- silmukka ---------------------------------------------------------------

let edellinen = performance.now();

function aanetTapahtumista(s) {
	for (const f of s.fx) {
		if (f.laji === 'loitsu') Aani.soita('loitsu');
		else if (f.laji === 'isku') Aani.soita('isku');
		else if (f.laji === 'osuma') Aani.soita('osuma');
		else if (f.laji === 'torni') Aani.soita('torni');
	}
}

function askel(nyt) {
	const dt = Math.min((nyt - edellinen) / 1000, 0.25);
	edellinen = nyt;
	peli.aika += dt;

	if (peli.tila === 'ottelu' && peli.sim && peli.verkkoOttelu) {
		// Verkko-ottelussa palvelin tahdittaa: simulaatio etenee vain
		// palvelimen lahettamien tikkien mukana, jolloin molemmat pelaajat
		// ovat aina samassa tilassa.
		tarkistaMuistutus();
	} else if (peli.tila === 'ottelu' && peli.sim) {
		peli.kertyma += dt;
		let turva = 0;
		while (peli.kertyma >= 1 / TPS && turva < 8) {
			peli.kertyma -= 1 / TPS;
			turva += 1;
			const syotteet = [];
			while (jono.length) {
				syotteet.push(jono.shift());
				Aani.soita('asetus');
			}
			const botti = peli.botti.decide(peli.sim);
			if (botti) syotteet.push(botti);
			peli.sim.step(syotteet);
			aanetTapahtumista(peli.sim);
			if (peli.sim.overtime && !peli.lisaaikaSoi) {
				peli.lisaaikaSoi = true;
				Aani.asetaTila('lisaaika');
			}
			if (peli.sim.over) {
				ottelunLoppu();
				break;
			}
		}
		tarkistaMuistutus();
	} else if (peli.tila === 'toisto' && peli.sim) {
		if (!peli.toistoTauko) {
			peli.kertyma += dt * peli.toistoNopeus;
			let turva = 0;
			while (peli.kertyma >= 1 / TPS && turva < 8) {
				peli.kertyma -= 1 / TPS;
				turva += 1;
				if (peli.sim.tick >= peli.toistoLoppu || peli.sim.over) {
					toistoValmis();
					break;
				}
				peli.sim.step(peli.toisto.get(peli.sim.tick + 1) || []);
				aanetTapahtumista(peli.sim);
			}
		}
	}

	piirra();
	requestAnimationFrame(askel);
}

function piirra() {
	mitoita();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.fillStyle = '#0d1117';
	ctx.fillRect(0, 0, kanvaasi.width, kanvaasi.height);
	ctx.setTransform(skaala, 0, 0, skaala, siirtoX, siirtoY);
	ctx.drawImage(pohja, 0, 0);

	const s = peli.sim;
	if (!s) {
		ctx.fillStyle = '#161d27';
		ctx.fillRect(0, 1040, Piirto.LEVEYS, 240);
		return;
	}

	if (peli.valittu >= 0) {
		const rajaY = Piirto.px(s.ownHalfLimit(peli.oma));
		ctx.fillStyle = 'rgba(63,127,214,.10)';
		ctx.fillRect(0, rajaY, Piirto.LEVEYS, Piirto.KENTTA_KORKEUS - rajaY);
		ctx.strokeStyle = 'rgba(63,127,214,.45)';
		ctx.lineWidth = 2;
		ctx.beginPath(); ctx.moveTo(0, rajaY); ctx.lineTo(Piirto.LEVEYS, rajaY); ctx.stroke();
	}

	for (const e of s.ents) {
		if (e.kind === KIND_BUILDING) Piirto.piirraRakennus(ctx, e, e.team === peli.oma);
	}

	const yksikot = s.ents.filter((e) => e.kind === KIND_UNIT && !e.dead).sort((a, b) => a.y - b.y);
	for (const e of yksikot) {
		const x = Piirto.px(e.x);
		const y = Piirto.px(e.y);
		const oma = e.team === peli.oma;
		if (s.tick < e.ready_at) {
			const osuus = 1 - (e.ready_at - s.tick) / 30;
			ctx.strokeStyle = oma ? Piirto.VARI_OMA : Piirto.VARI_VASTUS;
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			ctx.arc(x, y, 15 - osuus * 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * osuus);
			ctx.stroke();
			continue;
		}
		const kellunta = e.flying ? Math.sin(peli.aika * 6 + e.id) * 2.4 : 0;
		const vaihe = peli.aika * 9 + e.id * 0.7;
		const kuva = Piirto.hahmokuvat.get(e.type);
		if (kuva) {
			Piirto.piirraKuvahahmo(ctx, kuva, x, y + kellunta, oma, vaihe);
		} else {
			const ruutu = Piirto.hahmoRuutu(e.type, oma, vaihe);
			if (ruutu) {
				ctx.drawImage(hahmot, ruutu[0], ruutu[1], ruutu[2], ruutu[3],
					x - Piirto.SOLU / 2, y + kellunta - Piirto.SOLU / 2, Piirto.SOLU, Piirto.SOLU);
			}
		}
		if (e.slow > 0) {
			ctx.strokeStyle = 'rgba(153,224,255,.85)';
			ctx.lineWidth = 2;
			ctx.beginPath(); ctx.arc(x, y + kellunta, 22, 0, Math.PI * 2); ctx.stroke();
		}
		Piirto.hpPalkki(ctx, x, y - 30, 28, e.hp, e.max_hp, oma ? Piirto.VARI_OMA : Piirto.VARI_VASTUS);
	}

	for (const e of s.ents) {
		if (e.kind !== KIND_PROJECTILE || e.dead) continue;
		ctx.fillStyle = e.team === peli.oma ? Piirto.VARI_OMA : Piirto.VARI_VASTUS;
		ctx.beginPath(); ctx.arc(Piirto.px(e.x), Piirto.px(e.y), 4, 0, Math.PI * 2); ctx.fill();
	}

	for (const f of s.fx) {
		if (f.laji === 'loitsu') {
			ctx.fillStyle = 'rgba(153,224,255,.18)';
			ctx.beginPath(); ctx.arc(Piirto.px(f.x), Piirto.px(f.y), Piirto.px(f.r), 0, Math.PI * 2); ctx.fill();
			ctx.strokeStyle = 'rgba(153,224,255,.9)';
			ctx.lineWidth = 3;
			ctx.stroke();
		} else if (f.laji === 'osuma' || f.laji === 'isku') {
			ctx.fillStyle = 'rgba(255,235,180,.9)';
			ctx.beginPath(); ctx.arc(Piirto.px(f.x), Piirto.px(f.y), 7, 0, Math.PI * 2); ctx.fill();
		} else if (f.laji === 'kuolema') {
			ctx.fillStyle = 'rgba(220,220,230,.55)';
			ctx.beginPath(); ctx.arc(Piirto.px(f.x), Piirto.px(f.y), 12, 0, Math.PI * 2); ctx.fill();
		}
	}

	piirraHud(s);
	if (peli.tila === 'toisto') piirraToistopalkki(s);
	else piirraKortit(s);
}

function piirraHud(s) {
	const sek = s.secondsLeft();
	const teksti = Math.floor(sek / 60) + ':' + String(sek % 60).padStart(2, '0');
	ctx.fillStyle = 'rgba(16,20,28,.72)';
	ctx.fillRect(Piirto.LEVEYS / 2 - 66, 8, 132, 34);
	ctx.fillStyle = s.overtime ? '#f0c05a' : '#e8ecf2';
	ctx.font = 'bold 24px system-ui, sans-serif';
	ctx.textAlign = 'center';
	ctx.fillText(teksti, Piirto.LEVEYS / 2, 33);
	if (s.overtime) {
		ctx.font = 'bold 13px system-ui, sans-serif';
		ctx.fillText(Kieli.t('lisaaika'), Piirto.LEVEYS / 2, 56);
	}
	ctx.font = 'bold 18px system-ui, sans-serif';
	ctx.fillStyle = Piirto.VARI_VASTUS;
	ctx.textAlign = 'left';
	ctx.fillText('▲ ' + s.kaadot[1 - peli.oma], 14, 30);
	ctx.fillStyle = Piirto.VARI_OMA;
	ctx.textAlign = 'right';
	ctx.fillText(s.kaadot[peli.oma] + ' ▼', Piirto.LEVEYS - 14, 30);

	if (peli.viesti && performance.now() < peli.viestiAsti) {
		ctx.textAlign = 'center';
		ctx.font = '15px system-ui, sans-serif';
		ctx.fillStyle = 'rgba(16,20,28,.75)';
		ctx.fillRect(Piirto.LEVEYS / 2 - 200, 980, 400, 30);
		ctx.fillStyle = '#e8ecf2';
		ctx.fillText(peli.viesti, Piirto.LEVEYS / 2, 1000);
	}
}

function piirraToistopalkki(s) {
	ctx.fillStyle = '#161d27';
	ctx.fillRect(0, 1040, Piirto.LEVEYS, 240);
	const osuus = Math.min(1, s.tick / Math.max(peli.toistoLoppu, 1));
	ctx.fillStyle = '#0f141c';
	ctx.fillRect(24, 1090, Piirto.LEVEYS - 48, 14);
	ctx.fillStyle = '#d8b661';
	ctx.fillRect(24, 1090, (Piirto.LEVEYS - 48) * osuus, 14);
	ctx.fillStyle = '#e8ecf2';
	ctx.font = 'bold 16px system-ui, sans-serif';
	ctx.textAlign = 'center';
	const kello = (t) => Math.floor(t / TPS / 60) + ':' + String(Math.floor(t / TPS) % 60).padStart(2, '0');
	ctx.fillText(Kieli.t('toisto_tila', [kello(s.tick), kello(peli.toistoLoppu)]), Piirto.LEVEYS / 2, 1070);
	ctx.font = '14px system-ui, sans-serif';
	ctx.fillStyle = '#8b94a3';
	ctx.fillText(peli.toistoTauko ? '▶' : '❚❚', Piirto.LEVEYS / 2, 1134);
	ctx.fillText(Kieli.t('toisto_poistu'), Piirto.LEVEYS / 2, 1170);
}

function piirraKortit(s) {
	ctx.fillStyle = '#161d27';
	ctx.fillRect(0, 1040, Piirto.LEVEYS, 240);
	const osuus = s.coffee[peli.oma] / COFFEE_MAX;
	ctx.fillStyle = '#0f141c';
	ctx.fillRect(8, 1046, Piirto.LEVEYS - 16, 20);
	ctx.fillStyle = '#c98f3f';
	ctx.fillRect(8, 1046, (Piirto.LEVEYS - 16) * osuus, 20);
	ctx.fillStyle = '#f0e3c8';
	ctx.font = 'bold 12px system-ui, sans-serif';
	ctx.textAlign = 'left';
	ctx.fillText(Kieli.t('kahvi') + '  ' + Math.floor(s.coffee[peli.oma] / 1000) + ' / 12', 14, 1060);

	for (let i = 0; i < Cards.ORDER.length; i++) {
		const avain = Cards.ORDER[i];
		const c = Cards.CARDS[avain];
		const [x, y, w, h] = korttiRect(i);
		const jaahy = s.cooldownOsuus(peli.oma, avain);
		const varaa = s.coffee[peli.oma] >= c.cost * 1000 && jaahy <= 0;
		ctx.fillStyle = peli.valittu === i ? '#2c3648' : '#1d2532';
		ctx.fillRect(x, y, w, h);
		ctx.strokeStyle = peli.valittu === i ? '#d8b661' : 'rgba(255,255,255,.08)';
		ctx.lineWidth = 2;
		ctx.strokeRect(x, y, w, h);
		ctx.globalAlpha = varaa ? 1 : 0.45;
		const korttikuva = Piirto.hahmokuvat.get(avain);
		if (korttikuva) {
			ctx.drawImage(korttikuva, x + 4, y + 6, 64, 64);
		} else {
			const ruutu = Piirto.hahmoRuutu(avain, true, 0);
			if (ruutu) ctx.drawImage(hahmot, ruutu[0], ruutu[1], ruutu[2], ruutu[3], x + 4, y + 6, 64, 64);
		}
		ctx.globalAlpha = 1;
		ctx.fillStyle = varaa ? '#e8ecf2' : '#7b8496';
		ctx.font = 'bold 14px system-ui, sans-serif';
		ctx.textAlign = 'left';
		ctx.fillText(Kieli.kieli === 'fi' ? c.nimi : c.nimi_en, x + 68, y + 30);
		ctx.fillStyle = '#c98f3f';
		ctx.font = 'bold 15px system-ui, sans-serif';
		ctx.fillText(c.cost + ' ☕', x + 68, y + 56);
		if (jaahy > 0) {
			ctx.fillStyle = 'rgba(10,14,20,.66)';
			ctx.fillRect(x, y, w, h * jaahy);
		}
	}
}

// ---- operaattorin komennot --------------------------------------------------

Operaattori.kuuntele((tyyppi, data) => {
	if (tyyppi === 'set_locale') {
		Kieli.aseta(String(data.locale || 'en'));
		if (peli.tila === 'valikko') paavalikko();
	} else if (tyyppi === 'set_balance') {
		peli.saldo = Number(data.balance) || 0;
		Operaattori.laheta('balance_update', { balance: peli.saldo });
		if (peli.tila === 'valikko') paavalikko();
	} else if (tyyppi === 'set_muted') {
		Aani.asetaMykka(!!data.muted);
		tallennaAsetukset();
	} else if (tyyppi === 'open_lobby') {
		Operaattori.laheta('lobby_exit', {});
		paavalikko();
	}
});

// ---- kaynnistys -------------------------------------------------------------

function kaynnista() {
	mitoita();
	lataaAsetukset();
	pohja = Piirto.leivoPohja();
	hahmot = Piirto.leivoHahmot();
	// Valmiit hahmokuvat otetaan kayttoon heti kun ne ovat ladattu. Jos
	// kansio on tyhja, peli piirtaa hahmot itse eika kayttaja huomaa mitaan.
	Piirto.lataaHahmokuvat().then((maara) => {
		if (maara > 0) console.log('Hahmokuvia kaytossa: ' + maara);
	});
	paavalikko();

	const kysely = new URLSearchParams(location.search);
	const auto = kysely.get('auto');
	if (auto !== null) {
		aloitaHarjoitus(auto === '' ? 15 : Number(auto) || 15);
		// Kuvakaappauksia varten ottelua voi kelata eteenpain heti.
		const tikkeja = Number(kysely.get('tikkeja') || 0);
		for (let i = 0; i < tikkeja && !peli.sim.over; i++) {
			const b = peli.botti.decide(peli.sim);
			peli.sim.step(b ? [b] : []);
		}
	}

	requestAnimationFrame(askel);
	Operaattori.laheta('ready', { locale: Kieli.kieli, balance: peli.saldo });

	// Ulkoinen valvonta ja testaus.
	window.kahvisota = {
		versio: Operaattori.VERSIO,
		tila: () => peli.tila,
		piirra: () => piirra(),
		tarkista: () => tarkistaToisto(),
		mitat: () => ({ puskuri: [kanvaasi.width, kanvaasi.height], skaala, siirto: [siirtoX, siirtoY] }),
	};
}

kaynnista();
