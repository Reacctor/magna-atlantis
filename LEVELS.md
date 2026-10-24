# 30 levels and the difficulty ramp

Magna is 5. She counts to 20, knows colours, shapes, most Russian letters, can add on
fingers, cannot read yet. The ramp must be *slow*: every tier adds ONE new kind of thinking
and keeps practising the older kinds. Puzzles inside a tier are randomised (numbers, cards,
positions) so a replay is never identical. All instructions are spoken.

## Puzzle catalogue by tier

| tier | levels | new kind of thinking | puzzle types (ids for `js/puzzles.js`) |
|---|---|---|---|
| 1 | 1–5 | notice & match | `find` (find N hidden things in the scene), `color` (match colour to object), `count5` (count 1–5 objects, pick the digit), `same` (which two pictures are the same), `order3` (put 3 pictures in story order) |
| 2 | 6–10 | remember & sequence | `memory4` (4 pairs face-down), `count10`, `add5` (2+3 with pictures), `pattern2` (ABAB → what comes next), `letter` (which word starts with this letter — spoken), `order4` |
| 3 | 11–15 | compare & classify | `add10` (up to 10), `odd` (odd one out, by category), `biggest` (sort 4 by size/length), `memory6`, `pattern3` (ABC / AAB patterns), `shadow` (match object to its silhouette), `sub5` (take-away with pictures) |
| 4 | 16–20 | plan a path & simple logic | `maze` (tap a path through a 5×5 grid, walls visible), `sudoku3` (3×3 with pictures, one each row/column), `ice` (Snezhana: which 3 tiles to freeze so the path connects — a mini logic puzzle), `syllable` (spoken МА + МА = ? pick the word picture), `sub10`, `clock` (whole hours), `memory8` |
| 5 | 21–25 | reason with two conditions | `add20`, `scale` (balance: which is heavier given two weighings), `sudoku4` (4×4 pictures), `river` (fox-goose-beans style crossing with 3 characters, simplified rules spoken), `code` (symbol→letter table, decode a 3-letter word), `mirror` (which picture is the mirror image), `pattern_grow` (1,2,3,… growing patterns) |
| 6 | 26–30 | multi-step thinking | `pairs` (count in twos: how many socks for 6 feet), `lights` (3×3 lights-out with 2–3 moves), `rings` (rotate the three Compass rings so symbols line up — the finale lock), `who` (logic grid: three friends, three hats, two clues), `route` (order 4 stops with constraints: "the dog before the boat"), `code4`, `maze7` |

Rules for every puzzle: ≤ 6 options on screen; options are big (≥ 90 px); the prompt is
spoken on open and on 🔊; wrong answers shake, the right one glows green and the hero
cheers; after 2 wrong answers the hint grows stronger; ⏭ always available.

## Level table

Legend: scene = background id (`art/scenes/levelNN_slug.jpg`); cast = characters present;
puzzles = ids from the catalogue, in order; goal = what ends the level.

