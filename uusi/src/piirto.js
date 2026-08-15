// Areenan piirto. Kaksi periaatetta, jotka pitavat pelin pyorimassa myos
// puhelimessa:
//   1. Pysyva maisema leivotaan kertaalleen omaan kuvaan.
//   2. Hahmot leivotaan kuva-atlakseen, jolloin yksikko maksaa yhden kutsun.
// Naiden ansiosta yksi ruutu on muutamia kymmenia piirtokutsuja, ei tuhatta.

import * as Sim from './sim.js';
import * as Cards from './cards.js';

export const LEVEYS = 720;
export const KORKEUS = 1280;
export const KENTTA_KORKEUS = 1040;
export const U = 25;                 // simulaatioyksikkoa per pikseli

export const VARI_OMA = '#3f7fd6';
export const VARI_VASTUS = '#d2503f';
const VARI_JOKI = '#2f6fa8';
const VARI_JOKI2 = '#3f86c2';
const VARI_SILTA = '#7a5433';
const VARI_KULTA = '#d8b661';

export const px = (x) => x / U;

// ---- pysyva maisema ---------------------------------------------------------

function siemenoija(siemen) {
	let s = siemen;
	return (ala, yla) => {
		s = (s * 1103515245 + 12345) & 0x7fffffff;
		return ala + (yla - ala) * ((s % 10000) / 10000);
	};
}

