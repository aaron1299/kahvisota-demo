# Kahvisodan hahmokuvat, tekoälypromptit

Kahdeksan kuvaa. Tiedostonimen on oltava täsmälleen alla oleva, ja tiedostot
tulevat tähän samaan kansioon. Peli ottaa ne käyttöön automaattisesti heti kun
ne ovat paikallaan, eikä koodiin tarvitse koskea. Jos kuva puuttuu, peli
piirtää hahmon kuten ennenkin.

## Tekniset vaatimukset

Läpinäkyvä tausta, PNG. Neliö, 512 × 512 pikseliä. Hahmo keskellä siten, että
sen ympärille jää noin kymmenen prosentin reunus joka suuntaan, koska pelissä
hahmon alle piirretään joukkueen värirengas. Yksi hahmo kuvassa, paitsi
hyttysparvessa. Ei varjoa kuvaan, peli piirtää sen itse. Ei tekstiä, ei
kehyksiä, ei taustaelementtejä.

## Tyyliohje, liitä jokaisen promptin perään

```
Style: clean 2D game sprite, three-quarter top-down view as seen from a
slightly elevated camera, bold flat colours with soft cel shading, thick
readable silhouette, no outline noise, muted Nordic winter palette of
snow white, slate blue, pine green and warm wood brown, single character
centred on a fully transparent background, no shadow, no text, no frame,
512x512 PNG.
```

## Kahdeksan promptia

**mummot.png** — Mummolauma
```
A determined elderly Finnish woman in a thick knitted cardigan and a red
headscarf, pushing a metal walker across snow, handbag hanging from the
walker, rosy cheeks, small and stout, facing the viewer.
```

**latkajatka.png** — Lätkäjätkä
```
A stocky Finnish ice hockey player in full pads and a white helmet with a
cage visor, holding a wooden hockey stick low and ready, blue team jersey,
skates, facing the viewer.
```

**keihas.png** — Keihäänheittäjä
```
A lean Finnish javelin thrower in a winter track suit, one arm drawn back
holding a javelin, weight on the back foot mid-throw, breath visible in the
cold, facing the viewer.
```

**hyttyset.png** — Hyttysparvi
```
A tight swarm of five oversized Finnish mosquitoes flying in formation,
translucent wings blurred with motion, long thin legs, dark grey bodies,
seen slightly from above.
```

**metsuri.png** — Metsuri
```
A broad Finnish lumberjack in a red and black checked flannel shirt and a
knitted beanie, both hands gripping a long axe raised to one shoulder,
heavy boots in snow, facing the viewer.
```

**poro.png** — Poro
```
A sturdy Finnish reindeer in mid-stride, thick winter coat, wide antlers,
a small brass bell on a red collar, head low and charging forward, seen
from three-quarters above.
```

**hirvi.png** — Hirvi
```
A massive Finnish moose standing heavy and still, enormous flat antlers,
dark brown coat, long legs in deep snow, seen from three-quarters above.
```

**rantasade.png** — Räntäsade
```
A dense low storm cloud dropping grey sleet and wet snow in slanted
streaks, small ice shards visible in the fall, cold blue glow underneath,
no ground, no characters.
```

## Yhtenäisyys

Tee kaikki kahdeksan samalla työkalulla ja samalla tyyliohjeella yhdellä
istunnolla. Jos jokin erottuu selvästi muista, aja se uudelleen samalla
promptilla eikä muokattuna, koska ero syntyy yleensä satunnaisuudesta eikä
sanoista. Vertaa hahmoja rinnakkain samassa koossa ennen kuin hyväksyt.

## Tarkistuslista ennen käyttöä

Läpinäkyvä tausta oikeasti läpinäkyvä eikä valkoinen. Hahmo mahtuu neliöön
eikä leikkaudu reunasta. Kaikki kahdeksan näyttävät samalta perheeltä. Koko
suhteessa toisiinsa järkevä: hirvi selvästi mummoa isompi.

## Kenttäkuva, valinnainen

Jos haluat maalatun ympäristön piirretyn tilalle, tee kuva nimellä
**kentta.png**, kooltaan täsmälleen 720 × 1040 pikseliä, ei läpinäkyvyyttä.
Peli käyttää sitä automaattisesti heti kun se on kansiossa.

Kuvassa on oltava nämä kohdat oikeilla paikoillaan, koska pelilogiikka
olettaa ne: vaakasuora joki keskellä, sen keskikohta 520 pikselin
korkeudella ja leveys noin 56 pikseliä, sekä kaksi siltaa joen yli, joiden
keskikohdat ovat 176 ja 544 pikselin kohdalla vaakasuunnassa ja leveys noin
96 pikseliä. Rakennukset piirretään kuvan päälle, joten älä piirrä kioskeja
tai saunoja itse kuvaan.

```
A top-down winter arena seen from directly above, painted in a clean
stylised game-art style. Deep snow with wind-blown drifts and faint
footpaths, a frozen river running horizontally across the middle with two
wooden plank bridges crossing it, dense snow-covered spruce forest along
the left and right edges, soft late-afternoon Nordic light from the upper
left, long soft blue shadows, no characters, no buildings, no text,
720x1040.
```
