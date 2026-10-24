// Puzzle generators, answer checking and renderers.
// PZ.gen(type, tier, {theme, rand}) -> instance (plain data, node-testable)
// PZ.check(inst, answer) -> true when the answer solves the instance
// PZ.render(inst, host, api) -> controller { hint(level), auto() } (browser / DOM shim)
(function (G) {
'use strict';
const T = (k, p) => G.T(k, p);

function mkRand(rand) {
  rand = rand || Math.random;
  const r = {
    int: n => Math.floor(rand() * n),
    pick: a => a[Math.floor(rand() * a.length)],
    shuf: a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    between: (a, b) => a + Math.floor(rand() * (b - a + 1)),
  };
  return r;
}

const EMO = ['🍎', '⭐', '🐟', '🌸', '🎈', '🐞', '🍄', '🦋', '🐚', '🍓', '🌙', '🔔', '🐥', '🍋', '🧸', '⚽'];
const DISTRACT = ['📚', '🧦', '🥄', '🕯️', '🧺', '🪴', '🖍️', '🧩', '🪁', '🎀', '🧲', '🪣', '🥁', '📦', '🧤', '🪀', '🎲', '🔦'];
const MEM = {
  mittens: ['🧤', '🧣', '🎿', '⛄', '❄️', '🛷', '🥾', '🧢'],
  metro: ['🚇', '🎫', '🚪', '⏰', '🗺️', '💡', '🎒', '🕯️'],
  eggs: ['🥚', '🐣', '🐥', '🪺', '🌾', '🐟', '🌸', '🪶'],
  pages: ['📖', '✒️', '🖋️', '📜', '🔍', '🕰️', '⚓', '🧭'],
  desert: ['🐪', '🌴', '☀️', '🦂', '🏺', '🌵', '🦎', '💧'],
  stones: ['🪨', '❄️', '🏔️', '🌨️', '🐾', '⛺', '🧗', '🔭'],
  any: EMO,
};
const ODD = {
  fruit: ['🍎', '🍌', '🍐', '🍇', '🍓', '🍒', '🍑', '🍊'],
  animals: ['🐱', '🐶', '🐰', '🦊', '🐻', '🐸', '🐷', '🐮'],
  transport: ['🚗', '🚌', '🚂', '✈️', '🚲', '🚀', '🚜', '⛵'],
  toys: ['🧸', '🪀', '🎈', '🪁', '🎲', '🧩'],
  clothes: ['👕', '👗', '🧦', '👖', '🧢', '🧣', '🧤'],
  food: ['🧀', '🥖', '🥞', '🍪', '🧇', '🥐'],
};
const SHADOW = {
  clothes: ['👕', '👗', '🧦', '👖', '🧢', '👒', '🧤', '👟'],
  any: ['🐘', '🦒', '🐇', '🦆', '🐌', '🦀', '🐢', '🦋', '🐓', '🐿️', '🐬', '✈️', '🚲', '☂️', '🔑', '🎸'],
};
const SUDOKU = {
  flowers: ['🌹', '🌻', '🌷', '🌼'], yarn: ['🔴', '🟡', '🔵', '🟢'], shells: ['🐚', '🦀', '⭐', '🐠'],
  toys: ['🧸', '🚗', '⚽', '🪀'], snow: ['❄️', '⛄', '🎿', '🧤'], any: ['🍎', '🍋', '🍇', '🍐'],
};
const SIZEITEM = { jars: '🏺', stones: '🪨', any: '🎈' };
const MIRROR = ['🐟', '🦒', '🚗', '✈️', '🐌', '🦕', '🐎', '🚂', '🐊', '🦜', '🛴', '🐓', '🦩', '🐇'];
const SYM = ['★', '●', '▲', '■', '◆', '♥', '☾', '✿', '✚'];
const PALETTE = { red: '#e53935', blue: '#1e63d6', green: '#2e9e44', yellow: '#f7d21e', orange: '#f58220', purple: '#8e44c9', pink: '#f27ab0', white: '#f4f4f4', brown: '#8d5a2b' };

const swatch = (hex, shape) => {
  if (shape === 'jar') return `<svg width="76" height="86" viewBox="0 0 40 46"><rect x="9" y="2" width="22" height="7" rx="2" fill="#777"/><rect x="5" y="9" width="30" height="34" rx="6" fill="${hex}" stroke="#0004" stroke-width="2"/><rect x="9" y="14" width="6" height="22" rx="3" fill="#fff6"/></svg>`;
  if (shape === 'ticket') return `<svg width="100" height="64" viewBox="0 0 50 32"><path d="M2 4h46v8a4 4 0 0 0 0 8v8H2v-8a4 4 0 0 0 0-8z" fill="${hex}" stroke="#0004" stroke-width="1.5"/><text x="25" y="22" font-size="14" text-anchor="middle">✈</text></svg>`;
  if (shape === 'plane') return `<svg width="160" height="110" viewBox="0 0 64 44"><path d="M4 22 L56 18 Q63 22 56 26 Z" fill="${hex}" stroke="#0005"/><path d="M26 20 L16 4 L24 4 L38 20Z M26 24 L16 40 L24 40 L38 24Z M8 22 L4 12 L9 12 L14 21Z" fill="${hex}" stroke="#0005"/></svg>`;
  return `<svg width="80" height="80" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="${hex}" stroke="#0004" stroke-width="2"/></svg>`;
};
const rep = (e, n) => Array(n).fill(e).join('');
const rows5 = (e, n) => { let s = ''; for (let i = 0; i < n; i += 5) s += `<div>${rep(e, Math.min(5, n - i))}</div>`; return s; };
const big = (h, px) => `<span style="font-size:${px || 96}px">${h}</span>`;

function numChoice(r, n, k, lo, hi) {
  const s = new Set([n]); let g = 0;
  while (s.size < k && g++ < 100) { const v = n + r.pick([-3, -2, -1, 1, 2, 3]); if (v >= lo && v <= hi) s.add(v); }
  const vals = r.shuf([...s]);
  return { options: vals.map(String), answer: vals.indexOf(n) };
}
const choice = (prompt, body, options, answer, extra) => Object.assign({ kind: 'choice', prompt, body, options, answer }, extra || {});

// ---------- generators ----------
const GEN = {};

GEN.find = (r, tier, theme) => {
  const pool = T('pz.find.pool');
  const cands = pool.filter(p => p[2] === theme);
  const tgt = r.pick(cands.length ? cands : pool);
  const n = tier <= 1 ? r.between(3, 4) : r.between(4, Math.min(6, 3 + tier));
  const others = r.shuf(DISTRACT).slice(0, 6 + Math.min(tier, 4));
  const list = r.shuf([...Array(n).fill(tgt[0]), ...others]);
  const cells = r.shuf([...Array(24).keys()]);
  const items = list.map((e, i) => {
    const c = cells[i];
    return { e, x: 20 + (c % 8) * 122 + r.int(40), y: 15 + Math.floor(c / 8) * 135 + r.int(35), s: 64 + r.int(24) };
  });
  const targets = items.map((it, i) => it.e === tgt[0] ? i : -1).filter(i => i >= 0);
  return { kind: 'find', prompt: T('pz.find.prompt', { what: tgt[1], n }), items, targets, solution: targets };
};

GEN.color = (r, tier, theme) => {
  const names = Object.keys(PALETTE).filter(c => c !== 'white' && c !== 'brown');
  const k = tier <= 1 ? 3 : 4;
  if (theme === 'pass') {
    const cs = r.shuf(names).slice(0, k), a = r.int(k);
    return choice(T('pz.color.pass'), swatch(PALETTE[cs[a]], 'plane'), cs.map(c => swatch(PALETTE[c], 'ticket')), a, { solution: a });
  }
  const obj = r.pick(T('pz.color.objs'));
  const cs = r.shuf([obj[2], ...r.shuf(Object.keys(PALETTE).filter(c => c !== obj[2])).slice(0, k - 1)]);
  const a = cs.indexOf(obj[2]);
  return choice(T(theme === 'paints' ? 'pz.color.paints' : 'pz.color.prompt', { what: obj[1] }), big(obj[0], 120),
    cs.map(c => swatch(PALETTE[c], theme === 'paints' ? 'jar' : 'circle')), a, { solution: a });
};

function countGen(r, tier, theme, lo, hi, k) {
  const th = T('pz.count.themes')[theme] || [r.pick(EMO), 'pz.count.any'];
  const n = r.between(lo, hi);
  const o = numChoice(r, n, k, 1, Math.max(hi + 2, 6));
  return choice(T(th[1]), `<div class="rows">${rows5(th[0], n)}</div>`, o.options, o.answer, { solution: o.answer });
}
GEN.count5 = (r, tier, theme) => countGen(r, tier, theme, 1, 5, 3);
GEN.count10 = (r, tier, theme) => countGen(r, tier, theme, 4, 10, 4);

GEN.same = (r, tier, theme) => {
  const k = tier <= 1 ? 4 : tier <= 3 ? 5 : 6;
  const pool = theme === 'diary' ? ['📕', '📗', '📘', '📙', '📓', '📔', '📒'] : EMO;
  let opts;
  if (tier <= 1) {
    const e = r.shuf(pool).slice(0, k - 1);
    opts = [...e, e[0]];
  } else {
    const a = r.shuf(EMO).slice(0, 4);
    const combos = r.shuf([[a[0], a[1]], [a[1], a[0]], [a[0], a[2]], [a[2], a[1]], [a[3], a[1]], [a[0], a[3]]]).slice(0, k - 1).map(c => c.join(''));
    opts = [...combos, combos[0]];
  }
  const sh = r.shuf(opts.map((h, i) => ({ h, i })));
  const ans = sh.map((o, i) => o.h === opts[0] ? i : -1).filter(i => i >= 0);
  return { kind: 'pick2', prompt: T('pz.same.prompt'), options: sh.map(o => big(o.h, 72)), answer: ans, solution: ans };
};

function orderGen(r, len, theme) {
  const seqs = T('pz.order.seqs').filter(s => s[1].length === len);
  const s = seqs.find(q => q[0] === theme) || r.pick(seqs);
  let perm;
  do { perm = r.shuf([...Array(len).keys()]); } while (perm.every((v, i) => v === i));
  const items = perm.map(i => big(s[1][i], 80));
  const solution = [...Array(len).keys()].map(step => perm.indexOf(step));
  return { kind: 'order', prompt: T(s[2] || 'pz.order.prompt'), items, solution };
}
GEN.order3 = (r, tier, theme) => orderGen(r, 3, theme);
GEN.order4 = (r, tier, theme) => orderGen(r, 4, theme);

function memoryGen(r, pairs, theme) {
  const e = r.shuf(MEM[theme] || MEM.any).slice(0, pairs);
  const cards = r.shuf([...e, ...e]);
  const solution = e.map(x => cards.map((c, i) => c === x ? i : -1).filter(i => i >= 0));
  return { kind: 'memory', prompt: T('pz.memory.prompt'), cards, solution };
}
GEN.memory4 = (r, tier, theme) => memoryGen(r, 4, theme);
GEN.memory6 = (r, tier, theme) => memoryGen(r, 6, theme);
GEN.memory8 = (r, tier, theme) => memoryGen(r, 8, theme);

function addGen(r, lo, hi, maxPart, k, theme) {
  const e = theme === 'bells' ? '🔔' : theme === 'coconuts' ? '🥥' : theme === 'lights' ? '💡' : r.pick(EMO);
  const s = r.between(lo, hi);
  const a = r.between(Math.max(1, s - maxPart), Math.min(maxPart, s - 1)), b = s - a;
  const o = numChoice(r, s, k, 1, hi + 3);
  const body = `<div class="sum"><div class="rows">${rows5(e, a)}</div><b>+</b><div class="rows">${rows5(e, b)}</div></div>`;
  return choice(T('pz.add.prompt'), body, o.options, o.answer, { solution: o.answer });
}
GEN.add5 = (r, tier, theme) => addGen(r, 2, 5, 4, 3, theme);
GEN.add10 = (r, tier, theme) => addGen(r, 4, 10, 6, 4, theme);
GEN.add20 = (r, tier, theme) => addGen(r, 11, 20, 10, 4, theme);

function subGen(r, lo, hi, k, theme) {
  const e = theme === 'steps' ? '🟫' : theme === 'tracks' ? '👣' : theme === 'shells' ? '🐚' : r.pick(EMO);
  const t = r.between(lo, hi), m = r.between(1, t - 1);
  const o = numChoice(r, t - m, k, 0, hi);
  const body = `<div class="rows">${rep(e, t - m)}<span class="gone">${rep(e, m)}</span></div>`;
  return choice(T(theme ? 'pz.sub.' + theme : 'pz.sub.prompt'), body, o.options, o.answer, { solution: o.answer });
}
GEN.sub5 = (r, tier, theme) => subGen(r, 2, 5, 3, theme);
GEN.sub10 = (r, tier, theme) => subGen(r, 5, 10, 4, theme);

function patternGen(r, pats, theme) {
  const em = theme === 'sun' ? r.shuf(['☀️', '🌤️', '⛅', '🌙']).slice(0, 3) : r.shuf(EMO).slice(0, 3);
  const p = r.pick(pats);
  const seq = Array.from({ length: 6 }, (_, i) => em[p[i % p.length]]);
  const ans = seq[5];
  const opts = r.shuf(em);
  return choice(T('pz.pattern.prompt'), `<div class="seq">${seq.slice(0, 5).join(' ')} <span class="q">?</span></div>`,
    opts.map(e => big(e, 80)), opts.indexOf(ans), { solution: opts.indexOf(ans) });
}
GEN.pattern2 = (r, tier, theme) => patternGen(r, [[0, 1]], theme);
GEN.pattern3 = (r, tier, theme) => patternGen(r, [[0, 1, 2], [0, 0, 1], [0, 1, 1]], theme);

GEN.pattern_grow = (r, tier) => {
  const e = r.pick(EMO), s = r.between(1, 2), step = tier >= 6 ? r.between(1, 2) : 1;
  const grp = n => `<span class="grp">${rows5(e, n)}</span>`;
  const n4 = s + 3 * step;
  const vals = r.shuf([n4, n4 + 1, n4 - 1]);
  return choice(T('pz.grow.prompt'), `<div class="seq">${grp(s)}${grp(s + step)}${grp(s + 2 * step)}<span class="q">?</span></div>`,
    vals.map(grp), vals.indexOf(n4), { solution: vals.indexOf(n4) });
};

GEN.letter = (r, tier) => {
  const words = T('pz.words');
  const w = r.pick(words), l = w[1][0];
  const others = r.shuf(words.filter(x => x[1][0] !== l)).slice(0, tier <= 2 ? 2 : 3);
  const opts = r.shuf([w, ...others]);
  return choice(T('pz.letter.prompt', { l }), `<div class="letter">${l}</div>`, opts.map(o => big(o[0], 84)), opts.indexOf(w),
    { solution: opts.indexOf(w), words: opts.map(o => o[1]) });
};

GEN.odd = (r, tier, theme) => {
  const keys = Object.keys(ODD);
  const A = ODD[theme] ? theme : r.pick(keys);
  const B = r.pick(keys.filter(k => k !== A));
  const it = r.shuf(ODD[A]).slice(0, tier <= 3 ? 3 : 4), o = r.pick(ODD[B]);
  const opts = r.shuf([...it, o]);
  return choice(T('pz.odd.prompt'), '', opts.map(e => big(e, 84)), opts.indexOf(o), { solution: opts.indexOf(o) });
};

GEN.biggest = (r, tier, theme) => {
  const e = SIZEITEM[theme] || r.pick(['🎈', '🐟', '🍎', '⭐']);
  const sizes = [44, 66, 92, 124];
  const perm = r.shuf([0, 1, 2, 3]);
  const items = perm.map(i => `<span style="font-size:${sizes[i]}px">${e}</span>`);
  const solution = [3, 2, 1, 0].map(si => perm.indexOf(si));
  return { kind: 'order', prompt: T('pz.biggest.prompt'), items, solution };
};

GEN.shadow = (r, tier, theme) => {
  const pool = SHADOW[theme] || SHADOW.any;
  const opts = r.shuf(pool).slice(0, tier <= 3 ? 3 : 4), a = r.int(opts.length);
  return choice(T('pz.shadow.prompt'), `<span class="sil">${opts[a]}</span>`, opts.map(e => big(e, 84)), a, { solution: a });
};

// Maze: grid of open cells and rocks; tap a path from start to goal.
GEN.maze = (r, tier, theme) => mazeGen(r, 5, theme);
GEN.maze7 = (r, tier, theme) => mazeGen(r, 7, theme);
function mazeGen(r, n, theme) {
  const th = T('pz.maze.themes')[theme] || T('pz.maze.themes').any;
  for (;;) {
    const start = [0, r.int(n)], goal = [n - 1, r.int(n)];
    const key = (x, y) => y * n + x;
    // random DFS from start until goal is reached
    const seen = new Set([key(...start)]);
    const path = [start];
    const dfs = () => {
      const [x, y] = path[path.length - 1];
      if (x === goal[0] && y === goal[1]) return true;
      for (const [dx, dy] of r.shuf([[1, 0], [0, 1], [0, -1], [-1, 0], [1, 0]])) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= n || ny >= n || seen.has(key(nx, ny))) continue;
        // keep the path one cell wide: no touching earlier path cells except the previous one
        const touch = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => seen.has(key(nx + a, ny + b))).length;
        if (touch > 1) continue;
        seen.add(key(nx, ny)); path.push([nx, ny]);
        if (dfs()) return true;
        path.pop();
      }
      return false;
    };
    if (!dfs() || path.length < n + 2) continue;
    const open = Array(n * n).fill(false);
    path.forEach(([x, y]) => { open[key(x, y)] = true; });
    for (let i = 0; i < n * n; i++) if (!open[i] && r.int(100) < 45) open[i] = true;
    return { kind: 'maze', prompt: T(th[2]), n, open, start, goal, hero: th[0], target: th[1],
      solution: path.slice(1).map(([x, y]) => key(x, y)) };
  }
}

