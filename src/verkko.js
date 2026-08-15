// Panosottelun verkkoyhteys. Palvelin on auktoriteetti: se paattaa mihin
// tikkiin syote osuu ja tilittaa panokset. Tama moduuli ei sisalla yhtaan
// pelisaantoa, se vain valittaa.
//
// Palvelimen osoite tulee osoiterivilta parametrilla ?palvelin=, tai jos sita
// ei ole, samasta paikasta josta sivu ladattiin. Julkaistussa esittelyssa
// palvelinta ei ole, jolloin peli kertoo sen selkeasti eika jaa jumiin.

export function palvelimenOsoite() {
	const kysely = new URLSearchParams(location.search).get('palvelin');
	if (kysely) return kysely;
	if (location.protocol === 'file:') return null;
	// GitHub Pages tarjoaa vain tiedostoja, joten siella ei ole palvelinta.
	if (location.hostname.endsWith('github.io')) return null;
	const skeema = location.protocol === 'https:' ? 'wss://' : 'ws://';
	return skeema + location.host + '/';
}

export class Verkko {
	constructor(kasittelijat) {
		this.k = kasittelijat;
		this.soketti = null;
		this.puoli = -1;
		this.tunnus = '';
	}

	yhdista(panos) {
		const osoite = palvelimenOsoite();
		if (!osoite) {
			this.k.virhe('ei_palvelinta');
			return false;
		}
		try {
			this.soketti = new WebSocket(osoite);
		} catch (e) {
			this.k.virhe('ei_palvelinta');
			return false;
		}
		this.soketti.addEventListener('open', () => {
			this.laheta({ t: 'jono', panos });
		});
		this.soketti.addEventListener('message', (e) => {
			let v = null;
			try { v = JSON.parse(e.data); } catch (err) { return; }
			this.kasittele(v);
		});
		this.soketti.addEventListener('error', () => this.k.virhe('yhteys'));
		this.soketti.addEventListener('close', () => this.k.katkesi());
		return true;
	}

	kasittele(v) {
		if (v.t === 'jono_tila') this.k.jono(v.teksti);
		else if (v.t === 'alku') {
			this.puoli = v.puoli;
			this.tunnus = v.tunnus;
			this.k.alku(v);
		} else if (v.t === 'tikki') this.k.tikki(v.tick, v.syotteet);
		else if (v.t === 'summapyynto') this.k.summapyynto(v.tick);
		else if (v.t === 'loppu') this.k.loppu(v);
		else if (v.t === 'virhe') this.k.virhe(v.teksti);
	}

	laheta(obj) {
		if (!this.soketti || this.soketti.readyState !== 1) return;
		this.soketti.send(JSON.stringify(obj));
	}

	syote(card, x, y) {
		this.laheta({ t: 'syote', card, x, y });
	}

	summa(tick, hash) {
		this.laheta({ t: 'summa', tick, hash });
	}

	katkaise() {
		if (!this.soketti) return;
		try {
			this.laheta({ t: 'poistu' });
			this.soketti.close();
		} catch (e) { /* jo kiinni */ }
		this.soketti = null;
	}
}