| # | tier | city / scene | cast | key story beats | puzzles | goal |
|---|---|---|---|---|---|---|
| 1 | 1 | São Paulo — Magna's room, rain on the window | magna, papa, olga | Grandma's letter arrives; Olga: tidy up first | `find` (toys to put away), `color` | room tidy → attic key from Olga |
| 2 | 1 | São Paulo — attic with the sailor's chest | magna, papa, olga (shouts from below) | chest opens: compass without centre, torn map | `same`, `count5` (count the map pieces) | take compass + map piece 1 |
| 3 | 1 | São Paulo — Ibirapuera park, monkeys, dog | magna, papa, dog_feijao, olga | Feijão talks; Dog Union explained; the map shows "the city of snow" | `order3`, `find` | the dog gives a bone-whistle |
| 4 | 1 | São Paulo — airport, Karkusha snatches the map | magna, papa, olga, baron, karkusha | Baron introduced; Olga joins "to Grandma"; plane to Moscow | `color` (boarding passes), `count5` | board the plane (world map cutscene) |
| 5 | 1 | Moscow — Tamara Egorovna's flat, blini | magna, papa, olga, tamara | Grandma, the family diary, the riddle; blini for the road | `same`, `order3` (blini steps) | diary page + blini in inventory |
| 6 | 2 | Moscow — Red Square in snow | magna, papa, dog_sharik, olga ("hat!") | Sharik; the Baron's footprints | `memory4`, `count10` | follow the footprints to the fountain |
| 7 | 2 | Moscow — frozen fountain, Snezhana trapped | magna, papa, snezhana, baron, karkusha | free the princess (Dad lifts, Magna reaches); she joins | `pattern2`, `add5` | Snezhana free |
| 8 | 2 | Moscow — metro, the diary riddle solved | magna, papa, snezhana, tamara | riddle → Strasbourg; Olga stays with Grandma, video calls from now | `letter`, `order4`, `memory4` | plane to Strasbourg |
| 9 | 2 | Strasbourg — cathedral square, astronomical clock | magna, papa, snezhana | set the clock → it shows the stork | `count10`, `pattern2`, `add5` | clock chimes |
| 10 | 2 | Strasbourg — Petite France canals, stork nest | magna, papa, snezhana, olga (video) | Snezhana freezes the canal; map piece 2 in the nest | `memory4`, `letter` | map piece 2 |
| 11 | 3 | Oudenaarde — town hall & belfry | magna, papa, snezhana, baron | Baron tries to buy the tapestry; bells puzzle | `add10`, `odd` | belfry key |
| 12 | 3 | Oudenaarde — tapestry museum | magna, papa, snezhana, karkusha | tapestry shows the Compass; three rings explained; Karkusha steals the diary page (choice: chase or trick) | `shadow`, `pattern3`, `memory6` | tapestry photo in inventory → Algeria |
| 13 | 3 | Algeria — the old family house courtyard | magna, papa, dog_zefir | Dad's homeland; Aunt's stories; Zefir | `biggest`, `odd` | key to the casbah door |
| 14 | 3 | Algeria — casbah stairs | magna, papa, dog_zefir, baron | Baron on the stairs; counting steps | `sub5`, `add10`, `shadow` | reach the roof, see the well |
| 15 | 3 | Algeria — Sahara dunes, the noon well (sundial) | magna, papa, dog_zefir, olga (video: "sunscreen!") | sundial; Sun ring found; Baron buried in sand | `pattern3`, `memory6`, `biggest` | **Sun ring** |
| 16 | 4 | Yerevan — Tigran & Yulia's house, khorovats | magna, papa, olga (surprise), tigran, yulia, yuliana, maya, liliana | hosts; Maya's drawings = clue map; Liliana's lamb lost | `maze`, `syllable` | lamb found → Maya's drawing |
| 17 | 4 | Yerevan — Cascade stairs & city | magna, papa, yuliana, karkusha | Yuliana races Karkusha on her bike; choice: help on bike or on foot | `sudoku3`, `clock` | drawing piece 2 |
| 18 | 4 | Mount Aragats — snowfield, Yeti tracks | magna, papa, tigran, dog_ararat, snezhana | big footprints; ice bridge (Snezhana) | `ice`, `sub10`, `memory8` | find the cave |
| 19 | 4 | Yeti's cave | magna, papa, yeti, dog_ararat | Yeti Boba; lonely; "biscuit" = Moon ring; choice: give blini / give the whistle / give Ararat as friend | `sudoku3`, `syllable`, `clock` | **Moon ring** + Yeti's promise |
| 20 | 4 | Phuket — house with the pool | magna, papa, irina, alexander, timosha, olga (video: swimming lesson) | Timosha; map piece 3 at the pool bottom | `maze`, `sub10`, `ice` (freeze the pool steps? no — freeze the spilled juice path) | map piece 3 |
| 21 | 5 | Phuket — Big Buddha hill, monkeys | magna, papa, timosha, dog_mango | Mango; monkeys trade | `add20`, `scale` | Star-ring clue (temple bell) |
| 22 | 5 | Phuket — long-tail boat, lagoon | magna, papa, alexander, dog_mango | boat; Baron's speedboat; Snezhana away (too hot) | `river`, `sudoku4` | **Star ring** |
| 23 | 5 | Shenzhen — Shekou toy market | magna, papa, karkusha | rusty Karkusha; Magna oils her wing (choice) | `code`, `mirror` | Karkusha's side chosen |
| 24 | 5 | Shenzhen — Baron's factory, Sea World | magna, papa, baron, karkusha | conveyor belts; toys that never share | `pattern_grow`, `sudoku4`, `scale` | escape with the centre disc |
| 25 | 5 | Kuala Lumpur — Petronas skybridge | magna, papa, olga (video: "hold the rail") | assembling attempt; monkeys appear | `add20`, `code`, `river` | compass assembled (then stolen) |
| 26 | 6 | Kuala Lumpur — Batu caves, monkeys | magna, papa, dog_feijao (flew in!) | Dog Union helps; monkeys trade for bananas | `pairs`, `maze7` | compass back |
| 27 | 6 | Tokyo — Shibuya crossing, Mochi | magna, papa, dog_mochi, baron | Mochi; crowd; the Baron's disguise | `who`, `code4` | ticket to Hokkaido |
| 28 | 6 | Hokkaido — snow festival, Snezhana at full power | magna, papa, snezhana, dog_mochi | ice castle; rings set to the stars | `lights`, `route`, `sudoku4` | compass points to Miami |
| 29 | 6 | Miami — beach & seaplane | magna, papa, baron, karkusha, yeti, all dogs, olga (arrives) | whistle three times; Yeti; dogs howl; Baron's plane lands in the water | `pairs`, `who`, `maze7` | compass back, dive |
| 30 | 6 | Atlantis — the gate and the hall of golden light | magna, papa, snezhana, yeti, baron, olga (password) | three-ring gate; flooding hall; Olga's password (blini recipe); the choice | `rings`, `lights`, `route`, `code4` | ending + credits |

## Pacing

- Levels 1–5: 5–7 minutes each, 2 puzzles. Levels 6–15: 3 puzzles. Levels 16–30: 3–4
  puzzles, one of them "big" (maze/sudoku/river/lights).
- Each new puzzle type is introduced by Dad explaining it once (spoken), with a worked
  example that cannot be failed (the first instance of a type is a demo with the answer
  highlighted).
- Stars: one per level; a secret second star for finishing a level with no hints.
