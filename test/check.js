// Static and dynamic checks for the game. No dependencies: node test/check.js
// 1. every level references only existing puzzle, character, item and manifest ids (and all text exists)
// 2. every puzzle generator produces a solvable instance 50 times per tier
// 3. the engine's ?autotest=1 mode plays all 30 levels inside a tiny DOM shim
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const shim = require('./dom-shim.js');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let failures = 0;
const fail = m => { failures++; console.log('  ✗ ' + m); };
const section = m => console.log('\n' + m);

function context(search) {
  const ctx = { console: { log() {}, error: console.error, warn() {} }, setTimeout, clearTimeout, URLSearchParams, Math, JSON };
  vm.createContext(ctx);
  if (search != null) shim.install(ctx, search);
  return ctx;
}
function loadScripts(ctx, files) { for (const f of files) vm.runInContext(read('js/' + f + '.js'), ctx, { filename: 'js/' + f + '.js' }); }

const ctx = context(null);
loadScripts(ctx, ['strings', 'levels', 'puzzles']);
const { CHARS, ITEMS, COMBOS, CITIES, LEVELS } = ctx.GAME_DATA;
const STR = ctx.STR, PZ = ctx.PZ;
const manifest = JSON.parse(read('art/manifest.json'));

// ---------- 1. references ----------
section('1. Level references');
const levelsMd = read('LEVELS.md');
const mdPuzzles = {};
for (const line of levelsMd.split('\n')) {
  const m = line.match(/^\|\s*(\d+)\s*\|\s*(\d)\s*\|.*\|([^|]*)\|[^|]*\|\s*$/);
  if (m) mdPuzzles[+m[1]] = { tier: +m[2], puzzles: [...m[3].matchAll(/`(\w+)`/g)].map(x => x[1]) };
}
const speakers = new Set(Object.keys(CHARS).concat('narr'));
function checkLines(v, where) {
  if (!Array.isArray(v)) { fail(where + ': not a list of lines'); return; }
  for (const ln of v) {
    if (Array.isArray(ln)) {
      if (!speakers.has(ln[0])) fail(where + ': unknown speaker ' + ln[0]);
      if (typeof ln[1] !== 'string' || !ln[1].trim()) fail(where + ': empty line');
    } else if (ln.choice) {
      if (!ln.opts || ln.opts.length < 2) fail(where + ': choice needs 2+ options');
      ln.opts.forEach(o => { if (!o.t || !o.e || o.v == null) fail(where + ': bad option'); checkLines(o.then || [], where + '.' + ln.choice); });
    } else if (ln.if) { checkLines(ln.then || [], where + '.if'); checkLines(ln.else || [], where + '.else'); }
    else fail(where + ': unknown line ' + JSON.stringify(ln));
  }
}
const choiceLevels = {}; const condUses = {};
function scanChoices(v, n) {
  (Array.isArray(v) ? v : []).forEach(ln => {
    if (ln && ln.choice) { (choiceLevels[ln.choice] = choiceLevels[ln.choice] || []).push(n); ln.opts.forEach(o => scanChoices(o.then, n)); }
    if (ln && ln.if) { const k = ln.if.replace('!', '').split('=')[0]; (condUses[k] = condUses[k] || []).push(n); scanChoices(ln.then, n); scanChoices(ln.else, n); }
  });
}
const olgaLevels = new Set();
let levelsChecked = 0;
for (const L of LEVELS) {
  const k = L.key;
  const where = 'level ' + L.n;
  if (!manifest.scenes[L.scene]) fail(where + ': scene ' + L.scene + ' not in manifest');
  if (!/^level\d\d_\w+$/.test(L.scene) || L.scene.slice(5, 7) !== String(L.n).padStart(2, '0')) fail(where + ': scene id ' + L.scene);
  if (!CITIES[L.city]) fail(where + ': unknown city ' + L.city);
  if (!STR['city.' + L.city]) fail(where + ': no city name');
  for (const f of ['name', 'intro', 'outro']) if (STR[k + '.' + f] == null) fail(where + ': missing ' + k + '.' + f);
  ['intro', 'outro'].forEach(f => { if (STR[k + '.' + f]) { checkLines(STR[k + '.' + f], k + '.' + f); scanChoices(STR[k + '.' + f], L.n); } });
  for (const c of L.cast) if (!CHARS[c.id]) fail(where + ': unknown cast ' + c.id);
  const ids = new Set(L.hs.map(h => h.set || h.id));
  const goals = L.hs.filter(h => h.goal);
  if (goals.length !== 1) fail(where + ': needs exactly one goal');
  const puzzles = [];
  for (const h of L.hs) {
    const hw = where + ' hotspot ' + h.id;
    if (!h.r && !h.ch) fail(hw + ': needs r or ch');
    if (h.ch && !CHARS[h.ch]) fail(hw + ': unknown character ' + h.ch);
    if (h.ch && !L.cast.some(c => c.id === h.ch)) fail(hw + ': character not in cast');
    if (h.r) {
      const ms = manifest.scenes[L.scene];
      const mh = ms && ms.hotspots[h.id];
      if (!mh) fail(hw + ': not in manifest');
      else if (JSON.stringify(mh.rect) !== JSON.stringify(h.r)) fail(hw + ': rect differs from manifest');
      if (h.r[1] < 56 || h.r[1] + h.r[3] > 640 || h.r[0] < 0 || h.r[0] + h.r[2] > 1280) fail(hw + ': rect outside the play area');
      if (STR[k + '.' + h.id] == null) fail(hw + ': no name string');
    }
    if (h.puzzle) { if (!PZ.TYPES[h.puzzle]) fail(hw + ': unknown puzzle ' + h.puzzle); else if (PZ.TYPES[h.puzzle] > L.tier) fail(hw + ': puzzle tier above level tier'); puzzles.push(h.puzzle); }
    for (const it of [].concat(h.give || [], h.take || [], h.item ? [h.item] : [])) if (!ITEMS[it]) fail(hw + ': unknown item ' + it);
    for (const f of [].concat(h.need || [], h.show ? [h.show] : [])) if (!ids.has(f)) fail(hw + ': unknown flag ' + f);
    if (h.decor && STR[k + '.' + h.id + '.look'] == null) fail(hw + ': decor without look');
    if (!h.decor && !h.puzzle && !h.give && !h.goal && !h.freeze && !h.item && !h.set && STR[k + '.' + h.id + '.do'] == null) fail(hw + ': action without effect or text');
    for (const f of ['look', 'look2', 'lock', 'do', 'done']) {
      const v = STR[k + '.' + h.id + '.' + f];
      if (v != null) { checkLines(v, k + '.' + h.id + '.' + f); scanChoices(v, L.n); if (JSON.stringify(v).includes('"olga"')) olgaLevels.add(L.n); }
    }
    if (h.freeze && !L.snez) fail(hw + ': freeze in a level without Snezhana');
  }
  for (const it of [].concat(L.introTake || [], L.outroGive || [], L.outroTake || [])) if (!ITEMS[it]) fail(where + ': unknown item ' + it);
  const md = mdPuzzles[L.n];
  if (!md) fail(where + ': not found in LEVELS.md');
  else {
    if (md.tier !== L.tier) fail(where + ': tier ' + L.tier + ' but LEVELS.md says ' + md.tier);
    if (md.puzzles.slice().sort().join() !== puzzles.slice().sort().join()) fail(where + ': puzzles ' + puzzles + ' but LEVELS.md says ' + md.puzzles);
  }
  if (L.cast.some(c => c.id === 'olga') || ['intro', 'outro'].some(f => JSON.stringify(STR[k + '.' + f] || '').includes('"olga"'))) olgaLevels.add(L.n);
  levelsChecked++;
}
for (const id of Object.keys(CHARS)) {
  if (!STR['name.' + id]) fail('no name for ' + id);
  for (const p of ['idle', 'talk']) if (!manifest.characters[id + '_' + p]) fail('manifest lacks ' + id + '_' + p);
}
for (const id of Object.keys(ITEMS)) {
  if (!STR['item.' + id]) fail('no name for item ' + id);
  if (!manifest.items[id]) fail('manifest lacks item ' + id);
}
for (const c of COMBOS) c.forEach(x => { if (!ITEMS[x]) fail('combo with unknown item ' + x); });
for (const t of Object.keys(PZ.TYPES)) for (const f of ['intro', 'h1']) { const kk = 'pz.' + t + '.' + f; if (!STR[kk] && !STR['pz.' + t.replace(/\d+$/, '') + '.' + f]) fail('missing ' + kk); }
const msc = Object.keys(manifest.scenes).length, mch = Object.keys(manifest.characters).length;
if (msc !== 30) fail('manifest has ' + msc + ' scenes');
for (const [id, s] of Object.entries(manifest.scenes)) if (!s.description || !s.file) fail('manifest scene ' + id + ' without description');
if (olgaLevels.size < 10) fail('Olga appears in only ' + olgaLevels.size + ' levels');
const acts = { 1: [1, 4], 2: [5, 8], 3: [9, 12], 4: [13, 15], 5: [16, 19], 6: [20, 30] };
for (const a in acts) if (!Object.values(choiceLevels).flat().some(n => n >= acts[a][0] && n <= acts[a][1])) fail('act ' + a + ' has no dialogue choice');
const consequential = Object.keys(choiceLevels).filter(c => (condUses[c] || []).some(n => n > Math.min(...choiceLevels[c])) ||
  LEVELS.some(L => L.n > Math.min(...choiceLevels[c]) && (L.hs.some(h => (h.when || '').includes(c)) || L.cast.some(x => (x.when || '').includes(c)))));
