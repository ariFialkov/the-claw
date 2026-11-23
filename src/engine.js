// ---------------------------------------------------------------------------
// THE CLAW — outcome engine ("backend").
//
// This module is pure: no DOM, no three.js, no knowledge of where the player
// put the claw. A round's result is fully decided by one RNG draw at the moment
// the stake is placed. The client only *presents* that result.
//
// For real-money operation this file should run server-side behind an API and
// the client should receive only the `playRound` result.
// ---------------------------------------------------------------------------

export const RARITIES = {
  common:    { label: 'Common',    color: '#cfd8e6' },
  uncommon:  { label: 'Uncommon',  color: '#4ade80' },
  rare:      { label: 'Rare',      color: '#38bdf8' },
  epic:      { label: 'Epic',      color: '#c084fc' },
  legendary: { label: 'Legendary', color: '#ffc531' },
};

// mult   = prize value as a multiple of the stake, to two decimals (so at a $1 bet the
//          Plush Dino is worth $5.75). Stakes are whole dollars, so every payout is an
//          exact number of cents and no rounding touches the RTP.
// weight = relative frequency among winning rounds (shape of the paytable).
//          The overall hit rate is derived from the target RTP.
export const ITEMS = [
  { id: 'ball', name: 'Bouncy Ball', mult: 0.15, weight: 10, rarity: 'common' },
  { id: 'bracelet', name: 'Jelly Bracelet', mult: 0.25, weight: 10, rarity: 'common' },
  { id: 'duck', name: 'Rubber Duck', mult: 0.35, weight: 10, rarity: 'common' },
  { id: 'keychain', name: 'Toy Keychain', mult: 0.45, weight: 10, rarity: 'common' },
  { id: 'capsule', name: 'Capsule Toy', mult: 0.6, weight: 9, rarity: 'common' },
  { id: 'soccer', name: 'Mini Soccer Ball', mult: 0.7, weight: 8.5, rarity: 'common' },
  { id: 'yoyo', name: 'Yo-Yo', mult: 0.85, weight: 8, rarity: 'common' },
  { id: 'spinner', name: 'Fidget Spinner', mult: 1.1, weight: 7.5, rarity: 'uncommon' },
  { id: 'dice', name: 'Lucky Dice', mult: 1.25, weight: 7, rarity: 'uncommon' },
  { id: 'car', name: 'Toy Car', mult: 1.4, weight: 6.5, rarity: 'uncommon' },
  { id: 'cube', name: 'Puzzle Cube', mult: 1.65, weight: 6, rarity: 'uncommon' },
  { id: 'chick', name: 'Plush Chick', mult: 1.8, weight: 5.5, rarity: 'uncommon' },
  { id: 'rocket', name: 'Toy Rocket', mult: 1.99, weight: 5, rarity: 'uncommon' },
  { id: 'penguin', name: 'Plush Penguin', mult: 2.2, weight: 4.6, rarity: 'uncommon' },
  { id: 'frog', name: 'Plush Frog', mult: 2.45, weight: 4.2, rarity: 'uncommon' },
  { id: 'teddy', name: 'Teddy Bear', mult: 2.75, weight: 3.8, rarity: 'uncommon' },
  { id: 'bunny', name: 'Plush Bunny', mult: 3.2, weight: 3.3, rarity: 'rare' },
  { id: 'pig', name: 'Plush Pig', mult: 3.6, weight: 3, rarity: 'rare' },
  { id: 'cat', name: 'Plush Cat', mult: 3.99, weight: 2.7, rarity: 'rare' },
  { id: 'octopus', name: 'Plush Octopus', mult: 4.5, weight: 2.4, rarity: 'rare' },
  { id: 'fox', name: 'Plush Fox', mult: 5.25, weight: 2.1, rarity: 'rare' },
  { id: 'dino', name: 'Plush Dino', mult: 5.75, weight: 1.9, rarity: 'rare' },
  { id: 'robot', name: 'Toy Robot', mult: 6.99, weight: 1.6, rarity: 'rare' },
  { id: 'sunglasses', name: 'Sunglasses', mult: 7.5, weight: 1.4, rarity: 'rare' },
  { id: 'skateboard', name: 'Skateboard', mult: 8.4, weight: 1.25, rarity: 'rare' },
  { id: 'cap', name: 'Snapback Cap', mult: 8.88, weight: 1.15, rarity: 'rare' },
  { id: 'sneakers', name: 'Sneakers', mult: 10.5, weight: 0.95, rarity: 'epic' },
  { id: 'unicorn', name: 'Unicorn Plush', mult: 11.75, weight: 0.85, rarity: 'epic' },
  { id: 'panda', name: 'Giant Panda Plush', mult: 13.6, weight: 0.72, rarity: 'epic' },
  { id: 'headphones', name: 'Headphones', mult: 15.99, weight: 0.6, rarity: 'epic' },
  { id: 'handbag', name: 'Designer Handbag', mult: 18.5, weight: 0.5, rarity: 'epic' },
  { id: 'controller', name: 'Game Controller', mult: 21, weight: 0.42, rarity: 'epic' },
  { id: 'camera', name: 'Instant Camera', mult: 24.99, weight: 0.35, rarity: 'epic' },
  { id: 'vr', name: 'VR Headset', mult: 27.5, weight: 0.3, rarity: 'epic' },
  { id: 'watch', name: 'Smartwatch', mult: 32, weight: 0.25, rarity: 'epic' },
  { id: 'console', name: 'Handheld Console', mult: 36.5, weight: 0.21, rarity: 'epic' },
  { id: 'phone', name: 'Smartphone', mult: 45, weight: 0.16, rarity: 'legendary' },
  { id: 'chain', name: 'Gold Chain', mult: 59.99, weight: 0.11, rarity: 'legendary' },
  { id: 'goldbar', name: 'Gold Bar', mult: 77.77, weight: 0.08, rarity: 'legendary' },
  { id: 'trophy', name: 'Gold Trophy', mult: 99, weight: 0.06, rarity: 'legendary' },
  { id: 'crown', name: 'Jewelled Crown', mult: 125, weight: 0.045, rarity: 'legendary' },
  { id: 'ring', name: 'Diamond Ring', mult: 175, weight: 0.03, rarity: 'legendary' },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export const DEFAULT_RTP = 0.95;
export const MIN_RTP = 0.5;
export const MAX_RTP = 0.99;

function cryptoRng() {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] / 4294967296;
}

