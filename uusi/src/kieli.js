// Kayttoliittyman tekstit. Kieli valitaan osoitteen ?lang= parametrilla tai
// selaimen kielesta. Kaikki ulos nakyva teksti kulkee taman lapi.

const T = {
	otsikko: { fi: 'KAHVISOTA', en: 'KAHVISOTA' },
	tagline: {
		fi: 'Taito- ja taktiikkapeli kahdelle. Ei arpaonnea, ei jakajaa.',
		en: 'A game of skill and tactics for two. No chance, no dealer.',
	},
	saldo: { fi: 'Saldo %s demokrediittiä', en: 'Balance %s demo credits' },
	harjoitus: { fi: 'Harjoitusottelu', en: 'Practice match' },
	panos: { fi: 'Panosottelu', en: 'Stake match' },
	saannot: { fi: 'Säännöt ja kortit', en: 'Rules and cards' },
	taitopeli: { fi: 'Miksi tämä on taitopeli', en: 'Why this is a game of skill' },
	vastuu: { fi: 'Vastuullinen pelaaminen', en: 'Responsible gaming' },
	takaisin: { fi: 'Takaisin', en: 'Back' },
	taso_otsikko: { fi: 'Valitse vaikeustaso', en: 'Choose a difficulty' },
	taso_helppo: { fi: 'Helppo', en: 'Easy' },
	taso_normaali: { fi: 'Normaali', en: 'Normal' },
	taso_kova: { fi: 'Kova', en: 'Hard' },
	taso_vaste: { fi: 'vasteaika %s s', en: 'reaction %s s' },
	voitto: { fi: 'Voitto', en: 'You win' },
	tappio: { fi: 'Tappio', en: 'You lose' },
	tasapeli: { fi: 'Tasapeli', en: 'Draw' },
	uusi: { fi: 'Uusi ottelu', en: 'New match' },
	valikkoon: { fi: 'Valikkoon', en: 'Main menu' },
	kaadot: { fi: 'Kaadot %d – %d', en: 'Towers %d – %d' },
	tunnus: { fi: 'Ottelu %s', en: 'Round %s' },
	summa: { fi: 'Tarkistussumma %s', en: 'Checksum %s' },
	ei_palvelinta: {
		fi: 'Panosottelu vaatii ottelupalvelimen, jota esittelyversiossa ei ole. Paina Harjoitusottelu.',
		en: 'A stake match needs the match server, which is not part of this demo. Press Practice match.',
	},
	lisaaika: { fi: 'LISÄAIKA', en: 'OVERTIME' },
	kahvi: { fi: 'KAHVI', en: 'COFFEE' },
	vinkki: {
		fi: 'Valitse kortti alhaalta ja napauta omaa puoltasi.',
		en: 'Pick a card below and tap your own half.',
	},
};

export let kieli = 'fi';

export function valitseKieli() {
	const kysely = new URLSearchParams(location.search).get('lang');
	if (kysely === 'fi' || kysely === 'en') {
		kieli = kysely;
	} else {
		kieli = (navigator.language || 'en').toLowerCase().startsWith('fi') ? 'fi' : 'en';
	}
	document.documentElement.lang = kieli;
	return kieli;
}

export function aseta(uusi) {
	kieli = uusi === 'fi' ? 'fi' : 'en';
	document.documentElement.lang = kieli;
}

export function t(avain, arvot = []) {
	const rivi = T[avain];
	if (!rivi) return avain;
	let teksti = rivi[kieli] || rivi.en;
	for (const a of arvot) teksti = teksti.replace(/%[sd]/, String(a));
	return teksti;
}