export function leivoPohja() {
	const c = document.createElement('canvas');
	c.width = LEVEYS;
	c.height = KENTTA_KORKEUS;
	const p = c.getContext('2d');
	const arvo = siemenoija(20260815);

	const liuku = p.createLinearGradient(0, 0, 0, KENTTA_KORKEUS);
	liuku.addColorStop(0, '#ccd9e8');
	liuku.addColorStop(1, '#edf2f7');
	p.fillStyle = liuku;
	p.fillRect(0, 0, LEVEYS, KENTTA_KORKEUS);

	// Hennot vaakaviivat jakavat kentan luettaviin kaistoihin.
	p.strokeStyle = 'rgba(255,255,255,.28)';
	p.lineWidth = 2;
	for (let i = 1; i < 13; i++) {
		const y = (KENTTA_KORKEUS * i) / 13;
		p.beginPath(); p.moveTo(0, y); p.lineTo(LEVEYS, y); p.stroke();
	}

	// Kaistaohjurit siltojen kohdalla.
	p.strokeStyle = 'rgba(255,255,255,.20)';
	p.lineWidth = 26;
	for (const bx of Sim.BRIDGE_X) {
		const x = px(bx);
		p.beginPath(); p.moveTo(x, 20); p.lineTo(x, KENTTA_KORKEUS - 20); p.stroke();
	}

	// Tallatut polut kioskien ja siltojen valilla.
	const solmut = [];
	for (const bx of Sim.BRIDGE_X) {
		solmut.push([[px(bx), px(Sim.FIELD_H - Sim.KIOSKI_Y)], [px(bx), px(Sim.RIVER_Y - 900)]]);
		solmut.push([[px(bx), px(Sim.RIVER_Y + 900)], [px(bx), px(Sim.KIOSKI_Y)]]);
	}
	solmut.push([[px(Sim.BRIDGE_X[0]), px(Sim.FIELD_H - Sim.KIOSKI_Y)], [px(Sim.BRIDGE_X[1]), px(Sim.FIELD_H - Sim.KIOSKI_Y)]]);
	solmut.push([[px(Sim.BRIDGE_X[0]), px(Sim.KIOSKI_Y)], [px(Sim.BRIDGE_X[1]), px(Sim.KIOSKI_Y)]]);
	solmut.push([[px(9000), px(Sim.FIELD_H - Sim.SAUNA_Y + 700)], [px(9000), px(Sim.FIELD_H - Sim.KIOSKI_Y)]]);
	solmut.push([[px(9000), px(Sim.SAUNA_Y - 700)], [px(9000), px(Sim.KIOSKI_Y)]]);
	for (const [a, b] of solmut) {
		p.strokeStyle = 'rgba(189,201,219,.55)'; p.lineWidth = 40;
		p.beginPath(); p.moveTo(a[0], a[1]); p.lineTo(b[0], b[1]); p.stroke();
		p.strokeStyle = 'rgba(224,232,242,.75)'; p.lineWidth = 30;
		p.beginPath(); p.moveTo(a[0], a[1]); p.lineTo(b[0], b[1]); p.stroke();
	}

	// Joki rantakinoksineen.
	const y0 = px(Sim.RIVER_Y - Sim.RIVER_HALF);
	const y1 = px(Sim.RIVER_Y + Sim.RIVER_HALF);
	p.fillStyle = '#f8fbff';
	p.fillRect(0, y0 - 7, LEVEYS, 9);
	p.fillRect(0, y1 - 2, LEVEYS, 9);
	const joki = p.createLinearGradient(0, y0, 0, y1);
	joki.addColorStop(0, VARI_JOKI);
	joki.addColorStop(1, VARI_JOKI2);
	p.fillStyle = joki;
	p.fillRect(0, y0, LEVEYS, y1 - y0);
	p.fillStyle = '#cfe6f5';
	p.fillRect(0, y0, LEVEYS, 3);
	p.fillRect(0, y1 - 3, LEVEYS, 3);

	// Sillat lankkuineen ja kaiteineen.
	for (const bx of Sim.BRIDGE_X) {
		const x = px(bx - Sim.BRIDGE_HALF);
		const w = px(Sim.BRIDGE_HALF * 2);
		const yy = px(Sim.RIVER_Y - Sim.RIVER_HALF - 260);
		const hh = px(Sim.RIVER_HALF * 2 + 520);
		p.fillStyle = 'rgba(0,0,0,.18)';
		p.fillRect(x + 3, yy + 4, w, hh);
		const silta = p.createLinearGradient(0, yy, 0, yy + hh);
		silta.addColorStop(0, VARI_SILTA);
		silta.addColorStop(1, '#8d6540');
		p.fillStyle = silta;
		p.fillRect(x, yy, w, hh);
		p.strokeStyle = 'rgba(87,61,38,.8)';
		p.lineWidth = 1.5;
		for (let l = 0; l < hh / 9; l++) {
			const ly = yy + l * 9;
			p.beginPath(); p.moveTo(x, ly); p.lineTo(x + w, ly); p.stroke();
		}
		p.fillStyle = '#5c4028';
		p.fillRect(x - 3, yy, 5, hh);
		p.fillRect(x + w - 2, yy, 5, hh);
		p.fillStyle = 'rgba(255,255,255,.75)';
		p.fillRect(x, yy, w, 4);
		p.fillRect(x, yy + hh - 4, w, 4);
	}

	// Koristeet: kuuset reunoilla, kinokset, kivet ja katsomo.
	for (let i = 0; i < 34; i++) {
		const vasen = i % 2 === 0;
		const x = vasen ? arvo(10, 30) : LEVEYS - arvo(10, 30);
		const y = 30 + Math.floor(i / 2) * 62 + arvo(-8, 8);
		if (Math.abs(y - KENTTA_KORKEUS / 2) < 30) continue;
		kuusi(p, x, y, arvo(30, 46));
	}
	for (let i = 0; i < 18; i++) {
		const x = arvo(46, LEVEYS - 46);
		const y = arvo(40, KENTTA_KORKEUS - 40);
		if (Math.abs(x - LEVEYS / 2) < 40) continue;
		p.fillStyle = 'rgba(255,255,255,.62)';
		p.beginPath(); p.ellipse(x, y, arvo(9, 20), arvo(4, 8), 0, 0, Math.PI * 2); p.fill();
	}
	for (let i = 0; i < 12; i++) {
		const x = arvo(50, LEVEYS - 50);
		const y = arvo(40, KENTTA_KORKEUS - 40);
		p.fillStyle = 'rgba(150,158,170,.55)';
		p.beginPath(); p.ellipse(x, y, arvo(3, 7), arvo(2, 5), 0, 0, Math.PI * 2); p.fill();
	}
	// Katsomon aita ja katsojat alalaidassa.
	p.fillStyle = '#1b2432';
	p.fillRect(0, KENTTA_KORKEUS - 22, LEVEYS, 22);
	for (let i = 0; i < 26; i++) {
		const x = 26 + i * ((LEVEYS - 52) / 25);
		p.fillStyle = i % 3 === 0 ? '#33506f' : (i % 3 === 1 ? '#3d6288' : '#2b415a');
		p.beginPath(); p.arc(x, KENTTA_KORKEUS - 13, 5, 0, Math.PI * 2); p.fill();
	}
	// Lyhdyt.
	for (const lx of [58, LEVEYS - 58]) {
		for (const ly of [px(8200), px(17800)]) {
			p.strokeStyle = '#4a5364'; p.lineWidth = 3;
			p.beginPath(); p.moveTo(lx, ly); p.lineTo(lx, ly - 26); p.stroke();
			p.fillStyle = '#f2d98a';
			p.beginPath(); p.arc(lx, ly - 30, 5, 0, Math.PI * 2); p.fill();
			p.fillStyle = 'rgba(242,217,138,.16)';
			p.beginPath(); p.arc(lx, ly - 30, 18, 0, Math.PI * 2); p.fill();
		}
	}
	return c;
}

