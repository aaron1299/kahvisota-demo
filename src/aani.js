// Aanet ja musiikki. Kaikki syntetisoidaan ajossa, joten pelissa ei ole
// yhtaan aanitiedostoa eika lisenssiehtoja tarvitse liittaa mukaan.
//
// Kappale on kahdeksan tahdin silmukka d-mollissa, 132 iskua minuutissa.
// Sointukierto on Dm Dm Bb C Dm Bb F C ja melodia pysyy d-molli-
// pentatonisessa. Tunnusmotiivi soi neljasti kierrossa, jolloin se jaa
// mieleen pelin tunnuksena eika pelkkana taustana.
//
// iOS vaatii, etta aanijarjestelma herataan kayttajan eleesta. Siksi mitaan
// ei rakenneta ennen ensimmaista kosketusta.

const RATE = 22050;
const BPM = 132;
const TAU = Math.PI * 2;

const SOINNUT = [38, 38, 46, 48, 38, 46, 41, 48];

// [askel kuudestoistaosina, nuotti, kesto askelina]
const TUNNUS = [[0, 74, 3], [3, 69, 1], [4, 65, 2], [6, 67, 2], [8, 69, 3], [11, 72, 1], [12, 74, 4]];
const VASTAUS = [[0, 72, 2], [2, 69, 2], [4, 67, 2], [6, 65, 2], [8, 67, 3], [11, 69, 1], [12, 65, 4]];
const HUIPENNUS = [[0, 74, 1], [1, 74, 1], [2, 77, 2], [4, 74, 2], [6, 72, 2], [8, 69, 4], [12, 72, 4]];
const LOPUKE = [[0, 65, 2], [2, 67, 2], [4, 69, 4], [8, 72, 2], [10, 74, 2], [12, 69, 4]];

let ctx = null;
let paaVahvistin = null;
let musaVahvistin = null;
let musaLahde = null;
let tunnusPuskuri = null;
let aanet = null;
let valmis = false;
let mykka = false;
let tila = 'valikko';

const taajuus = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

function kohina(siemen) {
	const x = (siemen * 1103515245 + 12345) & 0x7fffffff;
	return (x % 2000) / 1000 - 1;
}

function nuotti(puskuri, alku, kesto, f, tyyppi, voimakkuus, nousu) {
	const pituus = Math.floor(RATE * kesto);
	let vaihe = 0;
	const lisays = (TAU * f) / RATE;
	const nousuNaytteita = Math.max(Math.floor(RATE * nousu), 1);
	for (let i = 0; i < pituus; i++) {
		const kohta = alku + i;
		if (kohta < 0 || kohta >= puskuri.length) break;
		vaihe += lisays;
		let s = 0;
		if (tyyppi === 'sini') s = Math.sin(vaihe);
		else if (tyyppi === 'kantti') s = Math.sin(vaihe) > 0 ? 0.7 : -0.7;
		else if (tyyppi === 'saha') s = ((vaihe / TAU) % 1) * 2 - 1;
		const t = i / pituus;
		const nousuosuus = Math.min(i / nousuNaytteita, 1);
		const verho = nousuosuus * (1 - t) * (1 - t * 0.35);
		puskuri[kohta] += s * verho * voimakkuus;
	}
}

function basari(puskuri, alku) {
	const pituus = Math.floor(RATE * 0.13);
	let vaihe = 0;
	for (let i = 0; i < pituus; i++) {
		const kohta = alku + i;
		if (kohta >= puskuri.length) break;
		const t = i / pituus;
		const f = 125 + (45 - 125) * (t * t);
		vaihe += (TAU * f) / RATE;
		puskuri[kohta] += Math.sin(vaihe) * (1 - t) * 0.55;
	}
}

function virveli(puskuri, alku) {
	const pituus = Math.floor(RATE * 0.12);
	let vaihe = 0;
	for (let i = 0; i < pituus; i++) {
		const kohta = alku + i;
		if (kohta >= puskuri.length) break;
		const t = i / pituus;
		vaihe += (TAU * 190) / RATE;
		const aani = kohina(kohta) * 0.7 + Math.sin(vaihe) * 0.3;
		puskuri[kohta] += aani * (1 - t) * (1 - t) * 0.3;
	}
}

