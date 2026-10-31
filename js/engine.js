// Engine: state, scene rendering, heroes, hotspots, inventory, dialogue, speech, puzzles, hints, save, title, map, autotest.
(function (G) {
'use strict';
const { CHARS, ITEMS, COMBOS, CITIES, LEVELS } = G.GAME_DATA;
const T = G.T, PZ = G.PZ, AUDIO = G.AUDIO;
const W = 1280, H = 720, FEET = 640;
const SAVE_KEY = 'magnaAtlantis.v1';
const params = new URLSearchParams((G.location && G.location.search) || '');
const AUTO = params.get('autotest') === '1';
const VARIANT = +(params.get('variant') || 0);
const L = n => LEVELS[n - 1];
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = ms => new Promise(r => setTimeout(r, AUTO ? 0 : ms));
const fmt = (s, p) => p ? String(s).replace(/\{(\w+)\}/g, (m, k) => (p[k] != null ? p[k] : m)) : s;

// ---------- state ----------
const fresh = () => ({ level: 1, maxLevel: 1, stars: {}, seen: {}, choices: {}, sound: true, inv: [], lf: {}, hints: 0, unlockAll: false, started: false });
let S = fresh();
function load() {
  try { const s = JSON.parse(G.localStorage.getItem(SAVE_KEY)); if (s && typeof s.level === 'number') S = Object.assign(fresh(), s); } catch (e) { /* no storage */ }
}
function save() { if (AUTO) return; try { G.localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* no storage */ } }

let lv = null;            // current level object
let hero = 'magna';       // active hero
let selected = null;      // selected item id or '@snez'
let busy = false;         // an action/dialogue is running
let pos = {};             // hero x positions
let hintTarget = null, hintLevel = 0;

// ---------- DOM ----------
function el(tag, cls, html, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
const UI = {};
function buildUI() {
  const root = document.getElementById('app') || document.body;
  UI.wrap = el('div', 'wrap', null, root);
  UI.stage = el('div', 'stage', null, UI.wrap);
  UI.scene = el('div', 'scene', null, UI.stage);
  UI.bgPh = el('div', 'bg-ph', null, UI.scene);
  UI.bg = el('img', 'bg', null, UI.scene);
  UI.bg.onload = () => UI.scene.classList.add('art');
  UI.bg.onerror = () => UI.scene.classList.remove('art');
  UI.hsLayer = el('div', 'hs-layer', null, UI.stage);
  UI.sprites = el('div', 'sprites', null, UI.stage);
  UI.phone = el('div', 'phone hidden', null, UI.stage);
  UI.arrow = el('div', 'arrow hidden', '⬇️', UI.stage);

  UI.top = el('div', 'topbar', null, UI.stage);
  UI.lvName = el('div', 'lvname', '', UI.top);
  UI.starsBox = el('div', 'stars', '', UI.top);
  UI.bSound = el('button', 'tb', '🔊', UI.top);
  UI.bHint = el('button', 'tb hint', '💡', UI.top);
  UI.bMenu = el('button', 'tb', '☰', UI.top);

  UI.bottom = el('div', 'bottombar', null, UI.stage);
  UI.heroes = el('div', 'heroes', null, UI.bottom);
  UI.inv = el('div', 'inv', null, UI.bottom);
  UI.sentence = el('div', 'sentence', T('ui.default'), UI.bottom);

  UI.dlg = el('div', 'dlg hidden', null, UI.stage);
  UI.dlgBox = el('div', 'dlg-box', null, UI.dlg);
  UI.dlgPort = el('div', 'dlg-port', null, UI.dlgBox);
  UI.dlgName = el('div', 'dlg-name', '', UI.dlgBox);
  UI.dlgText = el('div', 'dlg-text', '', UI.dlgBox);
  el('div', 'dlg-more', T('ui.tap'), UI.dlgBox);

  UI.choice = el('div', 'choice hidden', null, UI.stage);
  UI.pz = el('div', 'pz hidden', null, UI.stage);
  UI.card = el('div', 'card hidden', null, UI.stage);
  UI.map = el('div', 'map hidden', null, UI.stage);
  UI.title = el('div', 'title hidden', null, UI.stage);

  UI.bSound.onclick = () => { S.sound = !S.sound; applySound(); save(); };
  UI.bHint.onclick = () => sceneHint();
  UI.bMenu.onclick = () => { if (!busy) showTitle(); };
  G.addEventListener && G.addEventListener('resize', fit);
  fit();
}
function fit() {
  if (!UI.stage || !G.innerWidth) return;
  const s = Math.min(G.innerWidth / W, G.innerHeight / H);
  UI.stage.style.transform = `translate(-50%, -50%) scale(${s})`;
}
function applySound() {
  UI.bSound.innerHTML = S.sound ? '🔊' : '🔇';
  AUDIO.setOn(S.sound);
  if (!S.sound) stopSpeech();
}

// js/art-files.js lists the art files that exist, so missing ones are never requested (no 404s).
// Without that list every file is tried and failures are silent.
const hasArt = src => !G.ART_FILES || G.ART_FILES.includes(src.replace(/^art\//, ''));
function setSrc(img, src) { if (hasArt(src)) img.src = src; }
const charSrc = (id, pose) => { const t = 'art/characters/' + id + '_' + pose + '.png'; return hasArt(t) ? t : 'art/characters/' + id + '_idle.png'; };

// Images with a labelled placeholder until (unless) the file loads.
function artImg(parent, src, label, cls) {
  const box = el('div', 'artbox ' + (cls || ''), null, parent);
  el('div', 'ph', label, box);
  const img = el('img', null, null, box);
  img.onload = () => box.classList.add('loaded');
  img.onerror = () => box.classList.remove('loaded');
  setSrc(img, src);
  box.img = img;
  return box;
}
function itemIcon(parent, id) {
  const box = el('div', 'icon', null, parent);
  el('span', 'emo', ITEMS[id].emoji, box);
  const img = el('img', null, null, box);
  img.onload = () => box.classList.add('loaded');
  img.onerror = () => box.classList.remove('loaded');
  setSrc(img, 'art/items/' + id + '.png');
  return box;
}

// ---------- speech ----------
let voice = null;
function loadVoice() { try { const vs = G.speechSynthesis.getVoices(); voice = vs.find(v => /^ru/i.test(v.lang)) || null; } catch (e) { /* no speech */ } }
if (G.speechSynthesis) { try { G.speechSynthesis.onvoiceschanged = loadVoice; loadVoice(); } catch (e) { /* no speech */ } }
function speak(text, who) {
  if (!S.sound || AUTO || !G.speechSynthesis) return;
  try {
    G.speechSynthesis.cancel();
    const clean = String(text).replace(/<[^>]+>/g, ' ').replace(/[^\p{L}\p{N}\s.,!?:;—«»()+-]/gu, ' ');
    const u = new G.SpeechSynthesisUtterance(clean);
    u.lang = 'ru-RU'; if (voice) u.voice = voice;
    u.rate = 0.92; u.pitch = (CHARS[who] && CHARS[who].pitch) || 1;
    G.speechSynthesis.speak(u);
  } catch (e) { /* no speech */ }
}
function stopSpeech() { try { G.speechSynthesis && G.speechSynthesis.cancel(); } catch (e) { /* no speech */ } }

// ---------- conditions and flags ----------
function cond(c) {
  if (!c) return true;
  if (c[0] === '!') return !cond(c.slice(1));
  const [k, v] = c.split('=');
  const val = S.choices[k] != null ? S.choices[k] : S.lf[k];
  return v == null ? !!val : String(val) === v;
}
const flag = f => !!S.lf[f];
const castVisible = c => cond(c.when) && (!c.show || flag(c.show)) && !(c.hide && flag(c.hide));
const charVisible = id => lv.cast.some(c => c.id === id && castVisible(c));
const hsVisible = h => cond(h.when) && (!h.show || flag(h.show)) && (!h.ch || charVisible(h.ch));
const hsDone = h => !h.decor && flag(h.set || h.id);
const needMet = h => (h.need || []).every(flag);
const key = (h, f) => lv.key + '.' + h.id + (f ? '.' + f : '');
const has = k => G.STR[k] != null;
const hsName = h => has(key(h)) ? T(key(h)) : h.ch ? T('name.' + h.ch) : h.id;
const lines = (h, f) => has(key(h, f)) ? T(key(h, f)) : null;

// ---------- inventory ----------
function combo(a, b) { return COMBOS.find(c => (c[0] === a && c[1] === b) || (c[0] === b && c[1] === a)); }
// Steps of combining needed to make `id` from items in `inv` (null when impossible).
function comboPlan(inv, id, depth) {
  if (inv.includes(id)) return [];
  if ((depth || 0) > 6) return null;
  for (const c of COMBOS) {
    if (c[2] !== id) continue;
    const pa = comboPlan(inv, c[0], (depth || 0) + 1); if (!pa) continue;
    const inv2 = applyPlan(inv, pa);
    const pb = comboPlan(inv2, c[1], (depth || 0) + 1); if (!pb) continue;
    return pa.concat(pb, [c]);
  }
  return null;
}
function applyPlan(inv, plan) { let v = inv.slice(); plan.forEach(c => { v = v.filter(x => x !== c[0] && x !== c[1]); v.push(c[2]); }); return v; }

// Inventory a fresh start of level n carries (story items from earlier levels, default choices).
function startInv(n) {
  let inv = [];
  for (let i = 1; i < n; i++) {
    const lev = L(i);
    inv = inv.filter(x => !(lev.introTake || []).includes(x));
    for (const h of lev.hs) {
      if (h.decor) continue;
      if (h.item) { const p = comboPlan(inv, h.item); if (p) inv = applyPlan(inv, p); if (!h.keep) inv = inv.filter(x => x !== h.item); }
      (h.take || []).forEach(t => { inv = inv.filter(x => x !== t); });
      (h.give || []).forEach(g => { if (!inv.includes(g)) inv.push(g); });
    }
    (lev.outroGive || []).forEach(g => { if (!inv.includes(g)) inv.push(g); });
    inv = inv.filter(x => !(lev.outroTake || []).includes(x)).filter(x => ITEMS[x].keep);
  }
  return inv;
}

function renderInv() {
  UI.inv.innerHTML = '';
  if (!S.inv.length) el('div', 'inv-empty', T('ui.inv.empty'), UI.inv);
  S.inv.forEach(id => {
    const slot = el('button', 'slot' + (selected === id ? ' sel' : ''), null, UI.inv);
    slot.dataset.item = id;
    itemIcon(slot, id);
    slot.onclick = () => clickItem(id);
    slot.onmouseenter = () => setSentence(T('item.' + id));
  });
}
async function clickItem(id) {
  if (busy) return;
  clearHintMarks();
  if (selected === id) { selected = null; renderInv(); renderHeroes(); setSentence(T('ui.unselect')); return; }
  if (selected && selected !== '@snez') {
    const a = selected, c = combo(a, id);
    selected = null;
    if (c) {
      S.inv = S.inv.filter(x => x !== a && x !== id); S.inv.push(c[2]);
      AUDIO.sfx('item'); renderInv(); save();
      await run(T('combo.ok'), { item: T('item.' + c[2]) });
      return;
    }
    renderInv();
    const ring = ['sun_ring', 'moon_ring', 'star_ring'];
    await run(T(ring.includes(a) || ring.includes(id) ? 'combo.order' : 'combo.no'));
    return;
  }
  selected = id; renderInv(); renderHeroes(); AUDIO.sfx('tap');
  const t = fmt(T('ui.select'), { item: T('item.' + id) });
  setSentence(t); speak(T('item.' + id), hero);
}
function giveItem(id) { if (!S.inv.includes(id)) S.inv.push(id); renderInv(); }
function takeItem(id) { S.inv = S.inv.filter(x => x !== id); if (selected === id) selected = null; renderInv(); }

// ---------- heroes ----------
function renderHeroes() {
  UI.heroes.innerHTML = '';
  const list = ['magna', 'papa'].concat(lv && lv.snez && charVisible('snezhana') ? ['snezhana'] : []);
  list.forEach(id => {
    const isOn = id === 'snezhana' ? selected === '@snez' : hero === id;
    const b = el('button', 'port' + (isOn ? ' on' : ''), null, UI.heroes);
    b.dataset.hero = id;
    artImg(b, 'art/characters/' + id + '_idle.png', T('name.' + id), 'mini');
    if (id === 'snezhana') el('span', 'tool', '❄️', b);
    b.onclick = () => {
      if (busy) return;
      clearHintMarks();
      if (id === 'snezhana') { selected = selected === '@snez' ? null : '@snez'; if (selected) { setSentence(T('ui.snez')); speak(T('ui.snez'), 'snezhana'); } }
      else { hero = id; AUDIO.sfx('tap'); speak(T('name.' + id), id); setSentence(T('name.' + id)); }
      renderHeroes(); renderInv();
    };
  });
}

// ---------- scene ----------
const sprites = {};
function spriteW(id) { const h = CHARS[id].h; return id.startsWith('dog_') ? h * 1.25 : id === 'karkusha' ? h * 1.1 : id === 'yeti' ? h * 0.7 : h * 0.42; }
function makeSprite(id, x, y) {
  const h = CHARS[id].h;
  const s = el('div', 'spr', null, UI.sprites);
  const box = artImg(s, 'art/characters/' + id + '_idle.png', T('name.' + id) || id, 'char');
  box.style.minWidth = Math.round(spriteW(id)) + 'px';
  s.style.height = h + 'px';
  s.style.left = x + 'px'; s.style.top = ((y || FEET) - h) + 'px';
  s.style.zIndex = String(Math.round(y || FEET));
  s.box = box; s.id_ = id;
  sprites[id] = s;
  return s;
}
function setPose(id, pose) {
  const s = sprites[id]; if (!s) return;
  const img = s.box.img;
  let want = 'art/characters/' + id + '_' + pose + '.png';
  if (!hasArt(want)) want = 'art/characters/' + id + '_idle.png';
  if (!hasArt(want) || (img.getAttribute && img.getAttribute('src') === want)) return;
  if (pose === 'talk') img.onerror = () => { img.onerror = () => s.box.classList.remove('loaded'); img.src = 'art/characters/' + id + '_idle.png'; };
  else img.onerror = () => s.box.classList.remove('loaded');
  img.src = want;
}

function renderScene() {
  UI.scene.classList.remove('art');
  UI.bgPh.innerHTML = `<b>${lv.scene}</b><span>${T(lv.key + '.name')}</span>`;
  UI.bgPh.className = 'bg-ph act' + lv.act;
  UI.bg.removeAttribute && UI.bg.removeAttribute('src');
  setSrc(UI.bg, 'art/scenes/' + lv.scene + '.jpg');
  renderDynamic();
}
function renderDynamic() {
  // hotspots
  UI.hsLayer.innerHTML = '';
  for (const h of lv.hs) {
    if (!h.r || !hsVisible(h)) continue;
    const d = el('div', 'hs' + (h.decor ? ' decor' : '') + (hsDone(h) ? ' done' : '') + (h.r[1] < 90 ? ' near-top' : ''), null, UI.hsLayer);
    d.style.left = h.r[0] + 'px'; d.style.top = h.r[1] + 'px'; d.style.width = h.r[2] + 'px'; d.style.height = h.r[3] + 'px';
    el('span', 'hs-label', hsName(h), d);
    if (!h.decor && !hsDone(h)) el('span', 'spark', '✨', d);
    d.dataset.hs = h.id;
    d.onclick = () => clickHotspot(h);
    d.onmouseenter = () => hoverText(h);
  }
  // sprites
  UI.sprites.innerHTML = '';
  for (const k in sprites) delete sprites[k];
  makeSprite('magna', pos.magna); makeSprite('papa', pos.papa);
  UI.phone.classList.add('hidden'); UI.phone.innerHTML = '';
  for (const c of lv.cast) {
    if (!castVisible(c)) continue;
    if (c.video) {
      UI.phone.classList.remove('hidden');
      const box = artImg(UI.phone, charSrc(c.id, 'talk'), '📱 ' + T('name.' + c.id), 'video');
      UI.phone.onclick = () => clickChar(c.id);
      UI.phone.box = box;
      continue;
    }
    const s = makeSprite(c.id, c.x, c.y);
    s.onclick = () => clickChar(c.id);
    s.onmouseenter = () => { const h = charHotspot(c.id); if (h) hoverText(h); };
    const h = charHotspot(c.id);
    if (h && !h.decor && !hsDone(h)) el('span', 'spark', '✨', s);
    s.classList.add('npc');
  }
  sprites.magna.classList.toggle('active', hero === 'magna');
  sprites.papa.classList.toggle('active', hero === 'papa');
  renderHeroes(); renderInv(); renderHud();
}
function renderHud() {
  UI.lvName.innerHTML = fmt(T('ui.level'), { n: lv.n }) + ' · ' + T(lv.key + '.name');
  const total = Object.values(S.stars).reduce((a, b) => a + b, 0);
  UI.starsBox.innerHTML = '⭐ ' + total;
}
function setSentence(t) { UI.sentence.innerHTML = t; }
function hoverText(h) {
  if (busy) return;
  const n = hsName(h);
  if (selected === '@snez') setSentence('❄️ → ' + n);
  else if (selected) setSentence(T('item.' + selected) + ' → ' + n);
  else setSentence(n);
}

function charHotspot(id) {
  const list = lv.hs.filter(h => h.ch === id && hsVisible(h));
  return list.find(h => !hsDone(h) && needMet(h) && !h.decor) || list.find(h => !hsDone(h) && !h.decor) || list[list.length - 1] || null;
}
function clickChar(id) {
  const h = charHotspot(id);
  // Tapping Snezhana herself (not only her portrait) arms her freeze power on levels where water is to be crossed.
  if (id === 'snezhana' && lv.snez && !busy && !(h && !h.decor && !hsDone(h))) {
    clearHintMarks(); selected = '@snez'; renderHeroes(); renderInv();
    setSentence(T('ui.snez')); run([['snezhana', T('ui.snez').replace(/^Снежана: /, '')]]);
    return;
  }
  if (h) clickHotspot(h);
  else run([[id, T('look.char')[0][1]]]);
}

async function walkTo(h) {
  let x;
  if (h.r) x = h.r[0] + h.r[2] / 2;
  else { const c = lv.cast.find(q => q.id === h.ch); x = c && !c.video ? c.x + (c.x > pos[hero] ? -130 : 130) : pos[hero]; }
  x = clamp(x, 80, 1200);
  const s = sprites[hero];
  const d = Math.abs(x - pos[hero]);
  if (d < 10) return;
  pos[hero] = x;
  s.classList.add('walking');
  s.style.transitionDuration = (AUTO ? 0 : Math.min(1.4, 0.3 + d / 700)) + 's';
  s.style.left = x + 'px';
  await sleep(Math.min(1400, 300 + d / 0.7));
  s.classList.remove('walking');
}

// ---------- dialogue ----------
let advance = null;
UI.dlgClick = () => { if (advance) { const a = advance; advance = null; a(); } };
function showLine(who, text) {
  UI.dlg.classList.remove('hidden');
  UI.dlgPort.innerHTML = '';
  if (who !== 'narr') artImg(UI.dlgPort, charSrc(who, 'talk'), T('name.' + who), 'port');
  else el('div', 'narr', '📖', UI.dlgPort);
  UI.dlgName.innerHTML = who === 'narr' ? '' : T('name.' + who);
  UI.dlgText.innerHTML = text;
  Object.keys(sprites).forEach(k => setPose(k, k === who ? 'talk' : 'idle'));
  speak(text, who);
}
function waitClick() {
  if (AUTO) return Promise.resolve();
  return new Promise(r => { advance = r; });
}
const autoTried = {};
async function run(list, p) {
  if (!list) return;
  if (!Array.isArray(list)) list = [list];
  const wasBusy = busy; busy = true;
  try {
    for (const ln of list) {
      if (Array.isArray(ln)) { showLine(ln[0], fmt(ln[1], p)); await waitClick(); continue; }
      if (ln.if) { await run(cond(ln.if) ? ln.then : ln.else, p); continue; }
      if (ln.choice) {
        for (;;) {
          const o = await askChoice(ln);
          S.choices[ln.choice] = o.v; save();
          await run(o.then, p);
          if (!o.retry) break;
        }
      }
    }
  } finally {
    UI.dlg.classList.add('hidden');
    Object.keys(sprites).forEach(k => setPose(k, 'idle'));
    busy = wasBusy;
  }
}
function askChoice(ln) {
  UI.dlg.classList.add('hidden');
  UI.choice.classList.remove('hidden');
  UI.choice.innerHTML = '';
  const box = el('div', 'choice-box', null, UI.choice);
  el('div', 'choice-q', '🤔 ' + T('ui.choose'), box);
  speak(T('ui.choose') + ' ' + ln.opts.map(o => fmt(T('ui.option'), { t: o.t })).join(' '), 'magna');
  return new Promise(resolve => {
    const btns = ln.opts.map(o => {
      const b = el('button', 'opt', `<span class="e">${o.e}</span><span>${o.t}</span>`, box);
      b.onclick = () => { UI.choice.classList.add('hidden'); AUDIO.sfx('tap'); resolve(o); };
      return b;
    });
    if (AUTO) {
      const id = ln.choice;
      const retry = ln.opts.findIndex(o => o.retry);
      let k;
      if (retry >= 0 && !autoTried[id]) { autoTried[id] = 1; k = retry; } else {
        const normal = ln.opts.map((o, i) => i).filter(i => !ln.opts[i].retry);
        k = normal[VARIANT % normal.length];
      }
      setTimeout(() => btns[k].onclick(), 0);
    }
  });
}

// ---------- hotspots ----------
async function clickHotspot(h) {
  if (busy) return;
  clearHintMarks();
  if (h.decor) { await run(lines(h, 'look') || T('look.char')); return; }
  if (hsDone(h)) { await run(lines(h, 'look2') || lines(h, 'look') || T('done.generic')); return; }
  if (!needMet(h)) { await run(lines(h, 'lock') || lines(h, 'look') || T('need.first')); return; }
  if (h.hero && hero !== h.hero) { markHero(h.hero); await run(T('hero.' + h.hero)); return; }
  if (h.freeze && selected !== '@snez') { await run(lines(h, 'look') || []); await run(T('need.freeze')); return; }
  if (h.item && selected !== h.item) {
    if (S.inv.includes(h.item) || comboPlan(S.inv, h.item)) { await run(lines(h, 'look') || []); await run(T('need.item'), { item: T('item.' + h.item) }); }
    else await run(lines(h, 'lock') || lines(h, 'look') || T('need.noitem'));
    return;
  }
  if (selected === '@snez' && !h.freeze) { selected = null; renderHeroes(); await run(T('freeze.no')); return; }
  if (selected && selected !== '@snez' && selected !== h.item) { const it = selected; selected = null; renderInv(); await run(T('combo.no'), { item: T('item.' + it) }); return; }
  await perform(h);
}

async function perform(h) {
  busy = true;
  try {
    await walkTo(h);
    if (h.item) { if (!h.keep) takeItem(h.item); selected = null; renderInv(); }
    if (h.freeze) { selected = null; AUDIO.sfx('freeze'); renderHeroes(); }
    await run(lines(h, 'do'));
    if (h.puzzle) await runPuzzle(h);
    S.lf[h.set || h.id] = 1;
    for (const t of h.take || []) takeItem(t);
    for (const g of h.give || []) { giveItem(g); AUDIO.sfx('item'); await run(T('got.item'), { item: T('item.' + g) }); }
    await run(lines(h, 'done'));
    save();
    renderDynamic();
    if (h.goal) await finishLevel();
  } finally { busy = false; }
}

// ---------- puzzles ----------
let pzState = null;
function runPuzzle(h) {
  return new Promise(resolve => {
    const type = h.puzzle;
    const inst = PZ.gen(type, lv.tier, { theme: h.theme });
    const demo = !S.seen[type];
    let hl = 0, wrongs = 0, finished = false;
    UI.pz.classList.remove('hidden');
    UI.pz.innerHTML = '';
    const box = el('div', 'pz-box', null, UI.pz);
    const head = el('div', 'pz-head', null, box);
    const bRep = el('button', 'pzb', '🔊', head);
    const prompt = el('div', 'pz-prompt', inst.prompt, head);
    const bHint = el('button', 'pzb', '💡', head);
    const bSkip = el('button', 'pzb skip', '⏭', head);
    const cap = el('div', 'pz-cap', demo ? T('ui.demo.first') : '', box);
    const host = el('div', 'pz-host k-' + inst.kind + ' t-' + type, null, box);
    const caption = (t, who) => { cap.innerHTML = t; speak(t, who || 'papa'); };

    const done = async (skipped) => {
      if (finished) return;
      finished = true;
      if (!skipped) { AUDIO.sfx('ok'); caption(pick(T('ui.correct')), hero); }
      S.seen[type] = 1; save();
      await sleep(skipped ? 300 : 1100);
      UI.pz.classList.add('hidden'); UI.pz.innerHTML = '';
      pzState = null;
      resolve();
    };
    const api = {
      demo,
      solved: () => done(false),
      wrong: (...els) => {
        AUDIO.sfx('no');
        els.forEach(e => { if (!e) return; e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); });
        if (demo) { caption(T('ui.demo.tap')); return; }
        wrongs++;
        if (wrongs % 2 === 0 && hl < 3) giveHint(true);
        else caption(pick(T('ui.wrong')), hero);
      },
      say: t => caption(t),
      sfx: n => AUDIO.sfx(n),
      later: (f, ms) => setTimeout(f, AUTO ? 0 : ms),
      sleep: ms => sleep(ms),
    };
    const ctl = PZ.render(inst, host, api);
    function giveHint(auto) {
      if (finished) return;
      hl = Math.min(3, hl + 1);
      if (!auto) S.hints++;
      if (hl === 1) caption(has('pz.' + type + '.h1') ? T('pz.' + type + '.h1') : T('hint.p2'));
      else { ctl.hint(hl); caption(T(hl === 2 ? 'hint.p2' : 'hint.p3')); }
    }
    bRep.onclick = () => speak(inst.prompt, 'papa');
    bHint.onclick = () => giveHint(false);
    bSkip.onclick = () => { caption(T('ui.skipped')); done(true); };
    pzState = { inst, ctl, giveHint };
    if (demo) { ctl.hint(3); speak(T('pz.' + type + '.intro') + ' ' + inst.prompt, 'papa'); cap.innerHTML = T('pz.' + type + '.intro'); }
    else speak(inst.prompt, 'papa');
    if (AUTO) {
      setTimeout(async () => {
        try { giveHint(true); giveHint(true); giveHint(true); await ctl.auto(); } catch (e) { autoErr('puzzle ' + type + ': ' + e.message); }
        setTimeout(() => { if (!finished) autoErr('puzzle ' + type + ' not solved by auto()'); }, 50);
      }, 0);
    }
  });
}

// ---------- hints in the scene ----------
function nextStep() {
  const h = lv.hs.find(x => !x.decor && hsVisible(x) && !hsDone(x) && needMet(x));
  if (!h) return null;
  if (h.item && !S.inv.includes(h.item)) {
    const plan = comboPlan(S.inv, h.item);
    if (plan && plan.length) return { kind: 'combine', h, a: plan[0][0], b: plan[0][1] };
  }
  if (h.hero && hero !== h.hero) return { kind: 'hero', h };
  if (h.item && selected !== h.item) return { kind: 'item', h };
  if (h.freeze && selected !== '@snez') return { kind: 'freeze', h };
  return { kind: 'go', h };
}
function clearHintMarks() {
  UI.arrow.classList.add('hidden');
  [UI.heroes, UI.inv].forEach(p => Array.from(p.children).forEach(c => c.classList.remove('glow')));
}
function markHero(id) { Array.from(UI.heroes.children).forEach(c => c.classList.toggle('glow', c.dataset.hero === id)); }
function markItem(id) { Array.from(UI.inv.children).forEach(c => { if (c.dataset.item === id) c.classList.add('glow'); }); }
function pointAt(h) {
  let x, y;
  if (h.r) { x = h.r[0] + h.r[2] / 2; y = h.r[1]; }
  else if (h.ch && lv.cast.find(c => c.id === h.ch && c.video)) { x = 1170; y = 70; }
  else { const c = lv.cast.find(q => q.id === h.ch); x = c.x; y = (c.y || FEET) - CHARS[h.ch].h; }
  UI.arrow.style.left = (x - 30) + 'px'; UI.arrow.style.top = Math.max(56, y - 70) + 'px';
  UI.arrow.classList.remove('hidden');
}
async function sceneHint() {
  if (busy || !lv) return;
  const st = nextStep();
  if (!st) return;
  const k = st.kind + ':' + st.h.id;
  hintLevel = hintTarget === k ? Math.min(3, hintLevel + 1) : 1;
  hintTarget = k;
  S.hints++;
  AUDIO.sfx('item');
  const nudge = st.kind === 'go' ? (st.h.puzzle ? 'puzzle' : st.h.ch ? 'talk' : 'go') : st.kind;
  if (hintLevel === 1) return run(T('hint.s1.' + nudge));
  if (st.kind === 'combine') { markItem(st.a); markItem(st.b); }
  else pointAt(st.h);
  if (hintLevel === 2) return run(T('hint.s2'));
  const name = hsName(st.h);
  if (st.kind === 'combine') return run(T('hint.s3.combine'), { a: T('item.' + st.a), b: T('item.' + st.b) });
  if (st.kind === 'hero') { markHero(st.h.hero); return run(T('hint.s3.hero'), { hero: T('name.' + st.h.hero), name }); }
  if (st.kind === 'item') { markItem(st.h.item); return run(T('hint.s3.item'), { item: T('item.' + st.h.item), name }); }
  if (st.kind === 'freeze') { markHero('snezhana'); return run(T('hint.s3.freeze'), { name }); }
  return run(T('hint.s3.go'), { name });
}

// ---------- levels ----------
let levelDone = null;
async function startLevel(n, resume) {
  lv = L(n);
  S.level = n; S.started = true;
  if (!resume) { S.lf = {}; S.inv = startInv(n); S.hints = 0; }
  hero = 'magna'; selected = null; hintTarget = null;
  pos = { magna: 170, papa: 290 };
  hideOverlays();
  renderScene();
  AUDIO.music('act' + lv.act);
  save();
  if (!S.lf._intro) {
    busy = true;
    try {
      (lv.introTake || []).forEach(takeItem);
      await run(T(lv.key + '.intro'));
      S.lf._intro = 1; save();
    } finally { busy = false; }
  }
  setSentence(T('ui.default'));
}
async function finishLevel() {
  (lv.outroGive || []).forEach(giveItem);
  (lv.outroTake || []).forEach(takeItem);
  await run(T(lv.key + '.outro'));
  const n = lv.n;
  const got = S.hints === 0 ? 2 : 1;
  S.stars[n] = Math.max(S.stars[n] || 0, got);
  S.inv = S.inv.filter(x => ITEMS[x].keep);
  S.lf = {}; S.hints = 0;
  S.maxLevel = Math.max(S.maxLevel, Math.min(30, n + 1));
  S.level = Math.min(30, n + 1);
  if (n === 30) S.won = true;
  save();
  renderHud();
  AUDIO.sfx('star');
  await showCard(`<div class="big-star">${got === 2 ? '⭐⭐' : '⭐'}</div><h1>${T('ui.star')}</h1><p>${T(lv.key + '.name')}</p>` +
    (got === 2 ? `<p class="gold">${T('ui.star2')}</p>` : ''), T('ui.star') + (got === 2 ? ' ' + T('ui.star2') : ''));
  if (levelDone) levelDone(n);
  if (AUTO) return;
  if (n === 30) { showEnding(); return; }
  const next = L(n + 1);
  if (next.city !== lv.city) await flyMap(lv, next);
  startLevel(n + 1);
}
function hideOverlays() { [UI.card, UI.map, UI.title, UI.pz, UI.choice, UI.dlg].forEach(e => e.classList.add('hidden')); }
function showCard(html, spoken) {
  return new Promise(resolve => {
    UI.card.classList.remove('hidden');
    UI.card.innerHTML = '';
    const b = el('div', 'card-box', html, UI.card);
    const go = el('button', 'big', T('ui.next'), b);
    if (spoken) speak(spoken, 'papa');
    go.onclick = () => { UI.card.classList.add('hidden'); resolve(); };
    if (AUTO) setTimeout(() => go.onclick(), 0);
  });
}

// World map: the plane flies from one city to the next; an act title when the act changes.
function flyMap(from, to) {
  return new Promise(resolve => {
    AUDIO.music('title');
    UI.map.classList.remove('hidden');
    UI.map.innerHTML = '';
    artImg(UI.map, 'art/ui/worldmap.jpg', '', 'mapimg');
    for (const c in CITIES) {
      const d = el('div', 'city' + (c === to.city ? ' to' : c === from.city ? ' from' : ''), `<i></i><span>${T('city.' + c)}</span>`, UI.map);
      d.style.left = CITIES[c].x + 'px'; d.style.top = CITIES[c].y + 'px';
    }
    const a = CITIES[from.city], b = CITIES[to.city];
    const plane = el('div', 'plane', '✈️', UI.map);
    plane.style.left = a.x + 'px'; plane.style.top = a.y + 'px';
    plane.style.transform = `translate(-50%, -50%) rotate(${Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI}deg)`;
    const cap = el('div', 'map-cap', '', UI.map);
    const text = fmt(T('ui.fly'), { to: T('city.' + to.city) });
    cap.innerHTML = (to.act !== from.act ? `<small>${fmt(T('ui.act'), { n: to.act })}</small><b>${T('act.' + to.act)}</b>` : '') + text;
    speak((to.act !== from.act ? fmt(T('ui.act'), { n: to.act }) + '. ' + T('act.' + to.act) + '. ' : '') + text, 'papa');
    setTimeout(() => { plane.style.left = b.x + 'px'; plane.style.top = b.y + 'px'; }, AUTO ? 0 : 400);
    const go = el('button', 'big map-go', T('ui.next'), UI.map);
    go.onclick = () => { UI.map.classList.add('hidden'); resolve(); };
    if (AUTO) setTimeout(() => go.onclick(), 0);
  });
}

function showEnding() {
  AUDIO.music('title');
  UI.card.classList.remove('hidden');
  UI.card.innerHTML = '';
  artImg(UI.card, 'art/ui/ending.jpg', '', 'endimg');
  const b = el('div', 'card-box end', `<h1>${T('ui.end')}</h1><p>${T('ui.credits')}</p>`, UI.card);
  speak(T('ui.end') + '. ' + T('ui.credits'), 'papa');
  el('button', 'big', T('ui.again'), b).onclick = () => showTitle();
}

// ---------- title ----------
let codeSeq = [];
function showTitle() {
  stopSpeech();
  hideOverlays();
  AUDIO.music('title');
  UI.title.classList.remove('hidden');
  UI.title.innerHTML = '';
  artImg(UI.title, 'art/ui/title.jpg', '', 'titleimg');
  const box = el('div', 'title-box', null, UI.title);
  const rings = el('div', 'title-rings', null, box);
  [['☀️', 's'], ['🌙', 'm'], ['⭐', 't']].forEach(([e, k]) => {
    el('button', 'ring-btn', e, rings).onclick = () => { codeSeq = codeSeq.concat(k).slice(-8); AUDIO.sfx('tap'); if (codeSeq.join('') === 'sssmtttt') unlockAll(); };
  });
  el('h1', null, T('ui.title'), box);
  el('h2', null, T('ui.subtitle'), box);
  el('p', null, T('ui.story'), box);
  const row = el('div', 'row', null, box);
  if (S.started) el('button', 'big', T('ui.continue') + ' · ' + S.level, row).onclick = () => { AUDIO.unlock(); startLevel(S.level, true); };
  el('button', 'big', T('ui.new'), row).onclick = () => {
    AUDIO.unlock();
    const keep = { stars: S.stars, seen: S.seen, sound: S.sound, maxLevel: S.maxLevel, unlockAll: S.unlockAll };
    S = Object.assign(fresh(), keep);
    startLevel(1);
  };
  el('div', 'lv-title', T('ui.levels'), box);
  const grid = el('div', 'lv-grid', null, box);
  for (let n = 1; n <= 30; n++) {
    const open = S.unlockAll || n <= S.maxLevel;
    const b = el('button', 'lv' + (open ? '' : ' locked'), `${open ? n : '🔒'}<small>${'⭐'.repeat(S.stars[n] || 0)}</small>`, grid);
    b.dataset.level = n;
    if (open) b.onclick = () => { AUDIO.unlock(); startLevel(n); };
  }
  speak(T('ui.title') + '. ' + T('ui.subtitle'), 'papa');
}
function unlockAll() {
  S.unlockAll = true; save();
  AUDIO.sfx('star'); speak(T('ui.code.ok'), 'papa');
  showTitle();
}
let keySeq = '';
function onKey(e) {
  if (!UI.title.classList.contains('hidden')) {
    keySeq = (keySeq + (e.key || '')).slice(-3);
    if (keySeq === '314') unlockAll();
  }
  if ((e.key === ' ' || e.key === 'Enter') && advance) UI.dlgClick();
}

// ---------- autotest ----------
const autoErrors = [];
function autoErr(m) { autoErrors.push(m); }
async function autotest() {
  const log = (...a) => console.log(...a);
  let errs = 0;
  G.addEventListener && G.addEventListener('error', e => { errs++; autoErr('error: ' + (e.message || e)); });
  G.addEventListener && G.addEventListener('unhandledrejection', e => { errs++; autoErr('rejection: ' + (e.reason && e.reason.message || e.reason)); });
  S = fresh(); S.unlockAll = true;
  let pass = 0;
  const results = [];
  for (let n = 1; n <= 30; n++) {
    const before = autoErrors.length;
    let ok = false, reason = '';
    try {
      let completed = false;
      levelDone = () => { completed = true; };
      await startLevel(n, false);
      for (let k = 0; k < 3; k++) await sceneHint();
      for (let step = 0; step < 80 && !completed; step++) {
        const st = nextStep();
        if (!st) { reason = 'no next step'; break; }
        if (st.kind === 'combine') { await clickItem(st.a); await clickItem(st.b); continue; }
        if (st.h.hero) { hero = st.h.hero; }
        if (st.h.item) selected = st.h.item;
        if (st.h.freeze) selected = '@snez';
        await clickHotspot(st.h);
        await sleep(0);
      }
      // exercise the scene hint, the world map and a decor click
      if (completed && n < 30 && L(n + 1).city !== L(n).city) await flyMap(L(n), L(n + 1));
      ok = completed && autoErrors.length === before;
      if (!completed && !reason) reason = 'goal not reached';
      if (autoErrors.length > before) reason = autoErrors.slice(before).join('; ');
    } catch (e) { reason = e.message; }
    results.push(ok);
    if (ok) pass++;
    log((ok ? 'PASS' : 'FAIL') + ' level ' + n + (ok ? '' : ': ' + reason));
  }
  levelDone = null;
  showEnding();
  const msg = `AUTOTEST DONE: ${pass}/30 PASS, errors: ${errs}`;
  log(msg);
  G.AUTOTEST_RESULT = { pass, results, errors: errs + autoErrors.length };
  return G.AUTOTEST_RESULT;
}

// ---------- boot ----------
function boot() {
  load();
  buildUI();
  UI.dlg.onclick = () => UI.dlgClick();
  G.addEventListener && G.addEventListener('keydown', onKey);
  applySound();
  if (AUTO) { G.AUTOTEST = autotest(); return; }
  showTitle();
}
G.ENGINE = { boot, state: () => S, nextStep, startInv, comboPlan };
if (G.document && G.document.readyState !== 'loading') boot();
else if (G.document) G.document.addEventListener('DOMContentLoaded', boot);
})(typeof window !== 'undefined' ? window : globalThis);
