// Builds art/manifest.json from js/levels.js (ids, hotspot rectangles) and tools/art-text.js (descriptions).
// Usage: node tools/build-manifest.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/levels.js'), 'utf8'), ctx);
const { CHARS, ITEMS, LEVELS } = ctx.GAME_DATA;
const T = require('./art-text.js');

const castSpots = L => L.cast.filter(c => !c.video).map(c => ({ id: c.id, x: c.x, feetY: c.y || 640 }));

const out = { version: 1, layout: T.layout, scenes: {}, characters: {}, items: {}, ui: {} };
for (const L of LEVELS) {
  const t = T.scenes[L.scene];
  if (!t) throw new Error('no description for ' + L.scene);
  const hotspots = {};
  for (const h of L.hs) {
    if (!h.r) continue;
    if (!t.hs[h.id]) throw new Error('no hotspot description for ' + L.scene + '.' + h.id);
    hotspots[h.id] = { rect: h.r, shows: t.hs[h.id] };
  }
  out.scenes[L.scene] = {
    file: 'scenes/' + L.scene + '.jpg', size: [1280, 720], level: L.n,
    description: t.d, characterSpots: castSpots(L), hotspots,
  };
}
for (const id of Object.keys(CHARS)) {
  const d = T.characters[id];
  if (!d) throw new Error('no description for character ' + id);
  const big = CHARS[id].h >= 280;
  const size = id === 'yeti' ? [640, 800] : id.startsWith('dog_') ? [480, 400] : id === 'karkusha' ? [360, 300] : big ? [320, 600] : [260, 420];
  out.characters[id + '_idle'] = { file: 'characters/' + id + '_idle.png', size, description: d + ' Pose: standing relaxed, facing slightly to the viewer\'s left, full body, transparent background.' };
  out.characters[id + '_talk'] = { file: 'characters/' + id + '_talk.png', size, description: d + ' Pose: talking, mouth open, one hand (or paw/wing) raised in a gesture, same framing as idle, transparent background.' };
}
for (const id of Object.keys(ITEMS)) {
  const d = T.items[id];
  if (!d) throw new Error('no description for item ' + id);
  out.items[id] = { file: 'items/' + id + '.png', size: [128, 128], description: d + ' Single object, centred, transparent background.' };
}
out.ui = T.ui;

fs.mkdirSync(path.join(root, 'art'), { recursive: true });
const json = JSON.stringify(out, null, 2)
  .replace(/\[\s+([\d,\s]+?)\s+\]/g, (m, a) => '[' + a.split(/,\s*/).join(', ') + ']')
  .replace(/\{\s+("id": "\w+"),\s+("x": \d+),\s+("feetY": \d+)\s+\}/g, '{ $1, $2, $3 }');
fs.writeFileSync(path.join(root, 'art/manifest.json'), json + '\n');
console.log('manifest: %d scenes, %d character poses, %d items, %d ui',
  Object.keys(out.scenes).length, Object.keys(out.characters).length, Object.keys(out.items).length, Object.keys(out.ui).length);
