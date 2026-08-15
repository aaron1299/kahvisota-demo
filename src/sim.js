// Kahvisodan ottelusimulaatio, kaannos tiedostosta game/scripts/sim.gd.
//
// Kaksi ehtoa, joiden varassa koko tuote on:
//   1. Ei satunnaisuutta. Taalla ei arvota mitaan.
//   2. Ei liukulukuja tilassa. Kaikki koordinaatit, osumapisteet ja ajastimet
//      ovat kokonaislukuja, joten sama syotelista tuottaa bitilleen saman
//      lopputuloksen jokaisella koneella.
//
// Kaannoksen ehdoton vaatimus: tarkistussumman on oltava sama kuin
// GDScript-versiossa. Siksi jokainen jakolasku on katkaiseva kokonaislukujako
// ja tarkistussumma lasketaan 32-bittisena Math.imul-kertolaskulla.

import * as Cards from './cards.js';

// ---- areenan mitat (simulaatioyksikkoa, 1000 u = 1 ruutu) -------------------

export const FIELD_W = 18000;
export const FIELD_H = 26000;
export const RIVER_Y = 13000;
export const RIVER_HALF = 700;
export const BRIDGE_X = [4400, 13600];
export const BRIDGE_HALF = 1200;
export const KIOSKI_Y = 19200;
export const SAUNA_Y = 23400;
export const LAAJENNUS_Y = 6200;

export const TPS = 30;
export const MATCH_TICKS = 4500;
export const OVERTIME_TICKS = 2700;
export const COFFEE_MAX = 12000;
export const COFFEE_START = 6000;
export const COFFEE_RATE = 13;
export const COFFEE_RATE_OT = 26;
export const SPAWN_DELAY = 30;
export const BODY_RADIUS = 260;

export const CARD_CD = 90;
export const SPELL_CD = 165;

export const KIND_UNIT = 0;
export const KIND_BUILDING = 1;
export const KIND_PROJECTILE = 2;

export const RESULT_KESKEN = -1;
export const RESULT_SININEN = 0;
export const RESULT_PUNAINEN = 1;
export const RESULT_TASAPELI = 2;

// ---- kokonaislukuapurit -----------------------------------------------------
// GDScriptin kokonaislukujako katkaisee kohti nollaa, samoin Math.trunc.

const idiv = (a, b) => Math.trunc(a / b);
const clampi = (v, lo, hi) => (v < lo ? lo : (v > hi ? hi : v));
const mini = (a, b) => (a < b ? a : b);
const maxi = (a, b) => (a > b ? a : b);
const absi = (a) => (a < 0 ? -a : a);

export function isqrt(n) {
	if (n <= 0) return 0;
	let x = n;
	let y = (x + 1) >> 1;
	while (y < x) {
		x = y;
		y = (x + idiv(n, x)) >> 1;
	}
	return x;
}

export function dist(ax, ay, bx, by) {
	const dx = ax - bx;
	const dy = ay - by;
	return isqrt(dx * dx + dy * dy);
}

// FNV-1a. GDScript laskee 64-bittisilla kokonaisluvuilla ja katkaisee 32
// bittiin; Math.imul antaa saman tuloksen ilman tarkkuuden menetysta.
function mix(h, v) {
	const x = (h ^ (v >>> 0)) >>> 0;
	return Math.imul(x, 16777619) >>> 0;
}

export class Sim {
	constructor() {
		this.tick = 0;
		this.coffee = [COFFEE_START, COFFEE_START];
		this.ents = [];
		this.next_id = 1;
		this.over = false;
		this.result = RESULT_KESKEN;
		this.kaadot = [0, 0];
		this.overtime = false;
		this.card_cd = [new Map(), new Map()];
		this.stats = [
			{ kahvi: 0, kortit: 0, vahinko: 0, torni_vahinko: 0 },
			{ kahvi: 0, kortit: 0, vahinko: 0, torni_vahinko: 0 },
		];
		this.input_log = [];
		this.fx = [];
		this.pending = [];
		this._buildTowers();
	}

	// ---- rakentaminen -------------------------------------------------------

	_mirrorY(y) { return FIELD_H - y; }

