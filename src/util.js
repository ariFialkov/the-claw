// Tiny promise-based tween runner driven by the main loop.
const tweens = new Set();

export const ease = {
  linear: (k) => k,
  inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  out: (k) => 1 - Math.pow(1 - k, 3),
  in: (k) => k * k * k,
  outBack: (k) => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2),
  bounce: (k) => {
    const n = 7.5625, d = 2.75;
    if (k < 1 / d) return n * k * k;
    if (k < 2 / d) return n * (k -= 1.5 / d) * k + 0.75;
    if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + 0.9375;
    return n * (k -= 2.625 / d) * k + 0.984375;
  },
};

export function tween(dur, fn, easing = ease.inOut) {
  return new Promise((res) => tweens.add({ t: 0, dur, fn, easing, res }));
}
export const wait = (s) => tween(s, () => {});

export function updateTweens(dt) {
  for (const tw of [...tweens]) {
    tw.t += dt;
    const k = tw.dur <= 0 ? 1 : Math.min(1, tw.t / tw.dur);
    tw.fn(tw.easing(k), k);
    if (k >= 1) { tweens.delete(tw); tw.res(); }
  }
}

export const lerp = (a, b, k) => a + (b - a) * k;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const money = (cents) => '$' + (cents / 100).toFixed(2);