function latin(r, n) {
  const rows = r.shuf([...Array(n).keys()]), cols = r.shuf([...Array(n).keys()]), syms = r.shuf([...Array(n).keys()]);
  return rows.map(i => cols.map(j => syms[(i + j) % n]));
}
function sudokuGen(r, n, blanks, theme) {
  const sol = latin(r, n).flat();
  const holes = r.shuf([...Array(n * n).keys()]).slice(0, blanks);
  const grid = sol.map((v, i) => holes.includes(i) ? null : v);
  return { kind: 'sudoku', prompt: T('pz.sudoku.prompt'), n, symbols: (SUDOKU[theme] || SUDOKU.any).slice(0, n), grid, solution: sol };
}
GEN.sudoku3 = (r, tier, theme) => sudokuGen(r, 3, 3, theme);
GEN.sudoku4 = (r, tier, theme) => sudokuGen(r, 4, tier >= 6 ? 6 : 5, theme);

// Ice: freeze k water tiles so the land connects from the left bank to the right bank.
GEN.ice = (r, tier) => {
  const w = 6, h = 4, k = 3;
  for (;;) {
    const cells = Array(w * h).fill('W');
    for (let y = 0; y < h; y++) { cells[y * w] = 'L'; cells[y * w + w - 1] = 'L'; }
    let y = r.int(h);
    const path = [];
    for (let x = 1; x < w - 1; x++) {
      path.push(y * w + x);
      if (r.int(2) && x < w - 2) { const ny = Math.max(0, Math.min(h - 1, y + r.pick([-1, 1]))); if (ny !== y) { y = ny; path.push(y * w + x); } }
    }
    const water = r.shuf(path).slice(0, k);
    path.forEach(i => { if (!water.includes(i)) cells[i] = 'L'; });
    const free = r.shuf([...Array(w * h).keys()].filter(i => cells[i] === 'W' && !path.includes(i)));
    free.slice(0, 2).forEach(i => { cells[i] = 'L'; });
    const inst = { kind: 'ice', prompt: T('pz.ice.prompt', { k }), w, h, k, cells, solution: water.slice().sort((a, b) => a - b) };
    if (iceConnected(inst, [])) continue;
    if (!iceConnected(inst, inst.solution)) continue;
    return inst;
  }
};
function iceConnected(inst, frozen) {
  const { w, h, cells } = inst;
  const ok = i => cells[i] === 'L' || frozen.includes(i);
  const q = []; const seen = new Set();
  for (let y = 0; y < h; y++) { q.push(y * w); seen.add(y * w); }
  while (q.length) {
    const i = q.shift(); const x = i % w, y = Math.floor(i / w);
    if (x === w - 1) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, j = ny * w + nx;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen.has(j) || !ok(j)) continue;
      seen.add(j); q.push(j);
    }
  }
  return false;
}