	_buildTowers() {
		for (const team of [0, 1]) {
			const flip = (team === 1);
			for (const lane of [0, 1]) {
				const x = BRIDGE_X[lane];
				const y = flip ? this._mirrorY(KIOSKI_Y) : KIOSKI_Y;
				this._addBuilding(team, 'kioski', lane, x, y);
			}
			const sy = flip ? this._mirrorY(SAUNA_Y) : SAUNA_Y;
			this._addBuilding(team, 'sauna', -1, 9000, sy);
		}
	}

	_addBuilding(team, sub, lane, x, y) {
		const t = Cards.TOWERS[sub];
		const e = {
			id: this.next_id, team, kind: KIND_BUILDING, type: sub, sub, lane, x, y,
			hp: t.hp, max_hp: t.hp, dmg: t.dmg, atk_cd: t.atk_cd, cd: 0,
			rng: t.rng, sight: t.rng, speed: 0,
			flying: false, hits_air: t.hits_air, only_buildings: false, ranged: true,
			proj_speed: t.proj_speed, splash: 0, slow: 0, target: 0, ready_at: 0,
			dead: false, active: sub !== 'sauna', tx: 0, ty: 0, dmg_out: 0, owner: 0,
		};
		this.next_id += 1;
		this.ents.push(e);
		return e;
	}

	_addUnit(team, key, x, y) {
		const c = Cards.CARDS[key];
		const e = {
			id: this.next_id, team, kind: KIND_UNIT, type: key, sub: '',
			lane: x < idiv(FIELD_W, 2) ? 0 : 1,
			x: clampi(x, 200, FIELD_W - 200),
			y: clampi(y, 200, FIELD_H - 200),
			hp: c.hp, max_hp: c.hp, dmg: c.dmg, atk_cd: c.atk_cd, cd: 0,
			rng: c.rng, sight: c.sight, speed: c.speed,
			flying: c.flying, hits_air: c.hits_air, only_buildings: c.only_buildings,
			ranged: c.ranged, proj_speed: c.proj_speed, splash: c.splash,
			slow: 0, target: 0, ready_at: this.tick + SPAWN_DELAY,
			dead: false, active: true, tx: 0, ty: 0, dmg_out: 0, owner: team,
		};
		this.next_id += 1;
		this.ents.push(e);
		return e;
	}

	_addProjectile(from, target_id, tx, ty, dmg, splash) {
		const e = {
			id: this.next_id, team: from.team, kind: KIND_PROJECTILE, type: 'ammus', sub: '',
			lane: 0, x: from.x, y: from.y, hp: 1, max_hp: 1, dmg, atk_cd: 0, cd: 0,
			rng: 0, sight: 0, speed: from.proj_speed,
			flying: true, hits_air: true, only_buildings: false, ranged: false,
			proj_speed: from.proj_speed, splash, slow: 0, target: target_id, ready_at: 0,
			dead: false, active: true, tx, ty, dmg_out: 0, owner: from.team,
		};
		this.next_id += 1;
		this.ents.push(e);
	}

	// ---- korttien asettaminen ----------------------------------------------

	ownHalfLimit(team) {
		return team === 0 ? RIVER_Y + RIVER_HALF + 700 : RIVER_Y - RIVER_HALF - 700;
	}

	canDeploy(team, key, x, y) {
		if (this.over) return false;
		const c = Cards.CARDS[key];
		if (!c) return false;
		if (this.coffee[team] < c.cost * 1000) return false;
		if (this.cooldownLeft(team, key) > 0) return false;
		if (x < 400 || x > FIELD_W - 400 || y < 400 || y > FIELD_H - 400) return false;
		if (c.laji === 'loitsu') return true;
		if (team === 0) {
			if (y >= this.ownHalfLimit(0)) return true;
		} else if (y <= this.ownHalfLimit(1)) {
			return true;
		}
		const lane = x < idiv(FIELD_W, 2) ? 0 : 1;
		if (this._enemyKioskiDown(team, lane)) {
			if (team === 0) return y >= LAAJENNUS_Y;
			return y <= FIELD_H - LAAJENNUS_Y;
		}
		return false;
	}

