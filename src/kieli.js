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
	aanet_paalla: { fi: 'Äänet: päällä', en: 'Sound: on' },
	aanet_pois: { fi: 'Äänet: pois', en: 'Sound: off' },
	ika: { fi: '18+  |  Pelaa vastuullisesti  |  versio %s', en: '18+  |  Play responsibly  |  version %s' },
	toisto: { fi: 'Katso viimeisin ottelu', en: 'Watch the last match' },
	toisto_ei: { fi: 'Tallennettua ottelua ei ole vielä.', en: 'There is no saved match yet.' },
	toisto_tila: { fi: 'Toisto  %s / %s', en: 'Replay  %s / %s' },
	toisto_poistu: { fi: 'Poistu toistosta', en: 'Exit replay' },
	toisto_vahvistettu: {
		fi: 'Tarkistussumma täsmää: ottelu eteni juuri näin.',
		en: 'Checksum matches: the match played out exactly like this.',
	},
	toisto_ristiriita: {
		fi: 'Tarkistussumma ei täsmää tallenteeseen.',
		en: 'The checksum does not match the recording.',
	},
	lataa_toisto: { fi: 'Lataa tallenne', en: 'Download the recording' },

	taito_otsikko: { fi: 'Miksi tämä on taitopeli', en: 'Why this is a game of skill' },
	taito_teksti: {
		fi: 'Kahvisodassa ei ole arpaonnea. Pakassa ovat aina samat kahdeksan korttia molemmilla pelaajilla, eikä korttien saapumisjärjestystä arvota. Simulaatio laskee kaiken kokonaisluvuilla, eikä osumia hajauteta satunnaisluvulla. Sama syötesarja tuottaa aina bitilleen saman lopputuloksen.\n\nSe tarkoittaa, että ottelun voi ajaa jälkikäteen uudelleen syötelokista ja osoittaa, että lopputulos seurasi pelaajien teoista. Jokaisesta ottelusta jää tarkistussumma, ja tämän pelin sisällä voit itse ajaa tarkistuksen: avaa toistokatselin, ja se laskee summan uudelleen ja vertaa sitä tallenteeseen.\n\nPelaajan ratkaisut ovat kahvin käyttö, korttien ajoitus, sijoittelu suhteessa siltoihin ja vastustajan yksiköihin sekä jäähdytysten hallinta. Kaikki nämä ovat opittavia taitoja, eivät onnenkauppaa.',
		en: 'There is no chance in Kahvisota. Both players always hold the same eight cards, and nothing about card order is drawn at random. The simulation runs on integers, and no hit is scattered by a random number. The same sequence of inputs always produces exactly the same result, down to the bit.\n\nThat means a match can be replayed afterwards from its input log and shown to have followed from the players’ decisions. Every match leaves a checksum, and you can run the check yourself inside this game: open the replay viewer and it recomputes the checksum and compares it against the recording.\n\nThe player decides how to spend coffee, when to play a card, where to place it relative to the bridges and the opponent’s units, and how to manage cooldowns. Those are learnable skills, not luck.',
	},
	vastuu_teksti: {
		fi: 'Peli on tarkoitettu täysi-ikäisille. Tässä esittelyversiossa pelataan ainoastaan demokrediiteillä, joilla ei ole rahallista arvoa eikä niitä voi ostaa, lunastaa tai siirtää.\n\nPeliaikamuistutus tulee ruudulle kahdenkymmenen minuutin välein. Panosottelussa panos, komissio ja voitto näytetään aina ennen ottelua ja sen jälkeen.\n\nJos pelaaminen huolestuttaa sinua tai läheistäsi, apua saa Peluurista numerosta 0800 100 101 ja osoitteesta peluuri.fi. Palvelu on maksuton ja luottamuksellinen.',
		en: 'This game is intended for adults. This demonstration build is played with demo credits only. They have no monetary value and cannot be bought, redeemed or transferred.\n\nA play-time reminder appears every twenty minutes. In a stake match the stake, the commission and the payout are always shown before and after the round.\n\nIf gambling worries you or someone close to you, help is available. In Finland, Peluuri offers free and confidential support at 0800 100 101 and peluuri.fi.',
	},
	muistutus_otsikko: { fi: 'Peliaikamuistutus', en: 'Play-time reminder' },
	muistutus_teksti: {
		fi: 'Olet pelannut %d minuuttia. Pidä tauko, jos peli alkaa tuntua pakonomaiselta.',
		en: 'You have played for %d minutes. Take a break if the game starts to feel compulsive.',
	},
	jatka: { fi: 'Jatka', en: 'Continue' },
	saannot_teksti: {
		fi: 'Ottelu kestää 2.30, ja tasatilanteessa pelataan 1.30 lisäaikaa, jolloin ensimmäinen kaadettu rakennus ratkaisee. Kahvia kertyy jatkuvasti, enintään kaksitoista. Kortin pelaaminen maksaa kahvia ja lataa sen hetkeksi.\n\nMolemmilla on kaksi grillikioskia ja niiden takana sauna. Sauna herää vasta kun sitä ammutaan tai kun oman puolen kioski kaatuu. Kaadettu kioski avaa vastustajalle oikeuden asettaa yksiköitä syvemmälle samalle kaistalle.\n\nYksiköt kulkevat joen yli vain siltoja pitkin, lentävät suoraan. Voiton ratkaisee kaadettujen rakennusten määrä, tai sauna, joka päättää ottelun heti.',
		en: 'A match lasts 2:30, and a tie goes to 1:30 of overtime where the first building to fall decides it. Coffee accrues continuously, up to twelve. Playing a card costs coffee and puts that card on a short cooldown.\n\nEach side has two grill kiosks and a sauna behind them. The sauna only wakes up when it is shot at or when a kiosk on its side falls. A fallen kiosk lets the opponent deploy deeper on that lane.\n\nGround units cross the river only over the bridges; flyers go straight. The winner is decided by buildings destroyed, or by the sauna, which ends the match at once.',
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