GEN.syllable = (r, tier) => {
  const words = T('pz.syll');
  const w = r.pick(words);
  const opts = r.shuf([w, ...r.shuf(words.filter(x => x !== w)).slice(0, 2)]);
  return choice(T('pz.syll.prompt', { a: w[1], b: w[2] }), `<div class="syl">${w[1]} + ${w[2]} = ?</div>`, opts.map(o => big(o[0], 84)), opts.indexOf(w),
    { solution: opts.indexOf(w) });
};

const clockSvg = h => {
  const a = (h % 12) * 30 * Math.PI / 180;
  let ticks = '';
  for (let i = 1; i <= 12; i++) { const b = i * 30 * Math.PI / 180; ticks += `<text x="${50 + 38 * Math.sin(b)}" y="${54 + -38 * Math.cos(b)}" font-size="11" text-anchor="middle" fill="#333">${i}</text>`; }
  return `<svg width="220" height="220" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#fffbe8" stroke="#6b4a1e" stroke-width="4"/>${ticks}` +
    `<line x1="50" y1="50" x2="50" y2="12" stroke="#1e63d6" stroke-width="3" stroke-linecap="round"/>` +
    `<line x1="50" y1="50" x2="${50 + 24 * Math.sin(a)}" y2="${50 - 24 * Math.cos(a)}" stroke="#e53935" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="50" r="4" fill="#333"/></svg>`;
};
GEN.clock = (r) => {
  const h = r.between(1, 12);
  const o = numChoice(r, h, 3, 1, 12);
  return choice(T('pz.clock.prompt'), clockSvg(h), o.options, o.answer, { solution: o.answer });
};