function hattu(puskuri, alku, voimakkuus) {
	const pituus = Math.floor(RATE * 0.035);
	for (let i = 0; i < pituus; i++) {
		const kohta = alku + i;
		if (kohta >= puskuri.length) break;
		const t = i / pituus;
		puskuri[kohta] += kohina(kohta * 7) * (1 - t) * voimakkuus;
	}
}

function puskuriksi(data) {
	const b = ctx.createBuffer(1, data.length, RATE);
	b.copyToChannel(data, 0);
	return b;
}

function rakennaMusiikki() {
	const isku = 60 / BPM;
	const askel = isku / 4;
	const tahti = isku * 4;
	const naytteita = Math.floor(RATE * tahti * 8);
	const puskuri = new Float32Array(naytteita);
	const jarjestys = [TUNNUS, VASTAUS, TUNNUS, HUIPENNUS, TUNNUS, VASTAUS, TUNNUS, LOPUKE];

	for (let t = 0; t < 8; t++) {
		const alkuT = Math.floor(RATE * tahti * t);
		const perus = SOINNUT[t];
		// Basso: kahdeksasosia, joka neljas oktaavia ylempaa.
		for (let i = 0; i < 8; i++) {
			const alku = alkuT + Math.floor(RATE * isku * 0.5 * i);
			const n = perus + (i % 4 === 3 ? 12 : 0);
			nuotti(puskuri, alku, isku * 0.46, taajuus(n), 'saha', 0.26, 0.004);
		}
		// Urkupiste.
		nuotti(puskuri, alkuT, tahti * 0.98, taajuus(perus + 12), 'sini', 0.05, 0.08);
		nuotti(puskuri, alkuT, tahti * 0.98, taajuus(perus + 19), 'sini', 0.035, 0.08);
		// Melodia ja kvinttiharmonia.
		for (const rivi of jarjestys[t]) {
			const a = alkuT + Math.floor(RATE * askel * rivi[0]);
			const pituus = askel * rivi[2] * 0.92;
			nuotti(puskuri, a, pituus, taajuus(rivi[1]), 'kantti', 0.16, 0.006);
			nuotti(puskuri, a, pituus, taajuus(rivi[1] + 7), 'kantti', 0.05, 0.006);
		}
		// Rummut.
		for (let i = 0; i < 16; i++) {
			const a2 = alkuT + Math.floor(RATE * askel * i);
			if (i === 0 || i === 6 || i === 8 || (t % 4 === 3 && i === 14)) basari(puskuri, a2);
			if (i === 4 || i === 12) virveli(puskuri, a2);
			if (i % 2 === 0) hattu(puskuri, a2, i % 4 === 0 ? 0.05 : 0.035);
		}
	}
	for (let i = 0; i < naytteita; i++) puskuri[i] = Math.max(-1, Math.min(1, puskuri[i]));
	return puskuriksi(puskuri);
}

function rakennaTunnus() {
	const isku = 60 / BPM;
	const askel = isku / 4;
	const naytteita = Math.floor(RATE * isku * 4.5);
	const puskuri = new Float32Array(naytteita);
	for (const rivi of TUNNUS) {
		const a = Math.floor(RATE * askel * rivi[0]);
		const pituus = askel * rivi[2] * 1.35;
		nuotti(puskuri, a, pituus, taajuus(rivi[1]), 'kantti', 0.2, 0.005);
		nuotti(puskuri, a, pituus, taajuus(rivi[1] + 12), 'sini', 0.1, 0.005);
		nuotti(puskuri, a, pituus * 1.2, taajuus(rivi[1] - 12), 'saha', 0.1, 0.01);
	}
	for (let i = 0; i < naytteita; i++) puskuri[i] = Math.max(-1, Math.min(1, puskuri[i]));
	return puskuriksi(puskuri);
}

// Lyhyt tehoste: taajuus liukuu alusta loppuun, nopea nousu ja vaimennus.
function tone(f0, f1, kesto, tyyppi = 'sini', volyymi = 0.45) {
	const naytteita = Math.floor(RATE * kesto);
	const puskuri = new Float32Array(naytteita);
	let vaihe = 0;
	for (let i = 0; i < naytteita; i++) {
		const t = i / naytteita;
		const f = f0 + (f1 - f0) * t;
		vaihe += (TAU * f) / RATE;
		let s = 0;
		if (tyyppi === 'sini') s = Math.sin(vaihe);
		else if (tyyppi === 'kantti') s = Math.sin(vaihe) > 0 ? 1 : -1;
		else if (tyyppi === 'saha') s = ((vaihe / TAU) % 1) * 2 - 1;
		else if (tyyppi === 'kohina') s = kohina(i) * (1 - t);
		const verho = Math.min(1, t * 40) * Math.pow(1 - t, 1.6);
		puskuri[i] = s * verho * volyymi;
	}
	return puskuriksi(puskuri);
}

