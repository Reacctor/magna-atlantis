# Magna & Dad: The Compass of Atlantis — design brief

«Магна и Папа: Компас Атлантиды». Third game for Magna (5 years old) and her dad.
A point-and-click adventure in the spirit of *Indiana Jones and the Fate of Atlantis*
(LucasArts, 1992): world travel, a relic in pieces, a comic villain, dialogue, inventory,
and brain puzzles that get harder level by level. 30 levels, one story.

Previous games (in `reference/`): `five-stars-*` (6 scenes, code-drawn pixel art, RU/PT/EN,
two switchable heroes) and `ghost-hunters-index.html` (10 levels, RU only, modal puzzles,
hint button, level select, browser speech). This game must be a clear step up:
real painted art (PNG files in `art/`), a 30-level story, dialogue with choices,
inventory combining, and a slow, deliberate difficulty ramp (see LEVELS.md).

## Hard requirements

1. **Single-page web game**, plain HTML + CSS + JS (ES2020), no build step, no frameworks.
   Must run from `file://` AND from a static server AND as a claude.ai Artifact
   (one `index.html` plus files in `art/`, `js/`). Works on a laptop (mouse) and on a
   phone/tablet (touch), landscape preferred, portrait tolerated.
2. **Language: Russian** for everything the child sees and hears. Keep all strings in one
   `js/strings.js` object keyed by id so an EN layer can be added later. Portuguese and
   English words may appear in-world (São Paulo signs, Dad's jokes) as flavour only.
3. **Speech**: every dialogue line is spoken with browser `speechSynthesis` (ru-RU voice,
   different pitch per character) AND shown as large text. A 5-year-old cannot read yet:
   nothing important may be text-only. Sound toggle. Click/tap to advance a line.
4. **Never punish**: no deaths, no game over, no timers that fail the player. Wrong puzzle
   answers shake and the hero says a gentle hint. A 💡 button gives 3 escalating hints
   (nudge → where to look → the answer). A ⏭ button (small, for Dad) skips a puzzle.
5. **Save**: progress saved to `localStorage` after every level and every puzzle; a title
   screen with Continue / New game / level select (unlocked levels only, plus a hidden
   Dad-code `3-1-4` that unlocks all).
6. **Art from files** (see "Art pipeline"). The engine must run with NO art present:
   when an image is missing, draw a labelled placeholder (coloured rectangle with the
   asset id) so the game is fully playable before the art lands.
7. **Difficulty ramp** exactly as in LEVELS.md: tiers 1→6, each tier introduces one new
   kind of thinking and keeps the old kinds. Puzzles are generated with randomness inside
   the tier (so replaying a level gives new numbers/cards) but never harder than the tier.
8. Resolution: the stage is a 16:9 `<div>` at 1280×720 design units, scaled with CSS
   `transform` to fit the viewport. Backgrounds are 1280×720 JPG. Characters are PNG with
   alpha, drawn as `<img>` elements positioned in stage units (DOM, not canvas, so images
   stay crisp and hit-testing is trivial).

## Characters (ids are the art file names)

| id | who | look (keep consistent) | voice pitch |
|---|---|---|---|
| `magna` | Магна, 5, the hero | light-brown/blond hair with loose wisps and a small side plait, big brown eyes, rosy cheeks, coral-orange T-shirt with a panda wearing yellow glasses, explorer satchel | 1.4 |
| `papa` | Папа, Dad | ~45, shaved head under a PINK baseball cap, grey-white short beard, white T-shirt, kind smile, tall | 0.85 |
| `olga` | Ольга, Magna's mum | elegant, dark-blond hair, practical, phone always in hand; appears in person AND as a video call | 1.15 |
| `tamara` | Тамара Егоровна, grandmother | warm, round glasses, cardigan, keeper of the family diary and the blini recipe | 1.0 |
| `baron` | Барон фон Хап, the villain (comic, not scary) | tall thin, monocle, waxed moustache, purple coat, top hat; greedy, always slips on something | 0.7 |
| `karkusha` | Каркуша, the Baron's mechanical crow | brass clockwork crow, one red eye, repeats the Baron's words wrong | 1.6 |
| `snezhana` | Снежана, Princess of the North | pale-blue dress, silver crown of icicles, white-blond braid; freezes water/anything wet with a touch; shy, polite | 1.25 |
| `yeti` | Йети Боба | huge, fluffy white-grey fur, tiny round eyes, enormous feet, a woolly hat he knitted himself; lonely, gentle, loves pancakes | 0.6 |
| `dog_feijao` | Фейжан, São Paulo street dog, leader of the Dog Union | scruffy brown mutt, red bandana | 1.1 |
| `dog_sharik` | Шарик, Moscow | fluffy white Samoyed in felt boots (валенки) | 1.05 |
| `dog_zefir` | Зефир, Algeria | sand-coloured sloughi (desert greyhound), blue scarf | 1.1 |
| `dog_ararat` | Арарат, Yerevan | big Armenian gampr with a shaggy coat and a bell | 0.9 |
| `dog_mango` | Манго, Phuket | small brown Thai dog with a flower behind the ear | 1.3 |
| `dog_mochi` | Моти, Japan | Shiba Inu with a tiny backpack | 1.2 |
| `tigran` | Тигран, Yerevan dad | strong, dark hair, apron, master of хоровац (barbecue), knows the mountains | 0.8 |
| `yulia` | Юля, Yerevan mum, Olga's friend | friendly, curly hair | 1.1 |
| `yuliana` | Юлиана, eldest daughter (~9) | sporty, ponytail, bike | 1.3 |
| `maya` | Майя, middle daughter (~7) | glasses, always drawing | 1.35 |
| `liliana` | Лилиана, youngest (~4) | curls, a toy lamb | 1.5 |
| `irina` | Ирина, Phuket mum | sun hat, sarong | 1.1 |
| `alexander` | Александр, Phuket dad | sunglasses, diving fins | 0.85 |
| `timosha` | Тимоша, their son (~6), Magna's friend | swim goggles on forehead, floatie | 1.4 |

Each character has at least `idle` and `talk` (mouth open / gesture) poses.
Files: `art/characters/<id>_<pose>.png`. Walking = slide + bob animation in CSS.

## Story (6 acts, 30 levels; details per level in LEVELS.md)

**MacGuffin.** The *Compass of Atlantis*: a bronze disc with three rings — Sun, Moon
and Star. Assembled and set correctly, it points to the sunken city and opens its gate.
Legend says Atlantis kept the "golden light" (orichalcum) that makes any machine run forever.
The Baron wants it to power his toy factory that makes toys that never break — and never
get shared. Magna's great-great-grandfather, a sailor, found the Sun ring and hid the three
pieces of the map in places his family would one day travel to.

**Act 1 — São Paulo (levels 1–4).** Rain. Grandmother's old letter arrives from Moscow.
In the attic Magna finds the sailor's chest: a compass with a missing centre and a torn map.
Olga: "First tidy the room!" (tidy-up = puzzle 1). Ibirapuera park, the street dog Фейжан
speaks ("only children and people who have never kicked a dog can hear us"), introduces the
Dog Union. The Baron's crow snatches the map piece at the market; they chase it to the
airport. Olga comes along "only as far as Moscow, to Grandma".

**Act 2 — Moscow (levels 5–8).** Snow. Tamara Egorovna's flat: blini, the family diary
with a riddle. Red Square, GUM, the metro. In a frozen fountain they free Снежана, Princess
of the North, from the Baron's ice-trap; she joins. Шарик the Samoyed. The diary's riddle
sends them to "the city with the tall red cathedral and the storks": Strasbourg.

**Act 3 — Europe (levels 9–12).** Strasbourg (cathedral, the astronomical clock, canals of
Petite France, a stork's nest holding the Moon-ring map piece). Oudenaarde, Belgium (town
hall belfry, the tapestry museum: a tapestry shows the Compass; the Baron tries to buy the
tapestry; Snezhana freezes the canal so they can cross). Olga video-calls: she is proud,
but "sleep at 9".

**Act 4 — Algeria (levels 13–15).** Dad's homeland. The old family house, the casbah's
stairs, the Sahara dunes. Зефир the sloughi. The Sun ring is in a well that only opens at
noon (sundial puzzle). Dad's old aunt tells stories. The Baron buries himself in sand.

**Act 5 — Yerevan & the Yeti (levels 16–19).** Tigran, Yulia and the girls Yuliana, Maya
and Liliana host them; Olga is already there with Yulia ("surprise!"). Tigran drives them
up Mount Aragats; the girls help (Maya's drawings are the clue map; Liliana's lamb gets
lost; Yuliana races the crow on her bike). In the snow they meet Йети Боба, who has the
Moon ring and thinks it is a biscuit. He is lonely; nobody visits. Magna gives him Grandma's
blini and a friend (Арарат the gampr). He gives the ring and promises to come when called
("whistle three times into the wind").

**Act 6 — Asia and the finale (levels 20–30).** Phuket (20–22): Irina, Alexander and Тимоша
at the house with the swimming pool. The Star ring's map piece is at the bottom of the pool
(Timosha dives), then Big Buddha hill, then a long-tail boat; Манго the dog. Olga insists
on a swimming lesson first. Shenzhen / Shekou (23–24): the toy market and the Baron's
factory in Sea World; Karkusha switches sides after Magna oils her rusty wing.
Kuala Lumpur (25–26): the Petronas skybridge, Batu caves monkeys steal the Compass.
Japan (27–28): Tokyo, then Hokkaido snow festival — Snezhana's power is at full strength,
Моти the Shiba; the Compass is assembled. Miami (29): the Baron steals the Compass in a
seaplane; Yeti arrives (whistle!), the dogs of the Union howl the Baron's seaplane down.
Atlantis (30): under the sea near Bermuda; three-ring puzzle gate, flooding hall (Snezhana
freezes the water), the golden light. Magna's choice (dialogue): take the light or leave it.
Leaving it is right: the light only works where things are shared. The Baron, soaked, learns
to share (he gives Karkusha a day off). Ending: the whole family and all friends at
Grandma's table in Moscow; Olga: "And now — bed."

**Olga's interventions** (she must appear in at least 10 levels): tidy-up before adventure,
"wear a hat", video call at bedtime, surprise arrival in Yerevan, swimming lesson in Phuket,
she knows the password in the finale (the blini recipe: "three eggs, one glass, pinch of salt").

## Gameplay

- **Scenes**: each level = 1–2 scenes with hotspots (things/people). Click a hotspot:
  look (Magna comments), talk (dialogue), take (into inventory), or use selected item on it.
  No verb menu. A sentence line shows the current action in words (as in ghost-hunters).
- **Two heroes**: switch between Magna and Dad with their portraits; some hotspots need Dad
  (tall/heavy) and some need Magna (small/low), as in five-stars. Snezhana, when present,
  is a third "tool": select her and click something wet to freeze it.
- **Dialogue with choices** (Fate-of-Atlantis style): at least one choice in every act;
  choices never dead-end but change lines, and 3 of them change small things later
  (e.g. what the Yeti gets, whether Karkusha helps, the ending line).
- **Puzzle modals**: the "thinking" part, per LEVELS.md. 2–4 per level. Big buttons,
  spoken instructions, pictures/emoji not text wherever possible.
- **Inventory**: up to ~8 items, combinable (e.g. rope + hook). Items are PNG icons in
  `art/items/` (placeholders: emoji).
- **Level flow**: intro dialogue → explore + puzzles → level goal → short cutscene → next
  level. Every level ends with a star ⭐; stars shown on the HUD and on the level map.
- **World map** between acts: a stylised map with the plane flying (CSS animation).

## Art pipeline (the art is produced separately in Chrome by the parent session)

- `art/manifest.json` lists every asset id the engine wants: `{ "scenes": {...}, "characters": {...}, "items": {...} }`
  with for each: file name, size, and for scenes the hotspot rectangles.
  **The engine session writes this manifest first** (ids + the description of what each
  image should show, in English, 1–2 sentences, so the image prompts can be written from it).
- Backgrounds: `art/scenes/<levelNN>_<slug>.jpg` 1280×720.
- Characters: `art/characters/<id>_<pose>.png` with alpha, ~600 px tall for adults,
  ~420 px for Magna/children/dogs. The engine scales per scene via a `scale` field.
- Items: `art/items/<id>.png` 128×128 with alpha.
- Until a file exists, draw a placeholder. Loading is lazy per level; failures are silent.

## Files

```
index.html          shell, HUD, title screen, styles
js/strings.js       all RU text (dialogue, hints, puzzle prompts)
js/levels.js        30 levels: scenes, hotspots, items, puzzle plan, cutscenes
js/puzzles.js       puzzle generators by tier (see LEVELS.md)
js/engine.js        state, scene rendering, inventory, dialogue, speech, save, hints
js/audio.js         small WebAudio chiptune: title theme, per-act motif, 6 SFX
art/manifest.json   asset list with English descriptions for image generation
README.md           how to play, story diagram (mermaid), code diagram (mermaid)
```

## Definition of done (engine session)

- All 30 levels playable start to finish with placeholder art; `python -m http.server`
  and `file://` both work; no console errors.
- `art/manifest.json` complete with descriptions.
- An autotest behind `?autotest=1` that programmatically solves every level and reports
  pass/fail to the console.
- README with both diagrams. Commits pushed to `main` of Reacctor/magna-atlantis.