GEN.scale = (r, tier, theme) => {
  const pool = theme === 'toys' ? ['🧸', '🚂', '🪀', '🤖', '🎲'] : ['🍉', '🍍', '🍌', '🍎', '🥥', '🍇'];
  const [hv, md, lt] = r.shuf(pool).slice(0, 3);
  const lightest = tier >= 6 && r.int(2) === 1;
  const sc = (a, b) => { // a is heavier
    const left = r.int(2) ? [a, b] : [b, a];
    const dl = left[0] === a ? 18 : -18;
    return `<div class="scale"><span style="transform:translateY(${dl}px)">${left[0]}</span><span class="beam">⚖️</span><span style="transform:translateY(${-dl}px)">${left[1]}</span></div>`;
  };
  const opts = r.shuf([hv, md, lt]);
  const ans = opts.indexOf(lightest ? lt : hv);
  return choice(T(lightest ? 'pz.scale.light' : 'pz.scale.prompt'), `<div class="scales">${r.int(2) ? sc(hv, md) + sc(md, lt) : sc(md, lt) + sc(hv, md)}</div>`,
    opts.map(e => big(e, 84)), ans, { solution: ans });
};

// River: Dad rows, takes at most one passenger; a eats/chases b and b eats c when left alone.
GEN.river = (r, tier, theme) => {
  const themes = T('pz.river.themes');
  const th = themes.find(t => t.id === theme) || r.pick(themes);
  const order = r.shuf([0, 1, 2]); // display order -> role (0 chaser, 1 middle, 2 food)
  const roleIdx = role => order.indexOf(role);
  const second = r.int(2) ? 0 : 2;
  const roles = [1, -1, second, 1, 2 - second, -1, 1];
  const solution = roles.map(x => x < 0 ? -1 : roleIdx(x));
  return { kind: 'river', prompt: T('pz.river.prompt', { a: th.items[0][1], b: th.items[1][1], c: th.items[2][1] }),
    items: order.map(role => th.items[role]), roles: order, unsafe: [[roleIdx(0), roleIdx(1)], [roleIdx(1), roleIdx(2)]], solution };
};
function riverStep(inst, st, m) { // st: [dad, p0, p1, p2] sides 0/1; returns new state or null
  if (m >= 0 && st[m + 1] !== st[0]) return null;
  const n = st.slice(); n[0] = 1 - n[0]; if (m >= 0) n[m + 1] = n[0];
  return n;
}
function riverUnsafe(inst, st) {
  return inst.unsafe.find(([a, b]) => st[a + 1] === st[b + 1] && st[a + 1] !== st[0]) || null;
}
function riverSolve(inst, st) { // BFS over the 16 states -> list of moves
  const k = s => s.join('');
  const q = [[st, []]], seen = new Set([k(st)]);
  while (q.length) {
    const [s, path] = q.shift();
    if (s.every(v => v === 1)) return path;
    for (const m of [-1, 0, 1, 2]) {
      const n = riverStep(inst, s, m);
      if (!n || riverUnsafe(inst, n) || seen.has(k(n))) continue;
      seen.add(k(n)); q.push([n, path.concat(m)]);
    }
  }
  return null;
}

GEN.code = (r) => {
  const words = T('pz.code.words');
  const w = r.pick(words);
  const letters = [...new Set(w[1].split(''))];
  const extra = r.shuf([...'АБВГДЕИКЛМНОПРСТУ'].filter(l => !letters.includes(l))).slice(0, 2);
  const syms = r.shuf(SYM).slice(0, letters.length + extra.length);
  const table = r.shuf(letters.concat(extra).map((l, i) => [syms[i], l]));
  const symOf = l => table.find(t => t[1] === l)[0];
  const coded = w[1].split('').map(symOf).join(' ');
  const opts = r.shuf([w, ...r.shuf(words.filter(x => x[1] !== w[1])).slice(0, 2)]);
  const body = `<div class="codetable">${table.map(t => `<span>${t[0]}=${t[1]}</span>`).join('')}</div><div class="coded">${coded}</div>`;
  return choice(T('pz.code.prompt'), body, opts.map(o => big(o[0], 84)), opts.indexOf(w), { solution: opts.indexOf(w) });
};

GEN.code4 = (r, tier, theme) => {
  const em = theme === 'recipe' ? ['🥚', '🥛', '🧂', '🥄'] : r.shuf(EMO).slice(0, 4);
  const digits = [], clues = [];
  for (let i = 0; i < 4; i++) {
    const d = r.between(1, 6);
    digits.push(d);
    if (theme !== 'recipe' && d >= 2 && r.int(2)) { const a = r.between(1, d - 1); clues.push(`${rep(em[i], a)}<b>+</b>${rep(em[i], d - a)}`); } else clues.push(rows5(em[i], d));
  }
  return { kind: 'code4', prompt: T(theme === 'recipe' ? 'pz.code4.recipe' : 'pz.code4.prompt'), clues, solution: digits };
};

GEN.mirror = (r) => {
  const pair = r.shuf(MIRROR).slice(0, 2).join('');
  const g = t => `<span style="display:inline-block;font-size:80px;transform:${t}">${pair}</span>`;
  const kinds = r.shuf(['scaleX(-1)', 'none', 'scaleY(-1)']);
  return choice(T('pz.mirror.prompt'), `<div class="mirror">${g('none')}<span class="mline"></span></div>`, kinds.map(g), kinds.indexOf('scaleX(-1)'),
    { solution: kinds.indexOf('scaleX(-1)') });
};

