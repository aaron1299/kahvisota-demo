// Kahvisota, selainversio. Pelin runko: valikko, ottelu, piirtosilmukka ja
// syote. Simulaatio on erillaan tasta tiedostosta eika tama koskaan muuta
// pelitilaa muuten kuin syotteiden kautta.

import { Sim, TPS, MATCH_TICKS, OVERTIME_TICKS, KIND_UNIT, KIND_BUILDING, KIND_PROJECTILE,
	RESULT_SININEN, RESULT_PUNAINEN, RESULT_TASAPELI, COFFEE_MAX, FIELD_W, FIELD_H } from './sim.js';
import { Bot } from './bot.js';
import * as Cards from './cards.js';
import * as Kieli from './kieli.js';
import * as Piirto from './piirto.js';

const kanvaasi = document.getElementById('peli');
const ctx = kanvaasi.getContext('2d');
const valikko = document.getElementById('valikko');

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
	// Kanvaasin koon asettaminen tyhjentaa sen, joten se tehdaan vain kun
	// koko oikeasti muuttuu.
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
	tila: 'valikko',        // valikko | ottelu | tulos
	sim: null,
	botti: null,
	oma: 0,
	valittu: -1,
	kertyma: 0,
	aika: 0,
	tunnus: '',
	viesti: '',
	viestiAsti: 0,
};

function uusiTunnus() {
	// Ottelutunnus on vain viite lokiin, ei arvontaa pelin sisalla.
	const t = Date.now().toString(36).toUpperCase();
	return 'KS-' + t.slice(-6);
}

function aloitaHarjoitus(vaste) {
	peli.sim = new Sim();
	peli.botti = new Bot(1);
	peli.botti.reaction_ticks = vaste;
	peli.oma = 0;
	peli.valittu = -1;
	peli.kertyma = 0;
	peli.tunnus = uusiTunnus();
	peli.tila = 'ottelu';
	peli.viesti = Kieli.t('vinkki');
	peli.viestiAsti = performance.now() + 4000;
	naytaValikko(false);
}

// ---- valikko (HTML, ei kanvaasilla) ----------------------------------------

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

function paavalikko() {
	peli.tila = 'valikko';
	const l = valikkoJuuri();
	const h = document.createElement('h1');
	h.textContent = Kieli.t('otsikko');
	l.appendChild(h);
	const p = document.createElement('p');
	p.textContent = Kieli.t('tagline');
	l.appendChild(p);
	l.appendChild(nappi(Kieli.t('harjoitus'), tasovalikko, true));
	l.appendChild(nappi(Kieli.t('panos'), () => ilmoitus(Kieli.t('ei_palvelinta'))));
	l.appendChild(nappi(Kieli.t('saannot'), saantovalikko));
	const alapalkki = document.createElement('div');
	alapalkki.className = 'alapalkki';
	alapalkki.appendChild(nappi(Kieli.kieli === 'fi' ? 'In English' : 'Suomeksi', () => {
		Kieli.aseta(Kieli.kieli === 'fi' ? 'en' : 'fi');
		paavalikko();
	}));
	l.appendChild(alapalkki);
}

function tasovalikko() {
	const l = valikkoJuuri();
	const h = document.createElement('h2');
	h.textContent = Kieli.t('taso_otsikko');
	l.appendChild(h);
	const tasot = [
		[Kieli.t('taso_helppo'), 36],
		[Kieli.t('taso_normaali'), 15],
		[Kieli.t('taso_kova'), 6],
	];
	for (const [nimi, vaste] of tasot) {
		const teksti = nimi + '  (' + Kieli.t('taso_vaste', [(vaste / TPS).toFixed(1).replace('.', ',')]) + ')';
		l.appendChild(nappi(teksti, () => aloitaHarjoitus(vaste), nimi === Kieli.t('taso_normaali')));
	}
	l.appendChild(nappi(Kieli.t('takaisin'), paavalikko));
}