function sekoita(a, b) {
	const pituus = Math.max(a.length, b.length);
	const ulos = new Float32Array(pituus);
	const da = a.getChannelData(0);
	const db = b.getChannelData(0);
	for (let i = 0; i < pituus; i++) {
		const va = i < da.length ? da[i] : 0;
		const vb = i < db.length ? db[i] : 0;
		ulos[i] = Math.max(-1, Math.min(1, va + vb));
	}
	return puskuriksi(ulos);
}

// ---- julkinen rajapinta -----------------------------------------------------

export function kaynnista() {
	if (valmis) {
		if (ctx.state === 'suspended') ctx.resume();
		return;
	}
	const Ctx = window.AudioContext || window.webkitAudioContext;
	if (!Ctx) return;
	ctx = new Ctx();
	paaVahvistin = ctx.createGain();
	paaVahvistin.gain.value = mykka ? 0 : 1;
	paaVahvistin.connect(ctx.destination);
	musaVahvistin = ctx.createGain();
	musaVahvistin.gain.value = 0.18;
	musaVahvistin.connect(paaVahvistin);

	aanet = {
		asetus: tone(420, 900, 0.1, 'sini', 0.35),
		isku: tone(320, 140, 0.07, 'kantti', 0.2),
		osuma: tone(700, 300, 0.08, 'sini', 0.22),
		loitsu: tone(180, 1200, 0.3, 'saha', 0.28),
		torni: sekoita(tone(220, 40, 0.7, 'saha', 0.4), tone(1, 1, 0.7, 'kohina', 0.35)),
		kruunu: tone(700, 1400, 0.35, 'sini', 0.4),
		kahvi: tone(1200, 1600, 0.14, 'sini', 0.25),
		varoitus: tone(300, 220, 0.18, 'kantti', 0.25),
		voitto: sekoita(tone(520, 1040, 0.9, 'sini', 0.4), tone(780, 1560, 0.9, 'sini', 0.25)),
		tappio: tone(400, 90, 1, 'saha', 0.35),
	};
	tunnusPuskuri = rakennaTunnus();

	const musa = rakennaMusiikki();
	musaLahde = ctx.createBufferSource();
	musaLahde.buffer = musa;
	musaLahde.loop = true;
	musaLahde.connect(musaVahvistin);
	musaLahde.start();
	valmis = true;
	asetaTila(tila);
}

export function soita(nimi, korkeus = 1) {
	if (!valmis || mykka || !aanet[nimi]) return;
	const l = ctx.createBufferSource();
	l.buffer = aanet[nimi];
	l.playbackRate.value = korkeus;
	l.connect(paaVahvistin);
	l.start();
}

export function soitaTunnus(korkeus = 1) {
	if (!valmis || mykka || !tunnusPuskuri) return;
	const l = ctx.createBufferSource();
	l.buffer = tunnusPuskuri;
	l.playbackRate.value = korkeus;
	const g = ctx.createGain();
	g.gain.value = 0.5;
	l.connect(g);
	g.connect(paaVahvistin);
	l.start();
}

// Musiikki seuraa ottelun tilannetta: lisaajalla se kiristyy.
export function asetaTila(uusi) {
	tila = uusi;
	if (!valmis) return;
	if (uusi === 'ottelu') {
		musaVahvistin.gain.value = 0.30;
		musaLahde.playbackRate.value = 1;
	} else if (uusi === 'lisaaika') {
		musaVahvistin.gain.value = 0.38;
		musaLahde.playbackRate.value = 1.06;
	} else {
		musaVahvistin.gain.value = 0.14;
		musaLahde.playbackRate.value = 1;
	}
}

export function asetaMykka(arvo) {
	mykka = !!arvo;
	if (paaVahvistin) paaVahvistin.gain.value = mykka ? 0 : 1;
}

export function onMykka() {
	return mykka;
}