	_enemyKioskiDown(team, lane) {
		for (const e of this.ents) {
			if (e.kind === KIND_BUILDING && e.team !== team && e.sub === 'kioski' && e.lane === lane) {
				return e.dead;
			}
		}
		return true;
	}

	deploy(team, key, x, y) {
		if (!this.canDeploy(team, key, x, y)) return false;
		const c = Cards.CARDS[key];
		this.coffee[team] -= c.cost * 1000;
		this.card_cd[team].set(key, this.tick + (c.laji === 'loitsu' ? SPELL_CD : CARD_CD));
		this.stats[team].kahvi += c.cost * 1000;
		this.stats[team].kortit += 1;
		if (c.laji === 'loitsu') {
			this._castSpell(team, key, x, y);
			return true;
		}
		const spread = Cards.SPREAD[c.count] || Cards.SPREAD[1];
		for (const off of spread) {
			// Peilataan asettelu ylapuolen pelaajalle, jotta molemmilla on
			// tasmalleen sama muodostelma omasta suunnastaan katsottuna.
			let ox = off[0];
			let oy = off[1];
			if (team === 1) { ox = -ox; oy = -oy; }
			this._addUnit(team, key, x + ox, y + oy);
		}
		return true;
	}

	_castSpell(team, key, x, y) {
		const c = Cards.CARDS[key];
		const r = c.radius;
		const slow = c.slow;
		this.fx.push({ laji: 'loitsu', x, y, r });
		for (const e of this.ents) {
			if (e.dead || e.team === team || e.kind === KIND_PROJECTILE) continue;
			if (dist(e.x, e.y, x, y) > r) continue;
			const d = e.kind === KIND_BUILDING ? c.rakennus_dmg : c.dmg;
			this._damage(e, d, team);
			if (e.kind === KIND_UNIT) e.slow = maxi(e.slow, slow);
		}
	}

	// ---- yksi tikki ---------------------------------------------------------

	step(inputs = []) {
		if (this.over) return;
		this.tick += 1;
		this.fx.length = 0;

		const rate = this.overtime ? COFFEE_RATE_OT : COFFEE_RATE;
		for (const t of [0, 1]) {
			this.coffee[t] = mini(COFFEE_MAX, this.coffee[t] + rate);
		}

		// Jarjestys: joukkue, sitten saapumisjarjestys. JavaScriptin sort on
		// vakaa, joten saman joukkueen syotteet pysyvat jarjestyksessaan.
		const ordered = inputs.slice().sort((a, b) => a.team - b.team);
		for (const inp of ordered) {
			const ok = this.deploy(inp.team, inp.card, inp.x, inp.y);
			if (ok) {
				this.input_log.push({
					tick: this.tick, team: inp.team, card: inp.card, x: inp.x, y: inp.y,
				});
			}
		}

		for (const e of this.ents) {
			if (e.dead) continue;
			if (e.kind === KIND_UNIT) this._stepUnit(e);
			else if (e.kind === KIND_BUILDING) this._stepBuilding(e);
			else if (e.kind === KIND_PROJECTILE) this._stepProjectile(e);
		}

		this._applyDamage();
		this._separateBodies();
		this._collectDead();
		this._checkEnd();
	}

	_stepUnit(e) {
		if (this.tick < e.ready_at) return;
		if (e.cd > 0) e.cd -= 1;
		if (e.slow > 0) e.slow -= 1;

		const target = this._resolveTarget(e);
		if (!target) return;

		const d = dist(e.x, e.y, target.x, target.y);
		if (d <= e.rng) {
			if (e.cd <= 0) {
				this._attack(e, target);
				let cd = e.atk_cd;
				if (e.slow > 0) cd = cd + idiv(cd, 2);
				e.cd = cd;
			}
			return;
		}

		let speed = e.speed;
		if (e.slow > 0) speed = idiv(speed, 2);
		const wp = this._waypoint(e, target);
		this._moveTowards(e, wp[0], wp[1], speed);
	}

