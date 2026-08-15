// Korttitaulukko. Kaannos tiedostosta game/scripts/cards.gd, arvot muuttumatta.
// Kaikki luvut ovat kokonaislukuja, koska simulaatio on kokonaislukumatematiikkaa.

export const TICKS_PER_SECOND = 30;

// Jarjestys on osa protokollaa: verkkoviesteissa ja tarkistussummissa
// korttiin viitataan taman listan indeksilla.
export const ORDER = [
	'mummot',
	'latkajatka',
	'keihas',
	'hyttyset',
	'metsuri',
	'poro',
	'hirvi',
	'rantasade',
];

export const CARDS = {
	mummot: {
		nimi: 'Mummolauma', nimi_en: 'Granny Squad',
		cost: 4, laji: 'yksikko', count: 4,
		hp: 260, dmg: 60, atk_cd: 24, rng: 700, sight: 4500, speed: 42,
		flying: false, hits_air: false, only_buildings: false, ranged: false,
		proj_speed: 0, splash: 0,
	},
	latkajatka: {
		nimi: 'Lätkäjätkä', nimi_en: 'Hockey Bruiser',
		cost: 4, laji: 'yksikko', count: 1,
		hp: 1000, dmg: 140, atk_cd: 33, rng: 800, sight: 4500, speed: 36,
		flying: false, hits_air: false, only_buildings: false, ranged: false,
		proj_speed: 0, splash: 0,
	},
	keihas: {
		nimi: 'Keihäänheittäjä', nimi_en: 'Javelin Thrower',
		cost: 4, laji: 'yksikko', count: 2,
		hp: 270, dmg: 110, atk_cd: 36, rng: 5200, sight: 5600, speed: 33,
		flying: false, hits_air: true, only_buildings: false, ranged: true,
		proj_speed: 420, splash: 0,
	},
	hyttyset: {
		nimi: 'Hyttysparvi', nimi_en: 'Mosquitoes',
		cost: 3, laji: 'yksikko', count: 5,
		hp: 90, dmg: 45, atk_cd: 20, rng: 600, sight: 4500, speed: 52,
		flying: true, hits_air: true, only_buildings: false, ranged: false,
		proj_speed: 0, splash: 0,
	},
	metsuri: {
		nimi: 'Metsuri', nimi_en: 'Lumberjack',
		cost: 5, laji: 'yksikko', count: 1,
		hp: 1200, dmg: 340, atk_cd: 48, rng: 900, sight: 4000, speed: 36,
		flying: false, hits_air: false, only_buildings: false, ranged: false,
		proj_speed: 0, splash: 0,
	},
	poro: {
		nimi: 'Poro', nimi_en: 'Reindeer',
		cost: 5, laji: 'yksikko', count: 1,
		hp: 1400, dmg: 260, atk_cd: 36, rng: 900, sight: 3000, speed: 58,
		flying: false, hits_air: false, only_buildings: true, ranged: false,
		proj_speed: 0, splash: 0,
	},
	hirvi: {
		nimi: 'Hirvi', nimi_en: 'Moose',
		cost: 6, laji: 'yksikko', count: 1,
		hp: 2800, dmg: 200, atk_cd: 45, rng: 900, sight: 3000, speed: 22,
		flying: false, hits_air: false, only_buildings: false, ranged: false,
		proj_speed: 0, splash: 0,
	},
	rantasade: {
		nimi: 'Räntäsade', nimi_en: 'Sleet',
		cost: 2, laji: 'loitsu', count: 0,
		hp: 0, dmg: 260, rakennus_dmg: 80, radius: 3000, slow: 90,
		atk_cd: 0, rng: 0, sight: 0, speed: 0,
		flying: false, hits_air: true, only_buildings: false, ranged: false,
		proj_speed: 0, splash: 3000,
	},
};

// Kiintea asettelu monen yksikon korteille. Ei satunnaisuutta myoskaan tassa.
export const SPREAD = {
	1: [[0, 0]],
	2: [[-550, 0], [550, 0]],
	4: [[-620, -420], [620, -420], [-620, 420], [620, 420]],
	5: [[0, -650], [-720, 0], [720, 0], [-430, 650], [430, 650]],
};

// Tornien arvot. Molemmilla puolilla tasmalleen samat, areena on peilikuva.
export const TOWERS = {
	kioski: { nimi: 'Grillikioski', hp: 2600, dmg: 70, atk_cd: 24, rng: 6200, proj_speed: 520, hits_air: true },
	sauna: { nimi: 'Sauna', hp: 4500, dmg: 100, atk_cd: 30, rng: 6800, proj_speed: 520, hits_air: true },
};

export function cardIndex(key) {
	return ORDER.indexOf(key);
}

export function keyAt(index) {
	if (index < 0 || index >= ORDER.length) return '';
	return ORDER[index];
}