if (consequential.length < 3) fail('only ' + consequential.length + ' choices have later consequences');

// inventory feasibility: replay the levels in order with the engine's own combo planner
const engCtx = context('');
loadScripts(engCtx, ['strings', 'levels', 'puzzles', 'audio', 'engine']);
const E = engCtx.ENGINE;
for (const L of LEVELS) {
  let inv = E.startInv(L.n);
  if (inv.length > 10) fail('level ' + L.n + ': inventory too big (' + inv.length + ')');
  inv = inv.filter(x => !(L.introTake || []).includes(x));
  for (const h of L.hs) {
    if (!h.item || h.decor) { (h.give || []).forEach(g => inv.push(g)); continue; }
    if (!E.comboPlan(inv, h.item)) fail('level ' + L.n + ' hotspot ' + h.id + ': item ' + h.item + ' is not obtainable');
    (h.give || []).forEach(g => inv.push(g));
  }
}
// js/art-files.js must match the art that is present (warning only: run node tools/build-art-index.js)
{
  const listed = (read('js/art-files.js').match(/\[(.*)\]/s) || [, ''])[1];
  const present = [];
  for (const dir of ['scenes', 'characters', 'items', 'ui']) {
    const d = path.join(root, 'art', dir);
    if (fs.existsSync(d)) fs.readdirSync(d).filter(f => /\.(jpe?g|png|webp)$/i.test(f)).forEach(f => present.push(dir + '/' + f));
  }
  const inList = JSON.parse('[' + listed + ']');
  if (present.sort().join() !== inList.sort().join()) console.log('  ⚠ js/art-files.js is stale (' + inList.length + ' listed, ' + present.length + ' present): run node tools/build-art-index.js');
}
console.log(`  ${levelsChecked} levels, ${msc} scenes, ${mch} character poses, ${Object.keys(manifest.items).length} items; Olga in ${olgaLevels.size} levels; ` +
  `choices: ${Object.keys(choiceLevels).join(', ')}; with consequences: ${consequential.join(', ')}`);