function saantovalikko() {
	const l = valikkoJuuri();
	const h = document.createElement('h2');
	h.textContent = Kieli.t('saannot');
	l.appendChild(h);
	const taulu = document.createElement('div');
	taulu.className = 'kortit';
	for (const avain of Cards.ORDER) {
		const c = Cards.CARDS[avain];
		const rivi = document.createElement('div');
		rivi.className = 'korttirivi';
		rivi.innerHTML = '<b>' + (Kieli.kieli === 'fi' ? c.nimi : c.nimi_en) + '</b>'
			+ '<span>' + c.cost + ' ☕</span>';
		taulu.appendChild(rivi);
	}
	l.appendChild(taulu);
	l.appendChild(nappi(Kieli.t('takaisin'), paavalikko));
}

function ilmoitus(teksti) {
	const l = valikkoJuuri();
	const p = document.createElement('p');
	p.textContent = teksti;
	l.appendChild(p);
	l.appendChild(nappi(Kieli.t('takaisin'), paavalikko));
}

function tulosnaytto() {
	const s = peli.sim;
	const l = valikkoJuuri();
	const h = document.createElement('h2');
	if (s.result === RESULT_TASAPELI) h.textContent = Kieli.t('tasapeli');
	else h.textContent = s.result === peli.oma ? Kieli.t('voitto') : Kieli.t('tappio');
	l.appendChild(h);
	const tiedot = document.createElement('p');
	tiedot.innerHTML = Kieli.t('kaadot', [s.kaadot[peli.oma], s.kaadot[1 - peli.oma]])
		+ '<br>' + Kieli.t('tunnus', [peli.tunnus])
		+ '<br>' + Kieli.t('summa', [s.stateHash()]);
	l.appendChild(tiedot);
	l.appendChild(nappi(Kieli.t('uusi'), tasovalikko, true));
	l.appendChild(nappi(Kieli.t('valikkoon'), paavalikko));
	peli.tila = 'tulos';
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

kanvaasi.addEventListener('pointerdown', (e) => {
	if (peli.tila !== 'ottelu') return;
	e.preventDefault();
	const [x, y] = paikka(e);
	if (y >= 1040) {
		for (let i = 0; i < Cards.ORDER.length; i++) {
			const [rx, ry, rw, rh] = korttiRect(i);
			if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) {
				peli.valittu = peli.valittu === i ? -1 : i;
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
		jono.push({ team: peli.oma, card: avain, x: sx, y: sy });
		peli.valittu = -1;
	} else {
		peli.viesti = Kieli.t('vinkki');
		peli.viestiAsti = performance.now() + 2000;
	}
}, { passive: false });

const jono = [];

// ---- silmukka ---------------------------------------------------------------

let edellinen = performance.now();

function askel(nyt) {
	const dt = Math.min((nyt - edellinen) / 1000, 0.25);
	edellinen = nyt;
	peli.aika += dt;

	if (peli.tila === 'ottelu' && peli.sim) {
		peli.kertyma += dt;
		const askelAika = 1 / TPS;
		let turva = 0;
		while (peli.kertyma >= askelAika && turva < 8) {
			peli.kertyma -= askelAika;
			turva += 1;
			const syotteet = [];
			while (jono.length) syotteet.push(jono.shift());
			const botti = peli.botti.decide(peli.sim);
			if (botti) syotteet.push(botti);
			peli.sim.step(syotteet);
			if (peli.sim.over) {
				tulosnaytto();
				break;
			}
		}
	}

	piirra();
	requestAnimationFrame(askel);
}

function piirra() {
	// Mitoitus lasketaan joka ruudulla. Se on muutama kertolasku, ja nain
	// kanvaasi ei voi jaada vaaran kokoiseksi missaan tilanteessa, ei
	// osoiterivin liikkuessa eika laitetta kaannettaessa.
	mitoita();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.fillStyle = '#0d1117';
	ctx.fillRect(0, 0, kanvaasi.width, kanvaasi.height);
	ctx.setTransform(skaala, 0, 0, skaala, siirtoX, siirtoY);
	ctx.drawImage(pohja, 0, 0);

	const s = peli.sim;
	if (!s) {
		piirraTyhjaPalkki();
		return;
	}

	// Asetusalue: oma puoli korostetaan kun kortti on valittuna.
	if (peli.valittu >= 0) {
		const raja = Piirto.px(s.ownHalfLimit(peli.oma));
		ctx.fillStyle = 'rgba(63,127,214,.10)';
		ctx.fillRect(0, raja, Piirto.LEVEYS, Piirto.KENTTA_KORKEUS - raja);
		ctx.strokeStyle = 'rgba(63,127,214,.45)';
		ctx.lineWidth = 2;
		ctx.beginPath(); ctx.moveTo(0, raja); ctx.lineTo(Piirto.LEVEYS, raja); ctx.stroke();
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
			// Ilmestyminen: rengas taydentyy, yksikko ei viela vaikuta mihinkaan.
			const osuus = 1 - (e.ready_at - s.tick) / 30;
			ctx.strokeStyle = oma ? Piirto.VARI_OMA : Piirto.VARI_VASTUS;
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			ctx.arc(x, y, 15 - osuus * 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * osuus);
			ctx.stroke();
			continue;
		}
		const kellunta = e.flying ? Math.sin(peli.aika * 6 + e.id) * 2.4 : 0;
		const ruutu = Piirto.hahmoRuutu(e.type, oma, peli.aika * 9 + e.id * 0.7);
		if (ruutu) {
			ctx.drawImage(hahmot, ruutu[0], ruutu[1], ruutu[2], ruutu[3],
				x - Piirto.SOLU / 2, y + kellunta - Piirto.SOLU / 2, Piirto.SOLU, Piirto.SOLU);
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
			ctx.strokeStyle = 'rgba(153,224,255,.9)';
			ctx.lineWidth = 3;
			ctx.beginPath(); ctx.arc(Piirto.px(f.x), Piirto.px(f.y), Piirto.px(f.r), 0, Math.PI * 2); ctx.stroke();
			ctx.fillStyle = 'rgba(153,224,255,.18)';
			ctx.fill();
		} else if (f.laji === 'osuma' || f.laji === 'isku') {
			ctx.fillStyle = 'rgba(255,235,180,.9)';
			ctx.beginPath(); ctx.arc(Piirto.px(f.x), Piirto.px(f.y), 7, 0, Math.PI * 2); ctx.fill();
		} else if (f.laji === 'kuolema') {
			ctx.fillStyle = 'rgba(220,220,230,.55)';
			ctx.beginPath(); ctx.arc(Piirto.px(f.x), Piirto.px(f.y), 12, 0, Math.PI * 2); ctx.fill();
		}
	}

	piirraHud(s);
	piirraKortit(s);
}

function piirraTyhjaPalkki() {
	ctx.fillStyle = '#161d27';
	ctx.fillRect(0, 1040, Piirto.LEVEYS, 240);
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
	// Kaadot molemmilta puolilta.
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

function piirraKortit(s) {
	ctx.fillStyle = '#161d27';
	ctx.fillRect(0, 1040, Piirto.LEVEYS, 240);
	// Kahvipalkki.
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
		// Hahmon kuva kortissa.
		const ruutu = Piirto.hahmoRuutu(avain, true, 0);
		if (ruutu) {
			ctx.globalAlpha = varaa ? 1 : 0.45;
			ctx.drawImage(hahmot, ruutu[0], ruutu[1], ruutu[2], ruutu[3], x + 4, y + 6, 64, 64);
			ctx.globalAlpha = 1;
		}
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

// ---- kaynnistys -------------------------------------------------------------

function kaynnista() {
	mitoita();
	pohja = Piirto.leivoPohja();
	hahmot = Piirto.leivoHahmot();
	paavalikko();
	// Testiajoa varten ottelun voi kaynnistaa suoraan osoitteesta.
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
	// Ulkoinen valvonta: operaattorin sivu ja testit voivat lukea tasta.
	// Ulkoinen valvonta ja testaus: operaattorin sivu voi lukea tilan, ja
	// testit voivat pyytaa yhden ruudun ilman ruudunpaivityssilmukkaa.
	window.kahvisota = {
		versio: '0.4.0',
		tila: () => peli.tila,
		piirra: () => piirra(),
		mitat: () => ({
			puskuri: [kanvaasi.width, kanvaasi.height],
			skaala,
			siirto: [siirtoX, siirtoY],
		}),
	};
}

kaynnista();
