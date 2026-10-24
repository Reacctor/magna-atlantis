// Small WebAudio chiptune: a title theme, one motif per act, and six sound effects.
(function (G) {
let ctx = null, master = null, musicGain = null, on = true, timer = null, current = null, wanted = null;

function ac() {
  if (ctx) return ctx;
  const AC = G.AudioContext || G.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.22; musicGain.connect(master);
  } catch (e) { ctx = null; }
  return ctx;
}

const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
function tone(freq, t, dur, type, vol, dest) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type || 'square'; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || master);
  o.start(t); o.stop(t + dur + 0.02);
}

// Tunes: [melody midi notes (0 = rest), bass notes, beat seconds]
const TUNES = {
  title: [[72, 76, 79, 76, 77, 74, 71, 74, 72, 76, 79, 84, 83, 79, 76, 0], [48, 48, 55, 55, 53, 53, 55, 55], 0.2],
  act1: [[67, 71, 74, 71, 72, 69, 67, 0, 69, 72, 76, 74, 71, 67, 69, 0], [43, 43, 48, 48, 45, 45, 47, 47], 0.18], // samba-ish São Paulo
  act2: [[69, 72, 76, 72, 74, 71, 69, 0, 64, 69, 72, 71, 69, 68, 69, 0], [45, 45, 40, 40, 41, 41, 40, 40], 0.24], // Russian minor
  act3: [[72, 74, 76, 77, 79, 77, 76, 74, 72, 76, 79, 76, 74, 71, 72, 0], [48, 48, 53, 53, 55, 55, 48, 48], 0.21], // bells
  act4: [[69, 70, 73, 74, 76, 74, 73, 70, 69, 0, 73, 74, 73, 70, 69, 0], [45, 45, 45, 45, 46, 46, 45, 45], 0.22], // desert
  act5: [[64, 67, 71, 72, 71, 67, 64, 0, 62, 66, 69, 71, 69, 66, 64, 0], [40, 40, 47, 47, 38, 38, 40, 40], 0.26], // mountains
  act6: [[72, 74, 76, 79, 81, 79, 76, 74, 72, 74, 76, 74, 72, 69, 67, 0], [48, 48, 45, 45, 43, 43, 48, 48], 0.19], // pentatonic Asia
};

function playLoop(name) {
  const tune = TUNES[name]; if (!tune) return;
  const [mel, bass, beat] = tune;
  let i = 0;
  const step = () => {
    const c = ac(); if (!c || !on || current !== name) return;
    if (c.state !== 'running') { timer = setTimeout(step, 300); return; } // wait for the first tap to unlock audio
    const t = c.currentTime + 0.05;
    if (mel[i % mel.length]) tone(NOTE(mel[i % mel.length]), t, beat * 0.9, 'square', 0.12, musicGain);
    if (i % 2 === 0) tone(NOTE(bass[(i / 2) % bass.length]), t, beat * 1.8, 'triangle', 0.2, musicGain);
    i++;
    timer = setTimeout(step, beat * 1000);
  };
  step();
}

const SFX = {
  tap: () => { const t = ctx.currentTime; tone(880, t, 0.06, 'square', 0.12); },
  ok: () => { const t = ctx.currentTime; [72, 76, 79, 84].forEach((n, k) => tone(NOTE(n), t + k * 0.08, 0.15, 'square', 0.15)); },
  no: () => { const t = ctx.currentTime; tone(220, t, 0.15, 'sawtooth', 0.12); tone(196, t + 0.12, 0.2, 'sawtooth', 0.1); },
  item: () => { const t = ctx.currentTime; [79, 84, 88].forEach((n, k) => tone(NOTE(n), t + k * 0.06, 0.12, 'triangle', 0.2)); },
  star: () => { const t = ctx.currentTime; [72, 76, 79, 84, 88, 91].forEach((n, k) => tone(NOTE(n), t + k * 0.09, 0.25, 'square', 0.13)); },
  freeze: () => { const t = ctx.currentTime; for (let k = 0; k < 6; k++) tone(1400 + k * 260, t + k * 0.04, 0.12, 'sine', 0.12); },
};

G.AUDIO = {
  get on() { return on; },
  setOn(v) { on = v; if (!v) this.stop(); else if (wanted) this.music(wanted); },
  unlock() { const c = ac(); if (c && c.state === 'suspended') c.resume(); },
  music(name) {
    wanted = name;
    if (current === name) return;
    this.stop(); current = name;
    if (on && ac()) playLoop(name);
  },
  stop() { clearTimeout(timer); timer = null; current = null; },
  sfx(name) { if (!on || !ac() || !SFX[name]) return; try { SFX[name](); } catch (e) { /* audio is optional */ } },
};
})(typeof window !== 'undefined' ? window : globalThis);
