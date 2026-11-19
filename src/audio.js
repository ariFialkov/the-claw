// All sound is synthesised with WebAudio — no audio files.
let ctx = null;
let master = null;
let muted = false;
let motor = null;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return true;
}

function tone(freq, dur, { type = 'sine', vol = 0.3, at = 0, to = null, attack = 0.005 } = {}) {
  if (!ensure()) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur, { vol = 0.2, at = 0, freq = 1200, q = 1, type = 'bandpass' } = {}) {
  if (!ensure()) return;
  const t = ctx.currentTime + at;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

const N = (semi) => 261.63 * Math.pow(2, semi / 12); // semitones above middle C

export const audio = {
  unlock: ensure,
  get muted() { return muted; },
  setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; },

  bet() {
    tone(N(12), 0.09, { type: 'square', vol: 0.12 });
    tone(N(19), 0.16, { type: 'square', vol: 0.12, at: 0.07 });
    noise(0.08, { vol: 0.12, freq: 5000 });
  },
  click() { tone(900, 0.04, { type: 'square', vol: 0.08 }); },
  pop(i = 0) { tone(320 + i * 22, 0.09, { type: 'sine', vol: 0.16, to: 640 + i * 30 }); },
  whoosh() { noise(0.35, { vol: 0.14, freq: 700, q: 0.6 }); },
  tick(urgent) { tone(urgent ? 1320 : 880, 0.05, { type: 'square', vol: urgent ? 0.14 : 0.07 }); },
  go() { tone(N(12), 0.1, { type: 'triangle', vol: 0.25 }); tone(N(24), 0.25, { type: 'triangle', vol: 0.25, at: 0.1 }); },

  motor(on) {
    if (!ensure()) return;
    if (on && !motor) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 92;
      const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 138.5;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
      const g = ctx.createGain(); g.gain.value = 0;
      g.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.06);
      o.connect(f); o2.connect(f); f.connect(g).connect(master);
      o.start(); o2.start();
      motor = { o, o2, g };
    } else if (!on && motor) {
      const m = motor; motor = null;
      m.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
      m.o.stop(ctx.currentTime + 0.12); m.o2.stop(ctx.currentTime + 0.12);
    }
  },
  drop() { tone(520, 1.1, { type: 'sawtooth', vol: 0.07, to: 130 }); tone(780, 1.1, { type: 'sine', vol: 0.08, to: 190 }); },
  lift() { tone(140, 1.0, { type: 'sawtooth', vol: 0.06, to: 420 }); },
  grab() { noise(0.09, { vol: 0.3, freq: 1800, q: 2 }); tone(180, 0.12, { type: 'square', vol: 0.16, to: 90 }); },
  slip() {
    tone(620, 0.5, { type: 'triangle', vol: 0.22, to: 150 });
    noise(0.12, { vol: 0.15, freq: 500, at: 0.42 });
  },
  thud() { tone(120, 0.14, { type: 'sine', vol: 0.3, to: 55 }); noise(0.07, { vol: 0.12, freq: 400 }); },
  lose() { tone(N(7), 0.18, { type: 'triangle', vol: 0.18 }); tone(N(3), 0.2, { type: 'triangle', vol: 0.18, at: 0.17 }); tone(N(0), 0.4, { type: 'triangle', vol: 0.18, at: 0.36 }); },
  chute() { tone(900, 0.4, { type: 'sine', vol: 0.16, to: 240 }); noise(0.1, { vol: 0.2, freq: 300, at: 0.38 }); },
  coin(i = 0) { tone(1568 + (i % 4) * 120, 0.07, { type: 'square', vol: 0.07 }); tone(2093 + (i % 4) * 120, 0.12, { type: 'square', vol: 0.06, at: 0.04 }); },
  sparkle() { for (let i = 0; i < 5; i++) tone(1800 + Math.random() * 2200, 0.12, { vol: 0.06, at: i * 0.05 }); },

  /** level 0..4 = common..legendary */
  win(level) {
    const seqs = [
      [0, 4, 7],
      [0, 4, 7, 12],
      [0, 4, 7, 12, 16, 19],
      [0, 7, 12, 16, 19, 24, 28],
      [0, 4, 7, 12, 16, 19, 24, 28, 31, 36],
    ];
    const seq = seqs[level];
    const step = level >= 3 ? 0.085 : 0.1;
    seq.forEach((s, i) => {
      tone(N(s), 0.28, { type: 'triangle', vol: 0.22, at: i * step });
      if (level >= 2) tone(N(s + 12), 0.2, { type: 'square', vol: 0.05, at: i * step });
    });
    const end = seq.length * step;
    if (level >= 2) [0, 4, 7].forEach((s) => tone(N(s + 12), 0.7, { type: 'triangle', vol: 0.14, at: end }));
    if (level >= 3) {
      noise(0.6, { vol: 0.12, freq: 6000, q: 0.5, at: end, type: 'highpass' });
      [0, 4, 7, 12].forEach((s) => tone(N(s + 24), 0.9, { type: 'sine', vol: 0.1, at: end + 0.05 }));
    }
    if (level >= 4) {
      for (let r = 0; r < 3; r++) {
        [0, 4, 7, 12, 7, 4].forEach((s, i) => tone(N(s + 12 + r * 2), 0.16, { type: 'square', vol: 0.09, at: end + 0.5 + r * 0.6 + i * 0.1 }));
      }
      tone(70, 0.9, { type: 'sine', vol: 0.4, to: 35 });
    }
  },
};