// ---------- 2. puzzle generators ----------
section('2. Puzzle generators (50 instances per tier)');
let made = 0;
for (const [type, t0] of Object.entries(PZ.TYPES)) {
  for (let tier = t0; tier <= 6; tier++) {
    for (let i = 0; i < 50; i++) {
      let inst;
      try { inst = PZ.gen(type, tier, {}); } catch (e) { fail(type + ' tier ' + tier + ': ' + e.message); break; }
      made++;
      if (!PZ.check(inst, inst.solution)) { fail(type + ' tier ' + tier + ': solution does not check'); break; }
      if (inst.kind === 'choice' && (inst.options.length > 6 || inst.options.length < 2 || new Set(inst.options).size !== inst.options.length)) { fail(type + ': bad options'); break; }
      if (inst.kind === 'choice' && PZ.check(inst, (inst.answer + 1) % inst.options.length)) { fail(type + ': a wrong option checks'); break; }
      if (!inst.prompt || /\{\w+\}/.test(inst.prompt) || /pz\./.test(inst.prompt)) { fail(type + ': bad prompt ' + inst.prompt); break; }
    }
  }
}
// level themes too
for (const L of LEVELS) for (const h of L.hs) if (h.puzzle) for (let i = 0; i < 50; i++) {
  const inst = PZ.gen(h.puzzle, L.tier, { theme: h.theme });
  if (!PZ.check(inst, inst.solution) || /\{\w+\}|pz\./.test(inst.prompt)) { fail('level ' + L.n + ' ' + h.puzzle + '/' + h.theme + ' broken'); break; }
}
console.log(`  ${Object.keys(PZ.TYPES).length} types, ${made} instances checked`);

// ---------- 3. autotest in the DOM shim ----------
section('3. Autotest (all 30 levels, engine in a DOM shim)');
(async () => {
  for (const variant of [0, 1, 2]) {
    const c = context('?autotest=1&variant=' + variant);
    const lines = [];
    c.console = { log: (...a) => lines.push(a.join(' ')), error: (...a) => lines.push('ERROR ' + a.join(' ')), warn() {} };
    try { loadScripts(c, ['strings', 'levels', 'puzzles', 'audio', 'engine']); } catch (e) { fail('engine load: ' + e.stack); continue; }
    let res;
    try { res = await c.AUTOTEST; } catch (e) { fail('autotest crashed: ' + e.stack); continue; }
    lines.filter(l => /^FAIL|ERROR/.test(l)).forEach(l => fail('variant ' + variant + ': ' + l));
    console.log(`  variant ${variant}: ${lines.find(l => l.startsWith('AUTOTEST DONE')) || 'no result'}`);
    if (!res || res.pass !== 30 || res.errors) fail('variant ' + variant + ': autotest did not pass all levels cleanly');
  }
  console.log(failures ? `\nFAILED: ${failures} problem(s)` : '\nALL CHECKS PASSED');
  process.exit(failures ? 1 : 0);
})();