GEN.pairs = (r, tier, theme) => {
  const th = T('pz.pairs.themes')[theme] || T('pz.pairs.themes').any;
  const k = r.between(2, 6), n = 2 * k;
  const s = new Set([n]);
  while (s.size < 4) { const v = n + r.pick([-4, -2, -1, 1, 2, 4]); if (v > 0) s.add(v); }
  const vals = r.shuf([...s]);
  const body = `<div class="pairs">${rep(`<span class="pr"><span>${th[0]}</span><small>${th[1]}${th[1]}</small></span>`, k)}</div>`;
  return choice(T(th[2]), body, vals.map(String), vals.indexOf(n), { solution: vals.indexOf(n) });
};

// Lights: 3x3 lanterns; a tap toggles itself and its neighbours; light them all.
const LN = 3;
function lightsPress(on, i) {
  const x = i % LN, y = Math.floor(i / LN);
  const o = on.slice();
  [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < LN && ny < LN) o[ny * LN + nx] = !o[ny * LN + nx];
  });
  return o;
}
function lightsSolve(on) { // minimal set of presses (brute force 512)
  let best = null;
  for (let m = 0; m < 512; m++) {
    let s = on; const ps = [];
    for (let i = 0; i < 9; i++) if (m & (1 << i)) { s = lightsPress(s, i); ps.push(i); }
    if (s.every(Boolean) && (!best || ps.length < best.length)) best = ps;
  }
  return best;
}
GEN.lights = (r, tier) => {
  const m = r.between(2, 3);
  const presses = r.shuf([...Array(9).keys()]).slice(0, m).sort((a, b) => a - b);
  let on = Array(9).fill(true);
  presses.forEach(i => { on = lightsPress(on, i); });
  return { kind: 'lights', prompt: T('pz.lights.prompt'), on, solution: presses };
};

GEN.rings = (r) => {
  const targets = ['☀️', '🌙', '⭐'];
  const rings = targets.map(t => {
    const syms = r.shuf([t, ...r.shuf(['🌊', '🐟', '🐚', '👑', '⚓', '🐙']).slice(0, 5)]);
    const target = syms.indexOf(t);
    let pos; do { pos = r.int(6); } while (pos === target);
    return { syms, pos, target };
  });
  return { kind: 'rings', prompt: T('pz.rings.prompt'), rings, solution: rings.map(g => (g.target - g.pos + 6) % 6) };
};

GEN.who = (r, tier, theme) => {
  const th = T('pz.who.themes')[theme] || T('pz.who.themes').hats;
  const friends = r.shuf(th.friends).slice(0, 3);
  let colors = r.shuf(th.colors).slice(0, 3);
  if (th.must && !colors.some(c => c[0] === th.must)) colors[0] = th.colors.find(c => c[0] === th.must);
  colors = r.shuf(colors);
  const sol = r.shuf([0, 1, 2]);
  const [A, B] = r.shuf([0, 1, 2]);
  const notY = r.pick([0, 1, 2].filter(c => c !== sol[A] && c !== sol[B]));
  const clues = [
    T('pz.who.is', { a: friends[A][1], c: colors[sol[A]][1], what: th.what }),
    T('pz.who.not', { a: friends[B][1], c: colors[notY][1], what: th.what }),
  ];
  return { kind: 'who', prompt: T(th.prompt) + ' ' + clues.join(' '), friends, colors, clues, solution: sol };
};

GEN.route = (r, tier, theme) => {
  const th = T('pz.route.themes')[theme] || T('pz.route.themes').festival;
  const stops = th;
  const perm = r.shuf([0, 1, 2, 3]); // perm[k] = stop at position k
  const pos = s => perm.indexOf(s);
  const all = [];
  for (const s of [0, 1, 2, 3]) { if (pos(s) === 0) all.push(['first', s]); if (pos(s) === 3) all.push(['last', s]); }
  for (const a of [0, 1, 2, 3]) for (const b of [0, 1, 2, 3]) if (a !== b && pos(a) < pos(b)) all.push(['before', a, b]);
  const perms = []; (function p(a, rest) { if (!rest.length) perms.push(a); rest.forEach((x, i) => p(a.concat(x), rest.filter((_, j) => j !== i))); })([], [0, 1, 2, 3]);
  const sat = (pm, c) => { const ps = s => pm.indexOf(s); return c[0] === 'first' ? ps(c[1]) === 0 : c[0] === 'last' ? ps(c[1]) === 3 : ps(c[1]) < ps(c[2]); };
  for (;;) {
    const clues = [];
    for (const c of r.shuf(all)) {
      clues.push(c);
      if (perms.filter(pm => clues.every(cc => sat(pm, cc))).length === 1) break;
    }
    if (clues.length > 3) continue;
    const say = clues.map(c => c[0] === 'first' ? T('pz.route.first', { a: stops[c[1]][1] }) : c[0] === 'last' ? T('pz.route.last', { a: stops[c[1]][1] }) : T('pz.route.before', { a: stops[c[1]][1], b: stops[c[2]][1] }));
    const show = r.shuf([0, 1, 2, 3]);
    return { kind: 'order', route: true, prompt: T('pz.route.prompt') + ' ' + say.join(' '), clues, clueText: say,
      items: show.map(s => `${big(stops[s][0], 72)}<small>${stops[s][1]}</small>`), stopOf: show, solution: perm.map(s => show.indexOf(s)) };
  }
};

const TYPES = {
  find: 1, color: 1, count5: 1, same: 1, order3: 1,
  memory4: 2, count10: 2, add5: 2, pattern2: 2, letter: 2, order4: 2,
  add10: 3, odd: 3, biggest: 3, memory6: 3, pattern3: 3, shadow: 3, sub5: 3,
  maze: 4, sudoku3: 4, ice: 4, syllable: 4, sub10: 4, clock: 4, memory8: 4,
  add20: 5, scale: 5, sudoku4: 5, river: 5, code: 5, mirror: 5, pattern_grow: 5,
  pairs: 6, lights: 6, rings: 6, who: 6, route: 6, code4: 6, maze7: 6,
};

function gen(type, tier, opts) {
  opts = opts || {};
  const g = GEN[type];
  if (!g) throw new Error('unknown puzzle ' + type);
  const inst = g(mkRand(opts.rand), Math.max(tier, TYPES[type]), opts.theme);
  inst.type = type;
  return inst;
}