	_stepBuilding(e) {
		if (e.cd > 0) e.cd -= 1;
		if (!e.active) return;
		const target = this._nearestEnemyUnit(e, e.rng);
		if (!target) return;
		if (e.cd <= 0) {
			this._attack(e, target);
			e.cd = e.atk_cd;
		}
	}

	_stepProjectile(e) {
		const target = this._byId(e.target);
		if (target && !target.dead) {
			e.tx = target.x;
			e.ty = target.y;
		}
		const d = dist(e.x, e.y, e.tx, e.ty);
		if (d <= e.speed) {
			e.x = e.tx;
			e.y = e.ty;
			this._projectileHit(e);
			e.dead = true;
			return;
		}
		this._moveTowards(e, e.tx, e.ty, e.speed);
	}

	_projectileHit(e) {
		this.fx.push({ laji: 'osuma', x: e.x, y: e.y, dmg: e.dmg, team: e.team });
		if (e.splash > 0) {
			for (const o of this.ents) {
				if (o.dead || o.team === e.team || o.kind === KIND_PROJECTILE) continue;
				if (dist(o.x, o.y, e.x, e.y) <= e.splash) this._damage(o, e.dmg, e.team);
			}
			return;
		}
		const target = this._byId(e.target);
		if (!target || target.dead) return;
		this._damage(target, e.dmg, e.team);
	}

	_attack(e, target) {
		if (e.ranged) {
			this._addProjectile(e, target.id, target.x, target.y, e.dmg, e.splash);
		} else {
			this.fx.push({ laji: 'isku', x: target.x, y: target.y, dmg: e.dmg, team: e.team });
			this._damage(target, e.dmg, e.team);
		}
	}

	// Vahinko ei osu heti vaan kertyy jonoon, joka puretaan tikin lopussa.
	// Nain kumpikaan puoli ei hyody siita, missa jarjestyksessa yksikot
	// kasitellaan: samalla tikilla annetut iskut osuvat aina molemmat.
	_damage(target, amount, from_team) {
		if (target.dead) return;
		this.pending.push({ id: target.id, amount, from: from_team });
	}

	_applyDamage() {
		for (const row of this.pending) {
			const target = this._byId(row.id);
			if (!target || target.dead) continue;
			// Kirjataan vain se vahinko joka oikeasti osui, ei ylivuotoa.
			const tehosi = mini(row.amount, target.hp);
			const tekija = row.from;
			if (tekija === 0 || tekija === 1) {
				if (target.kind === KIND_BUILDING) this.stats[tekija].torni_vahinko += tehosi;
				else this.stats[tekija].vahinko += tehosi;
			}
			target.hp -= row.amount;
			if (target.kind === KIND_BUILDING && target.sub === 'sauna') target.active = true;
			if (target.hp <= 0) {
				target.hp = 0;
				target.dead = true;
				this.fx.push({
					laji: 'kuolema', x: target.x, y: target.y, team: target.team,
					tappaja: row.from, rakennus: target.kind === KIND_BUILDING,
				});
				if (target.kind === KIND_BUILDING) this._onTowerDown(target, row.from);
			}
		}
		this.pending.length = 0;
	}

	_onTowerDown(tower, from_team) {
		this.kaadot[from_team] += 1;
		this.fx.push({ laji: 'torni', x: tower.x, y: tower.y });
		if (tower.sub === 'kioski') {
			for (const e of this.ents) {
				if (e.kind === KIND_BUILDING && e.team === tower.team && e.sub === 'sauna') e.active = true;
			}
		}
		if (tower.sub === 'sauna') {
			// Jos molemmat saunat kaatuvat samalla tikilla, ottelu on tasapeli.
			if (this.over && this.result !== from_team) this.result = RESULT_TASAPELI;
			else this.result = from_team;
			this.over = true;
			return;
		}
		if (this.overtime) {
			if (this.over && this.result !== from_team) this.result = RESULT_TASAPELI;
			else this.result = from_team;
			this.over = true;
		}
	}

	// ---- kohteen valinta ----------------------------------------------------

