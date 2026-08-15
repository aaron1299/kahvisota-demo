// Harjoitusvastustaja, kaannos tiedostosta game/scripts/bot.gd.
// Taysin saannonmukainen: sama pelitilanne tuottaa aina saman siirron, joten
// myos harjoitusottelu on toistettavissa. Panosotteluissa vastassa on aina
// toinen ihminen, koska talo ei ole pelissa osapuolena.

import * as Sim from './sim.js';

const absi = (a) => (a < 0 ? -a : a);
const clampi = (v, lo, hi) => (v < lo ? lo : (v > hi ? hi : v));
const idiv = (a, b) => Math.trunc(a / b);

export class Bot {
	constructor(botinJoukkue = 1) {
		this.team = botinJoukkue;
		this.last_action_tick = -999;
		this.reaction_ticks = 15;
	}

	// Palauttaa joko null tai { team, card, x, y }.
	decide(sim) {
		if (sim.over) return null;
		if (sim.tick - this.last_action_tick < this.reaction_ticks) return null;

		const uhka = this._biggestThreat(sim);
		if (uhka) {
			const lane_x = this._laneX(uhka.x);
			const y = this._defendY(sim, uhka.y);
			// Ensisijainen vastaus, sitten varalla olevat. Jaahdytys tai kahvi
			// voi estaa parhaan vaihtoehdon, jolloin otetaan seuraava.
			for (const kortti of this._countersFor(uhka)) {
				const siirto = this._josKelpaa(sim, kortti, lane_x, y);
				if (siirto) return siirto;
			}
			return null;
		}

		const coffee = sim.coffee[this.team];
		const lane = idiv(sim.tick, 900) % 2;
		const x = Sim.BRIDGE_X[lane];

		// Oma yksikko paasi yli joen: tuetaan sita heti.
		if (this._ownUnitPastRiver(sim) && coffee >= 3500) {
			for (const kortti of ['keihas', 'metsuri', 'mummot']) {
				const tuki = this._josKelpaa(sim, kortti, this._pushLaneX(sim), this._supportY(sim));
				if (tuki) return tuki;
			}
		}

		// Taysi kahvi menee hukkaan, joten kalliskin kortti kannattaa laittaa.
		if (coffee >= 11000) {
			for (const kortti of ['hirvi', 'metsuri', 'latkajatka']) {
				const iso = this._josKelpaa(sim, kortti, x, this._backY(sim));
				if (iso) return iso;
			}
		}
		if (coffee >= 8500 && sim.tick > 600) {
			for (const kortti of ['poro', 'latkajatka', 'keihas']) {
				const paine = this._josKelpaa(sim, kortti, x, this._pushY(sim));
				if (paine) return paine;
			}
		}
		return null;
	}

	_josKelpaa(sim, kortti, x, y) {
		if (!sim.canDeploy(this.team, kortti, x, y)) return null;
		this.last_action_tick = sim.tick;
		return { team: this.team, card: kortti, x, y };
	}

	_biggestThreat(sim) {
		let best = null;
		let best_score = 0;
		for (const e of sim.ents) {
			if (e.dead || e.team === this.team || e.kind !== Sim.KIND_UNIT) continue;
			const omalla_puolella = this.team === 1 ? (e.y < Sim.RIVER_Y) : (e.y > Sim.RIVER_Y);
			const lahella_jokea = absi(e.y - Sim.RIVER_Y) < 3200;
			if (!omalla_puolella && !lahella_jokea) continue;
			// Kestava ja kovaa lyova yksikko on kiireellisin, ja rakennuksiin
			// tahtaava poro on erityisen kiireellinen.
			let score = e.hp + e.dmg * 4;
			if (e.only_buildings) score += 1200;
			if (score > best_score) {
				best_score = score;
				best = e;
			}
		}
		return best;
	}

	_countersFor(uhka) {
		switch (uhka.type) {
			case 'hyttyset': return ['keihas', 'rantasade', 'mummot'];
			case 'mummot': return ['rantasade', 'latkajatka', 'hirvi'];
			case 'hirvi': return ['metsuri', 'mummot', 'latkajatka'];
			case 'metsuri': return ['mummot', 'keihas', 'latkajatka'];
			case 'poro': return ['mummot', 'latkajatka', 'metsuri'];
			case 'keihas': return ['latkajatka', 'mummot', 'rantasade'];
			default: return ['latkajatka', 'mummot', 'metsuri'];
		}
	}

	_laneX(threatX) {
		return threatX < idiv(Sim.FIELD_W, 2) ? Sim.BRIDGE_X[0] : Sim.BRIDGE_X[1];
	}

	// Kaista, jolla omat yksikot jo ovat: tuki menee sinne eika tyhjalle puolelle.
	_pushLaneX(sim) {
		for (const e of sim.ents) {
			if (e.dead || e.team !== this.team || e.kind !== Sim.KIND_UNIT) continue;
			const yli = this.team === 1 ? (e.y > Sim.RIVER_Y) : (e.y < Sim.RIVER_Y);
			if (yli) return this._laneX(e.x);
		}
		return Sim.BRIDGE_X[0];
	}

	_defendY(sim, threatY) {
		// Puolustus asetetaan oman kioskin eteen, ei uhkan paalle.
		if (this.team === 1) return clampi(threatY - 1500, 1200, sim.ownHalfLimit(1));
		return clampi(threatY + 1500, sim.ownHalfLimit(0), Sim.FIELD_H - 1200);
	}

	_supportY() {
		return this.team === 1 ? Sim.LAAJENNUS_Y : Sim.FIELD_H - Sim.LAAJENNUS_Y;
	}

	_backY() {
		return this.team === 1 ? Sim.FIELD_H - Sim.SAUNA_Y - 700 : Sim.SAUNA_Y + 700;
	}

	_pushY(sim) {
		return this.team === 1 ? sim.ownHalfLimit(1) - 200 : sim.ownHalfLimit(0) + 200;
	}

	_ownUnitPastRiver(sim) {
		for (const e of sim.ents) {
			if (e.dead || e.team !== this.team || e.kind !== Sim.KIND_UNIT) continue;
			if (this.team === 1 && e.y > Sim.RIVER_Y) return true;
			if (this.team === 0 && e.y < Sim.RIVER_Y) return true;
		}
		return false;
	}
}