// ---------- checking ----------
function check(inst, ans) {
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const sorted = a => a.slice().sort((x, y) => x - y);
  switch (inst.kind) {
    case 'choice': return ans === inst.answer;
    case 'pick2': return Array.isArray(ans) && same(sorted(ans), sorted(inst.answer));
    case 'find': return Array.isArray(ans) && same(sorted(ans), sorted(inst.targets));
    case 'order':
      if (!Array.isArray(ans) || ans.length !== inst.items.length) return false;
      if (inst.route) {
        const order = ans.map(i => inst.stopOf[i]); const ps = s => order.indexOf(s);
        return new Set(order).size === 4 && inst.clues.every(c => c[0] === 'first' ? ps(c[1]) === 0 : c[0] === 'last' ? ps(c[1]) === 3 : ps(c[1]) < ps(c[2]));
      }
      return same(ans, inst.solution);
    case 'memory': {
      if (!Array.isArray(ans) || ans.length * 2 !== inst.cards.length) return false;
      const used = new Set();
      return ans.every(([a, b]) => a !== b && !used.has(a) && !used.has(b) && used.add(a) && used.add(b) && inst.cards[a] === inst.cards[b]);
    }
    case 'maze': {
      const n = inst.n; let [x, y] = inst.start;
      for (const c of ans) {
        const cx = c % n, cy = Math.floor(c / n);
        if (!inst.open[c] || Math.abs(cx - x) + Math.abs(cy - y) !== 1) return false;
        x = cx; y = cy;
      }
      return x === inst.goal[0] && y === inst.goal[1];
    }
    case 'sudoku': {
      const n = inst.n;
      if (!Array.isArray(ans) || ans.length !== n * n) return false;
      if (inst.grid.some((v, i) => v !== null && v !== ans[i])) return false;
      for (let i = 0; i < n; i++) {
        const row = new Set(), col = new Set();
        for (let j = 0; j < n; j++) { row.add(ans[i * n + j]); col.add(ans[j * n + i]); }
        if (row.size !== n || col.size !== n || [...row].some(v => v == null || v < 0 || v >= n)) return false;
      }
      return true;
    }
    case 'ice': return Array.isArray(ans) && new Set(ans).size === ans.length && ans.length <= inst.k && ans.every(i => inst.cells[i] === 'W') && iceConnected(inst, ans);
    case 'river': {
      let st = [0, 0, 0, 0];
      for (const m of ans) { st = riverStep(inst, st, m); if (!st || riverUnsafe(inst, st)) return false; }
      return st.every(v => v === 1);
    }
    case 'lights': { let on = inst.on; ans.forEach(i => { on = lightsPress(on, i); }); return on.every(Boolean); }
    case 'rings': return ans.length === 3 && inst.rings.every((g, i) => (g.pos + ans[i]) % 6 === g.target);
    case 'who': case 'code4': return Array.isArray(ans) && same(ans, inst.solution);
  }
  return false;
}