	_resolveTarget(e) {
		const cur = this._byId(e.target);
		const need_new = !cur || cur.dead;
		// Kohde tarkistetaan puolen sekunnin valein, ei joka tikilla.
		if (!need_new && (this.tick + e.id) % 15 !== 0) return cur;
		let found = null;
		if (!e.only_buildings) found = this._nearestEnemyUnit(e, e.sight);
		if (!found) found = this._nearestEnemyBuilding(e);
		if (!found) return cur;
		e.target = found.id;
		return found;
	}

	_nearestEnemyUnit(e, radius) {
		let best = null;
		let best_d = Number.MAX_SAFE_INTEGER;
		for (const o of this.ents) {
			if (o.dead || o.team === e.team) continue;
			if (o.kind !== KIND_UNIT) continue;
			if (this.tick < o.ready_at) continue;
			if (o.flying && !e.hits_air) continue;
			const d = dist(e.x, e.y, o.x, o.y);
			if (d > radius) continue;
			// Tasapelin ratkaisee id, joten valinta on aina sama.
			if (d < best_d || (d === best_d && best && o.id < best.id)) {
				best_d = d;
				best = o;
			}
		}
		return best;
	}

	_nearestEnemyBuilding(e) {
		let best = null;
		let best_d = Number.MAX_SAFE_INTEGER;
		for (const o of this.ents) {
			if (o.dead || o.team === e.team || o.kind !== KIND_BUILDING) continue;
			if (o.sub === 'sauna' && !this._kioskitKaatuneet(o.team, e)) continue;
			const d = dist(e.x, e.y, o.x, o.y);
			if (d < best_d || (d === best_d && best && o.id < best.id)) {
				best_d = d;
				best = o;
			}
		}
		if (!best) {
			// Varajarjestely: jos suodatin sulki kaiken, otetaan lahin rakennus.
			for (const o of this.ents) {
				if (o.dead || o.team === e.team || o.kind !== KIND_BUILDING) continue;
				const d2 = dist(e.x, e.y, o.x, o.y);
				if (d2 < best_d) {
					best_d = d2;
					best = o;
				}
			}
		}
		return best;
	}

	_kioskitKaatuneet(team, attacker) {
		const lane = attacker.x < idiv(FIELD_W, 2) ? 0 : 1;
		for (const e of this.ents) {
			if (e.kind === KIND_BUILDING && e.team === team && e.sub === 'kioski' && e.lane === lane) {
				return e.dead;
			}
		}
		return true;
	}

	// ---- liike --------------------------------------------------------------

	_waypoint(e, target) {
		const tx = target.x;
		const ty = target.y;
		if (e.flying) return [tx, ty];
		const y = e.y;
		const same_side = (y < RIVER_Y) === (ty < RIVER_Y);
		if (same_side) return [tx, ty];
		// Joen yli paasee vain siltaa pitkin.
		let bx = BRIDGE_X[0];
		if (absi(e.x - BRIDGE_X[1]) < absi(e.x - BRIDGE_X[0])) bx = BRIDGE_X[1];
		if (absi(e.x - bx) <= BRIDGE_HALF) {
			const over_y = ty < RIVER_Y ? RIVER_Y - RIVER_HALF - 400 : RIVER_Y + RIVER_HALF + 400;
			return [bx, over_y];
		}
		return [bx, RIVER_Y];
	}

	_moveTowards(e, tx, ty, speed) {
		if (speed <= 0) return;
		const dx = tx - e.x;
		const dy = ty - e.y;
		const d = isqrt(dx * dx + dy * dy);
		if (d === 0) return;
		if (d <= speed) {
			e.x = tx;
			e.y = ty;
			return;
		}
		e.x += idiv(dx * speed, d);
		e.y += idiv(dy * speed, d);
	}