function kuusi(p, x, y, koko) {
	p.fillStyle = '#5a3f28';
	p.fillRect(x - 3, y + koko * 0.28, 6, koko * 0.22);
	for (let k = 0; k < 3; k++) {
		const h = koko * (0.42 - k * 0.06);
		const yy = y + koko * (0.28 - k * 0.20);
		p.fillStyle = k === 0 ? '#2f6b45' : '#357a4f';
		p.beginPath();
		p.moveTo(x, yy - h);
		p.lineTo(x - h * 0.72, yy);
		p.lineTo(x + h * 0.72, yy);
		p.closePath();
		p.fill();
		p.fillStyle = 'rgba(255,255,255,.75)';
		p.beginPath();
		p.moveTo(x, yy - h);
		p.lineTo(x - h * 0.28, yy - h * 0.58);
		p.lineTo(x + h * 0.28, yy - h * 0.58);
		p.closePath();
		p.fill();
	}
}

// ---- hahmoatlas -------------------------------------------------------------

export const SOLU = 72;
export const VAIHEITA = 8;

export function leivoHahmot() {
	const c = document.createElement('canvas');
	c.width = SOLU * VAIHEITA;
	c.height = SOLU * Cards.ORDER.length * 2;
	const p = c.getContext('2d');
	for (let t = 0; t < Cards.ORDER.length; t++) {
		const avain = Cards.ORDER[t];
		for (let puoli = 0; puoli < 2; puoli++) {
			for (let v = 0; v < VAIHEITA; v++) {
				const cx = v * SOLU + SOLU / 2;
				const cy = (t * 2 + puoli) * SOLU + SOLU / 2;
				hahmo(p, avain, cx, cy, puoli === 0 ? VARI_OMA : VARI_VASTUS,
					puoli === 0 ? -1 : 1, (Math.PI * 2 * v) / VAIHEITA);
			}
		}
	}
	return c;
}