// ---------- rendering ----------
function el(tag, cls, html, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
const tap = (e, f) => { e.onclick = f; return e; };
const glow = e => e && e.classList.add('glow');

const R = {};

R.choice = (inst, host, api) => {
  if (inst.body) el('div', 'pz-body', inst.body, host);
  const box = el('div', 'pz-opts', null, host);
  let done = false;
  const btns = inst.options.map((h, i) => tap(el('button', 'op', h, box), () => {
    if (done) return;
    if (i === inst.answer) { done = true; btns[i].classList.add('ok'); api.solved(); } else api.wrong(btns[i]);
  }));
  return {
    hint(l) {
      if (l >= 2) { const w = btns.find((b, i) => i !== inst.answer && !b.classList.contains('dim')); if (w) w.classList.add('dim'); }
      if (l >= 3) glow(btns[inst.answer]);
    },
    auto() { btns[inst.answer].onclick(); },
  };
};

R.pick2 = (inst, host, api) => {
  const box = el('div', 'pz-opts', null, host);
  let sel = null, done = false;
  const btns = inst.options.map((h, i) => tap(el('button', 'op', h, box), () => {
    if (done) return;
    if (sel === null) { sel = i; btns[i].classList.add('sel'); api.sfx('tap'); return; }
    if (sel === i) { btns[i].classList.remove('sel'); sel = null; return; }
    const pair = [sel, i]; btns[sel].classList.remove('sel'); sel = null;
    if (check(inst, pair)) { done = true; pair.forEach(j => btns[j].classList.add('ok')); api.solved(); } else api.wrong(btns[pair[1]], btns[pair[0]]);
  }));
  return { hint(l) { glow(btns[inst.answer[0]]); if (l >= 3) glow(btns[inst.answer[1]]); }, auto() { inst.answer.forEach(i => btns[i].onclick()); } };
};

R.find = (inst, host, api) => {
  const panel = el('div', 'pz-find', null, host);
  const got = new Set();
  const cnt = el('div', 'pz-count', '', host);
  const upd = () => { cnt.innerHTML = '✔️ ' + got.size + ' / ' + inst.targets.length; };
  upd();
  const items = inst.items.map((it, i) => {
    const b = tap(el('button', 'fi', it.e, panel), () => {
      if (got.has(i)) return;
      if (inst.targets.includes(i)) {
        got.add(i); b.classList.add('ok'); api.sfx('tap'); upd();
        if (got.size === inst.targets.length) api.solved();
      } else api.wrong(b);
    });
    b.style.left = it.x + 'px'; b.style.top = it.y + 'px'; b.style.fontSize = it.s + 'px';
    return b;
  });
  const left = () => inst.targets.filter(i => !got.has(i));
  return { hint(l) { (l >= 3 ? left() : left().slice(0, 1)).forEach(i => glow(items[i])); }, auto() { left().forEach(i => items[i].onclick()); } };
};

R.order = (inst, host, api) => {
  if (inst.route) el('div', 'pz-clues', inst.clueText.map(t => '• ' + t).join('<br>'), host);
  const box = el('div', 'pz-opts', null, host);
  let step = 0;
  const btns = inst.items.map((h, i) => tap(el('button', 'op tall', h, box), () => {
    if (btns[i].classList.contains('ok') || step >= inst.solution.length) return;
    if (inst.solution[step] === i) {
      btns[i].classList.add('ok'); el('b', 'badge', String(step + 1), btns[i]); step++; api.sfx('tap');
      if (step === inst.solution.length) api.solved();
    } else api.wrong(btns[i]);
  }));
  return {
    hint(l) { (l >= 3 ? inst.solution.slice(step) : [inst.solution[step]]).forEach((i, k) => { glow(btns[i]); if (l >= 3) el('b', 'ghost', String(step + k + 1), btns[i]); }); },
    auto() { inst.solution.slice(step).forEach(i => btns[i].onclick()); },
  };
};

R.memory = (inst, host, api) => {
  const box = el('div', 'pz-mem n' + inst.cards.length, null, host);
  let open = [], lock = false, found = 0;
  const done = new Set();
  const cards = inst.cards.map((c, i) => tap(el('button', 'card', '❔', box), () => {
    if (lock || done.has(i) || open.includes(i)) return;
    cards[i].innerHTML = c; cards[i].classList.add('up'); api.sfx('tap'); open.push(i);
    if (open.length < 2) return;
    const [a, b] = open;
    if (inst.cards[a] === inst.cards[b]) {
      done.add(a); done.add(b); cards[a].classList.add('ok'); cards[b].classList.add('ok'); open = []; found++;
      if (found * 2 === inst.cards.length) api.solved(); else api.sfx('ok');
    } else {
      lock = true;
      api.later(() => { [a, b].forEach(j => { cards[j].innerHTML = '❔'; cards[j].classList.remove('up'); }); open = []; lock = false; }, 800);
    }
  }));
  const nextPair = () => inst.solution.find(p => !done.has(p[0]));
  return {
    hint(l) {
      if (l === 2 && !lock) {
        lock = true;
        cards.forEach((c, i) => { if (!done.has(i)) c.innerHTML = inst.cards[i]; });
        api.later(() => { cards.forEach((c, i) => { if (!done.has(i) && !open.includes(i)) c.innerHTML = '❔'; }); lock = false; }, 1600);
      }
      if (l >= 3) { const p = nextPair(); if (p) p.forEach(i => glow(cards[i])); }
    },
    async auto() {
      for (const p of inst.solution) {
        if (done.has(p[0])) continue;
        while (lock) await api.sleep(20);
        open.forEach(j => { cards[j].innerHTML = '❔'; }); open = [];
        cards[p[0]].onclick(); cards[p[1]].onclick();
      }
    },
  };
};

R.maze = (inst, host, api) => {
  const n = inst.n;
  const box = el('div', 'pz-grid', null, host);
  box.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  box.classList.add('g' + n);
  let trail = [inst.start[1] * n + inst.start[0]];
  const goal = inst.goal[1] * n + inst.goal[0];
  const cells = [];
  const draw = () => cells.forEach((c, i) => {
    const cur = trail[trail.length - 1];
    c.innerHTML = i === cur ? inst.hero : i === goal ? inst.target : inst.open[i] ? (trail.includes(i) ? '•' : '') : '🪨';
    c.classList.toggle('trail', trail.includes(i));
    c.classList.toggle('rock', !inst.open[i]);
  });
  const adj = (a, b) => Math.abs(a % n - b % n) + Math.abs(Math.floor(a / n) - Math.floor(b / n)) === 1;
  for (let i = 0; i < n * n; i++) {
    cells.push(tap(el('button', 'cell', '', box), () => {
      if (trail[trail.length - 1] === goal) return;
      const k = trail.indexOf(i);
      if (k >= 0) { trail = trail.slice(0, k + 1); draw(); return; }
      if (!inst.open[i] || !adj(i, trail[trail.length - 1])) { api.wrong(cells[i]); return; }
      trail.push(i); api.sfx('tap'); draw();
      if (i === goal) api.solved();
    }));
  }
  draw();
  const shortest = () => { // BFS from the current cell to the goal over open cells not in the trail
    const s = trail[trail.length - 1], prev = { [s]: -1 }, q = [s];
    while (q.length) {
      const c = q.shift(); if (c === goal) break;
      for (const d of [1, -1, n, -n]) {
        const j = c + d;
        if (j < 0 || j >= n * n || !adj(c, j) || !inst.open[j] || j in prev || (trail.includes(j) && j !== s)) continue;
        prev[j] = c; q.push(j);
      }
    }
    if (!(goal in prev)) return null;
    const p = []; for (let c = goal; c !== s; c = prev[c]) p.unshift(c); return p;
  };
  return {
    hint(l) { let p = shortest(); if (!p) { trail = trail.slice(0, 1); draw(); p = shortest(); } (l >= 3 ? p : p.slice(0, 2)).forEach(i => glow(cells[i])); },
    auto() { trail = trail.slice(0, 1); draw(); inst.solution.forEach(i => cells[i].onclick()); },
  };
};

R.sudoku = (inst, host, api) => {
  const n = inst.n;
  const box = el('div', 'pz-grid sudo g' + n, null, host);
  box.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  const val = inst.grid.slice();
  let done = false;
  const cells = val.map((v, i) => {
    const c = el('button', 'cell' + (v === null ? ' blank' : ' given'), v === null ? '' : inst.symbols[v], box);
    if (v === null) tap(c, () => {
      if (done) return;
      val[i] = val[i] === null ? 0 : val[i] + 1 < n ? val[i] + 1 : null;
      c.innerHTML = val[i] === null ? '' : inst.symbols[val[i]]; api.sfx('tap');
      if (val.every(x => x !== null)) {
        if (check(inst, val)) { done = true; api.solved(); return; }
        const bad = [];
        for (let k = 0; k < n * n; k++) if (inst.grid[k] === null) {
          const r = Math.floor(k / n), q = k % n;
          for (let j = 0; j < n; j++) if ((r * n + j !== k && val[r * n + j] === val[k]) || (j * n + q !== k && val[j * n + q] === val[k])) { bad.push(cells[k]); break; }
        }
        api.wrong(...(bad.length ? bad : [c]));
      }
    });
    return c;
  });
  const blanks = () => cells.map((c, i) => i).filter(i => inst.grid[i] === null && val[i] !== inst.solution[i]);
  return {
    hint(l) { (l >= 3 ? blanks() : blanks().slice(0, 1)).forEach(i => { glow(cells[i]); el('small', 'ghost', inst.symbols[inst.solution[i]], cells[i]); }); },
    auto() {
      for (const i of cells.map((c, k) => k).filter(k => inst.grid[k] === null)) {
        let g = 0; while (val[i] !== inst.solution[i] && g++ < n + 2 && !done) cells[i].onclick();
      }
    },
  };
};

R.ice = (inst, host, api) => {
  const box = el('div', 'pz-grid ice', null, host);
  box.style.gridTemplateColumns = `repeat(${inst.w}, 1fr)`;
  const frozen = [];
  let done = false;
  const left = el('div', 'pz-count', '', host);
  const upd = () => { left.innerHTML = '❄️ × ' + (inst.k - frozen.length); };
  const cells = inst.cells.map((t, i) => {
    const x = i % inst.w;
    const c = el('button', 'cell ' + (t === 'L' ? 'land' : 'water'), t === 'L' ? (x === 0 ? '🚶' : x === inst.w - 1 ? '🏁' : '🪨') : '🌊', box);
    if (t === 'W') tap(c, () => {
      if (done) return;
      const k = frozen.indexOf(i);
      if (k >= 0) { frozen.splice(k, 1); c.innerHTML = '🌊'; c.classList.remove('frozen'); upd(); return; }
      if (frozen.length >= inst.k) { api.wrong(c); return; }
      frozen.push(i); c.innerHTML = '🧊'; c.classList.add('frozen'); api.sfx('freeze'); upd();
      if (iceConnected(inst, frozen)) { done = true; api.solved(); }
    });
    return c;
  });
  upd();
  return {
    hint(l) { const need = inst.solution.filter(i => !frozen.includes(i)); (l >= 3 ? need : need.slice(0, 1)).forEach(i => glow(cells[i])); },
    auto() { frozen.slice().filter(i => !inst.solution.includes(i)).forEach(i => cells[i].onclick()); inst.solution.filter(i => !frozen.includes(i)).forEach(i => cells[i].onclick()); },
  };
};

R.river = (inst, host, api) => {
  const wrap = el('div', 'pz-river', null, host);
  const banks = [el('div', 'bank', null, wrap), el('div', 'water', null, wrap), el('div', 'bank', null, wrap)];
  let st = [0, 0, 0, 0], done = false;
  const boat = tap(el('button', 'op boat', '👨🚣', null), () => move(-1));
  const btns = inst.items.map((it, i) => tap(el('button', 'op', `${big(it[0], 64)}`, null), () => move(i)));
  const draw = () => {
    banks[0].innerHTML = ''; banks[2].innerHTML = ''; banks[1].innerHTML = '';
    btns.forEach((b, i) => banks[st[i + 1] ? 2 : 0].appendChild(b));
    banks[1].appendChild(boat);
    boat.style.alignSelf = st[0] ? 'flex-end' : 'flex-start';
  };
  function move(m) {
    if (done) return;
    if (m >= 0 && st[m + 1] !== st[0]) { api.wrong(btns[m]); api.say(T('pz.river.far')); return; }
    const n = riverStep(inst, st, m);
    const bad = riverUnsafe(inst, n);
    if (bad) { api.wrong(m >= 0 ? btns[m] : boat); api.say(T('pz.river.eat', { a: inst.items[bad[0]][1], b: inst.items[bad[1]][1] })); return; }
    st = n; api.sfx('tap'); draw();
    if (st.every(v => v === 1)) { done = true; api.solved(); }
  }
  draw();
  return {
    hint(l) { const p = riverSolve(inst, st); if (!p || !p.length) return; glow(p[0] < 0 ? boat : btns[p[0]]); if (l >= 3) api.say(p[0] < 0 ? T('pz.river.alone') : T('pz.river.take', { a: inst.items[p[0]][1] })); },
    auto() { (riverSolve(inst, st) || []).forEach(m => move(m)); },
  };
};

R.lights = (inst, host, api) => {
  const box = el('div', 'pz-grid g3 lights', null, host);
  box.style.gridTemplateColumns = 'repeat(3, 1fr)';
  let on = inst.on.slice(), done = false;
  const cells = on.map((v, i) => tap(el('button', 'cell', '', box), () => {
    if (done) return;
    on = lightsPress(on, i); api.sfx('tap'); draw();
    if (on.every(Boolean)) { done = true; api.solved(); }
  }));
  const draw = () => cells.forEach((c, i) => { c.innerHTML = on[i] ? '🏮' : '⚫'; c.classList.toggle('lit', on[i]); });
  draw();
  return {
    hint(l) { const p = lightsSolve(on) || []; (l >= 3 ? p : p.slice(0, 1)).forEach(i => glow(cells[i])); },
    auto() { (lightsSolve(on) || []).forEach(i => cells[i].onclick()); },
  };
};

R.rings = (inst, host, api) => {
  const disc = el('div', 'pz-rings', null, host);
  el('div', 'marker', '▼', disc);
  const pos = inst.rings.map(g => g.pos);
  let done = false;
  const ringEls = inst.rings.map((g, k) => {
    const ring = el('div', 'ring r' + k, null, disc);
    g.syms.forEach((s, j) => {
      const sp = el('span', 'sym', s, ring);
      const a = j * 60 * Math.PI / 180, rad = [170, 120, 70][k];
      sp.style.left = (rad + rad * Math.sin(a) - 22) + 'px'; sp.style.top = (rad - rad * Math.cos(a) - 22) + 'px';
    });
    return ring;
  });
  const draw = () => ringEls.forEach((r, k) => { r.style.transform = `rotate(${-pos[k] * 60}deg)`; });
  draw();
  const box = el('div', 'pz-opts', null, host);
  const btns = ['☀️', '🌙', '⭐'].map((s, k) => tap(el('button', 'op', s + ' ↻', box), () => {
    if (done) return;
    pos[k] = (pos[k] + 1) % 6; api.sfx('tap'); draw();
    if (inst.rings.every((g, i) => pos[i] === g.target)) { done = true; api.solved(); }
  }));
  const need = () => inst.rings.map((g, i) => (g.target - pos[i] + 6) % 6);
  return {
    hint(l) { need().forEach((t, k) => { if (t) { glow(btns[k]); if (l >= 3) el('b', 'badge', '×' + t, btns[k]); } }); },
    auto() { need().forEach((t, k) => { for (let i = 0; i < t; i++) btns[k].onclick(); }); },
  };
};

R.who = (inst, host, api) => {
  el('div', 'pz-clues', inst.clues.map(t => '• ' + t).join('<br>'), host);
  const box = el('div', 'pz-opts', null, host);
  const val = [null, null, null];
  const hat = c => c === null ? '❔' : `<span class="hat" style="background:${inst.colors[c][0]}"></span>`;
  const rows = inst.friends.map((f, i) => {
    const b = tap(el('button', 'op tall', '', box), () => { val[i] = val[i] === null ? 0 : (val[i] + 1) % 3; api.sfx('tap'); draw(); });
    return b;
  });
  const draw = () => rows.forEach((b, i) => { b.innerHTML = `${big(inst.friends[i][0], 64)}<div>${hat(val[i])}</div><small>${inst.friends[i][1]}</small>`; });
  draw();
  const ok = tap(el('button', 'op go', '✔️', box), () => {
    if (check(inst, val)) { ok.classList.add('ok'); api.solved(); } else api.wrong(...rows.filter((b, i) => val[i] !== inst.solution[i]));
  });
  return {
    hint(l) { (l >= 3 ? [0, 1, 2] : [0]).forEach(i => { val[i] = inst.solution[i]; }); draw(); (l >= 3 ? [0, 1, 2] : [0]).forEach(i => glow(rows[i])); if (l >= 3) glow(ok); },
    auto() { inst.solution.forEach((s, i) => { let g = 0; while (val[i] !== s && g++ < 5) rows[i].onclick(); }); ok.onclick(); },
  };
};

R.code4 = (inst, host, api) => {
  const box = el('div', 'pz-code4', null, host);
  const val = [0, 0, 0, 0];
  const wheels = inst.clues.map((c, i) => {
    const col = el('div', 'slot', null, box);
    el('div', 'clue', c, col);
    return tap(el('button', 'op wheel', '0', col), () => { val[i] = (val[i] + 1) % 10; wheels[i].innerHTML = String(val[i]); api.sfx('tap'); });
  });
  const ok = tap(el('button', 'op go', '✔️', el('div', 'pz-opts', null, host)), () => {
    if (check(inst, val)) { ok.classList.add('ok'); api.solved(); } else api.wrong(...wheels.filter((w, i) => val[i] !== inst.solution[i]));
  });
  return {
    hint(l) { inst.solution.forEach((d, i) => { if (val[i] !== d && (l >= 3 || i === inst.solution.findIndex((x, j) => val[j] !== x))) { glow(wheels[i]); el('small', 'ghost', String(d), wheels[i].parentNode); } }); },
    auto() { inst.solution.forEach((d, i) => { while (val[i] !== d) wheels[i].onclick(); }); ok.onclick(); },
  };
};

function render(inst, host, api) { return R[inst.kind](inst, host, api); }

G.PZ = { TYPES, gen, check, render, mkRand, lightsSolve, riverSolve, iceConnected };
})(typeof window !== 'undefined' ? window : globalThis);