	_separateBodies() {
		const n = this.ents.length;
		for (let i = 0; i < n; i++) {
			const a = this.ents[i];
			if (a.dead || a.kind !== KIND_UNIT || this.tick < a.ready_at) continue;
			for (let j = i + 1; j < n; j++) {
				const b = this.ents[j];
				if (b.dead || b.kind !== KIND_UNIT || this.tick < b.ready_at) continue;
				if (a.flying !== b.flying) continue;
				const dx = b.x - a.x;
				const dy = b.y - a.y;
				const d = isqrt(dx * dx + dy * dy);
				if (d >= BODY_RADIUS * 2) continue;
				if (d === 0) {
					a.x -= 40;
					b.x += 40;
					continue;
				}
				const push = idiv(BODY_RADIUS * 2 - d, 4);
				const px = idiv(dx * push, d);
				const py = idiv(dy * push, d);
				a.x = clampi(a.x - px, 200, FIELD_W - 200);
				a.y = clampi(a.y - py, 200, FIELD_H - 200);
				b.x = clampi(b.x + px, 200, FIELD_W - 200);
				b.y = clampi(b.y + py, 200, FIELD_H - 200);
			}
		}
	}

	_collectDead() {
		const keep = [];
		for (const e of this.ents) {
			if (e.dead && e.kind !== KIND_BUILDING) continue;
			keep.push(e);
		}
		this.ents = keep;
	}

	_checkEnd() {
		if (this.over) return;
		if (!this.overtime && this.tick >= MATCH_TICKS) {
			if (this.kaadot[0] !== this.kaadot[1]) {
				this.over = true;
				this.result = this.kaadot[0] > this.kaadot[1] ? RESULT_SININEN : RESULT_PUNAINEN;
			} else {
				this.overtime = true;
			}
			return;
		}
		if (this.overtime && this.tick >= MATCH_TICKS + OVERTIME_TICKS) {
			this.over = true;
			if (this.kaadot[0] === this.kaadot[1]) this.result = RESULT_TASAPELI;
			else this.result = this.kaadot[0] > this.kaadot[1] ? RESULT_SININEN : RESULT_PUNAINEN;
		}
	}

	// ---- apurit -------------------------------------------------------------

	_byId(id) {
		if (id <= 0) return null;
		for (const e of this.ents) {
			if (e.id === id) return e;
		}
		return null;
	}

	towerHp(team, sub, lane) {
		for (const e of this.ents) {
			if (e.kind === KIND_BUILDING && e.team === team && e.sub === sub && (lane < 0 || e.lane === lane)) {
				return e.hp;
			}
		}
		return 0;
	}

	cooldownLeft(team, key) {
		return maxi(0, (this.card_cd[team].get(key) || 0) - this.tick);
	}

	cooldownOsuus(team, key) {
		const c = Cards.CARDS[key];
		if (!c) return 0;
		const kokonais = c.laji === 'loitsu' ? SPELL_CD : CARD_CD;
		return this.cooldownLeft(team, key) / kokonais;
	}

	secondsLeft() {
		const limit = this.overtime ? MATCH_TICKS + OVERTIME_TICKS : MATCH_TICKS;
		return maxi(0, idiv(limit - this.tick, TPS));
	}

	// Tarkistussumma. Kaytetaan verkkopelissa desync-valvontaan seka
	// toistotodisteen vahvistamiseen. Sama arvo kuin GDScript-versiossa.
	stateHash() {
		let h = 2166136261;
		h = mix(h, this.tick);
		h = mix(h, this.coffee[0]);
		h = mix(h, this.coffee[1]);
		h = mix(h, this.kaadot[0]);
		h = mix(h, this.kaadot[1]);
		for (const avain of Cards.ORDER) {
			h = mix(h, this.cooldownLeft(0, avain));
			h = mix(h, this.cooldownLeft(1, avain));
		}
		for (const e of this.ents) {
			h = mix(h, e.id);
			h = mix(h, e.team);
			h = mix(h, e.kind);
			h = mix(h, e.x);
			h = mix(h, e.y);
			h = mix(h, e.hp);
			h = mix(h, e.cd);
			h = mix(h, e.dead ? 1 : 0);
		}
		return h;
	}
}

// Ottelun toisto: syotelokista rakennetaan sama ottelu uudelleen.
export function replay(log, untilTick) {
	const s = new Sim();
	const byTick = new Map();
	for (const row of log) {
		const t = row.tick;
		if (!byTick.has(t)) byTick.set(t, []);
		byTick.get(t).push(row);
	}
	while (s.tick < untilTick && !s.over) {
		const next = s.tick + 1;
		s.step(byTick.get(next) || []);
	}
	return s;
}