/** Build the probability table for a target RTP. */
export function buildTable(rtp) {
  const totalW = ITEMS.reduce((s, i) => s + i.weight, 0);
  const evPerWin = ITEMS.reduce((s, i) => s + i.weight * i.mult, 0) / totalW;
  const hitRate = Math.min(1, rtp / evPerWin);
  const rows = ITEMS.map((i) => ({ ...i, p: (hitRate * i.weight) / totalW }));
  return { rtp: rows.reduce((s, r) => s + r.p * r.mult, 0), hitRate, rows };
}

export function createEngine({ rtp = DEFAULT_RTP, rng = cryptoRng } = {}) {
  let table = buildTable(rtp);
  let round = 0;
  return {
    get rtp() { return table.rtp; },
    get table() { return table; },
    setRtp(v) {
      table = buildTable(Math.min(MAX_RTP, Math.max(MIN_RTP, v)));
    },
    /**
     * Resolve one round. `stake` is in integer cents.
     * Returns { roundId, stake, itemId | null, mult, win }.
     */
    playRound(stake) {
      const r = rng();
      let acc = 0;
      let hit = null;
      for (const row of table.rows) {
        acc += row.p;
        if (r < acc) { hit = row; break; }
      }
      return {
        roundId: ++round,
        stake,
        itemId: hit ? hit.id : null,
        mult: hit ? hit.mult : 0,
        win: hit ? Math.round(stake * hit.mult) : 0,
      };
    },
  };
}