export function hahmoRuutu(tyyppi, oma, vaihe) {
	const t = Cards.cardIndex(tyyppi);
	if (t < 0) return null;
	let v = Math.round((((vaihe % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * VAIHEITA) % VAIHEITA;
	return [v * SOLU, (t * 2 + (oma ? 0 : 1)) * SOLU, SOLU, SOLU];
}

// Yksi hahmo. Piirretaan atlakseen, ei koskaan suoraan kentalle.
function hahmo(p, tyyppi, x, y, vari, suunta, vaihe) {
	const heilu = Math.sin(vaihe) * 3.2;
	p.save();
	p.translate(x, y);
	// Joukkueen varirengas maassa.
	p.fillStyle = vari + '55';
	p.beginPath(); p.ellipse(0, 13, 16, 6, 0, 0, Math.PI * 2); p.fill();
	p.fillStyle = 'rgba(0,0,0,.14)';
	p.beginPath(); p.ellipse(0, 13, 11, 4, 0, 0, Math.PI * 2); p.fill();

	if (tyyppi === 'rantasade') {
		// Loitsu ei ole hahmo: pilvi ja rantasade kertovat sen yhdella silmayksella.
		p.fillStyle = '#8f9bb0';
		p.beginPath();
		p.arc(-7, -8, 8, 0, Math.PI * 2);
		p.arc(4, -10, 10, 0, Math.PI * 2);
		p.arc(12, -6, 7, 0, Math.PI * 2);
		p.fill();
		p.fillStyle = '#b9c6da';
		p.fillRect(-14, -8, 28, 7);
		p.strokeStyle = '#9fd4ef';
		p.lineWidth = 2;
		for (let i = -2; i <= 2; i++) {
			const x0 = i * 7;
			p.beginPath();
			p.moveTo(x0, 2 + (i % 2 ? 3 : 0));
			p.lineTo(x0 - 3, 12 + (i % 2 ? 3 : 0));
			p.stroke();
		}
		p.fillStyle = vari;
		p.beginPath(); p.arc(0, -18, 3, 0, Math.PI * 2); p.fill();
		p.restore();
		return;
	}

	if (tyyppi === 'hyttyset') {
		p.fillStyle = '#3c3a46';
		p.beginPath(); p.ellipse(0, 0, 7, 5, 0, 0, Math.PI * 2); p.fill();
		p.fillStyle = 'rgba(220,235,255,.65)';
		p.beginPath(); p.ellipse(-7, -4 + heilu, 7, 3, -0.5, 0, Math.PI * 2); p.fill();
		p.beginPath(); p.ellipse(7, -4 - heilu, 7, 3, 0.5, 0, Math.PI * 2); p.fill();
		p.strokeStyle = '#2a2833'; p.lineWidth = 1.5;
		p.beginPath(); p.moveTo(6, 1); p.lineTo(13, 4); p.stroke();
		p.fillStyle = vari;
		p.beginPath(); p.arc(0, -7, 3.5, 0, Math.PI * 2); p.fill();
		p.restore();
		return;
	}

	if (tyyppi === 'hirvi' || tyyppi === 'poro') {
		const turkki = tyyppi === 'hirvi' ? '#6b4a30' : '#9c7d5c';
		const mitta = tyyppi === 'hirvi' ? 1.15 : 1.0;
		p.fillStyle = '#243044';
		p.fillRect(-9 * mitta, 4, 4, 9 + heilu * 0.5);
		p.fillRect(5 * mitta, 4, 4, 9 - heilu * 0.5);
		p.fillStyle = turkki;
		p.beginPath();
		p.ellipse(0, 0, 15 * mitta, 9 * mitta, 0, 0, Math.PI * 2);
		p.fill();
		p.beginPath(); p.arc(11 * mitta * -suunta, -8, 6.5 * mitta, 0, Math.PI * 2); p.fill();
		// Sarvet.
		p.strokeStyle = '#d8c39a'; p.lineWidth = 2;
		for (const s of [-1, 1]) {
			p.beginPath();
			p.moveTo(11 * mitta * -suunta + s * 3, -13);
			p.lineTo(11 * mitta * -suunta + s * 9, -21);
			p.moveTo(11 * mitta * -suunta + s * 6, -17);
			p.lineTo(11 * mitta * -suunta + s * 12, -18);
			p.stroke();
		}
		if (tyyppi === 'poro') {
			p.fillStyle = VARI_KULTA;
			p.beginPath(); p.arc(11 * mitta * -suunta, -3, 2.5, 0, Math.PI * 2); p.fill();
		}
		p.fillStyle = vari;
		p.fillRect(-6, -10 * mitta, 12, 4);
		p.restore();
		return;
	}

	// Ihmishahmot.
	p.fillStyle = '#243044';
	p.fillRect(-7 + heilu * 0.5, 6, 6, 10);
	p.fillRect(1 - heilu * 0.5, 6, 6, 10);
	p.fillStyle = vari;
	p.fillRect(-9, -10, 18, 18);
	p.fillStyle = '#f2d3b3';
	p.beginPath(); p.arc(0, -16, 7.5, 0, Math.PI * 2); p.fill();
	p.fillStyle = '#1d2430';
	p.fillRect(-2.5 * suunta - 1, -17, 2, 2);

	if (tyyppi === 'mummot') {
		p.fillStyle = '#b45570';
		p.beginPath(); p.arc(0, -18, 7.8, Math.PI, Math.PI * 2); p.fill();
		p.strokeStyle = '#8e6b45'; p.lineWidth = 2;
		p.beginPath(); p.moveTo(9, -2); p.lineTo(15, 6); p.stroke();
		p.fillStyle = '#8e6b45'; p.fillRect(12, 5, 7, 3);
	} else if (tyyppi === 'latkajatka') {
		p.fillStyle = '#e0e6ef';
		p.beginPath(); p.arc(0, -18, 8.2, Math.PI, Math.PI * 2); p.fill();
		p.strokeStyle = '#9aa6b8'; p.lineWidth = 1;
		for (let i = -2; i <= 2; i++) {
			p.beginPath(); p.moveTo(i * 2.6, -16); p.lineTo(i * 2.6, -12); p.stroke();
		}
		p.strokeStyle = '#8a6033'; p.lineWidth = 2.5;
		p.beginPath(); p.moveTo(8, -4); p.lineTo(17, 8); p.stroke();
		p.fillStyle = '#20262f'; p.fillRect(15, 7, 8, 3);
	} else if (tyyppi === 'keihas') {
		p.strokeStyle = '#8a6033'; p.lineWidth = 2;
		p.beginPath(); p.moveTo(6, -14); p.lineTo(12, 10); p.stroke();
		p.fillStyle = '#cfd6e2';
		p.beginPath(); p.moveTo(6, -14); p.lineTo(3, -20); p.lineTo(9, -18); p.closePath(); p.fill();
	} else if (tyyppi === 'metsuri') {
		p.fillStyle = '#a8442f'; p.fillRect(-9, -10, 18, 18);
		p.strokeStyle = 'rgba(255,255,255,.35)'; p.lineWidth = 1;
		for (let i = -1; i <= 1; i++) {
			p.beginPath(); p.moveTo(i * 6, -10); p.lineTo(i * 6, 8); p.stroke();
			p.beginPath(); p.moveTo(-9, i * 6); p.lineTo(9, i * 6); p.stroke();
		}
		p.fillStyle = vari; p.fillRect(-9, -10, 18, 4);
		p.strokeStyle = '#7a5433'; p.lineWidth = 2.5;
		p.beginPath(); p.moveTo(9, -2); p.lineTo(17, -12); p.stroke();
		p.fillStyle = '#cfd6e2';
		p.beginPath(); p.moveTo(15, -14); p.lineTo(22, -10); p.lineTo(16, -6); p.closePath(); p.fill();
	}
	p.restore();
}

// ---- rakennukset ------------------------------------------------------------

export function piirraRakennus(p, e, oma) {
	const x = px(e.x);
	const y = px(e.y);
	const vari = oma ? VARI_OMA : VARI_VASTUS;
	const kioski = e.sub === 'kioski';
	const w = kioski ? 62 : 84;
	const h = kioski ? 44 : 62;
	if (e.dead) {
		p.fillStyle = 'rgba(90,96,110,.55)';
		p.fillRect(x - w / 2, y - h / 2 + h * 0.4, w, h * 0.6);
		p.fillStyle = 'rgba(60,64,74,.7)';
		p.fillRect(x - w / 2, y + h * 0.28, w, 6);
		return;
	}
	p.fillStyle = 'rgba(0,0,0,.18)';
	p.fillRect(x - w / 2 + 3, y - h / 2 + 5, w, h);
	p.fillStyle = '#8a6236';
	p.fillRect(x - w / 2, y - h / 2, w, h);
	p.fillStyle = 'rgba(255,255,255,.14)';
	p.fillRect(x - w / 2, y - h / 2, w, 6);
	if (kioski) {
		// Raidallinen markiisi kertoo puolen ilman tekstia.
		for (let i = 0; i < 6; i++) {
			p.fillStyle = i % 2 === 0 ? vari : '#f2f4f8';
			p.fillRect(x - w / 2 + i * (w / 6), y - h / 2 - 10, w / 6, 10);
		}
		p.fillStyle = '#f0e3c8';
		p.fillRect(x - w / 2 + 8, y - 4, w - 16, 12);
	} else {
		p.fillStyle = vari;
		p.beginPath();
		p.moveTo(x - w / 2 - 6, y - h / 2);
		p.lineTo(x, y - h / 2 - 20);
		p.lineTo(x + w / 2 + 6, y - h / 2);
		p.closePath();
		p.fill();
		p.fillStyle = '#5c4028';
		p.fillRect(x - 10, y + 2, 20, h / 2 - 2);
	}
	hpPalkki(p, x, y - h / 2 - (kioski ? 20 : 30), 54, e.hp, e.max_hp, vari);
}

export function hpPalkki(p, x, y, leveys, hp, max_hp, vari) {
	const osuus = Math.max(0, Math.min(1, hp / max_hp));
	p.fillStyle = 'rgba(16,20,28,.85)';
	p.fillRect(x - leveys / 2 - 1, y - 1, leveys + 2, 7);
	p.fillStyle = vari;
	p.fillRect(x - leveys / 2, y, leveys * osuus, 5);
}
