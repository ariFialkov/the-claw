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

// mult   = payout as a multiple of the stake
// weight = relative frequency among winning rounds (shape of the paytable).
//          The overall hit rate is derived from the target RTP.
export const ITEMS = [
  { id: 'mints',      name: 'Mints',          mult: 0.2, weight: 14,   rarity: 'common' },
  { id: 'chips',      name: 'Bag of Chips',   mult: 0.5, weight: 18,   rarity: 'common' },
  { id: 'chocolate',  name: 'Chocolate Bar',  mult: 0.8, weight: 16,   rarity: 'common' },
  { id: 'soda',       name: 'Soda',           mult: 1,   weight: 14,   rarity: 'uncommon' },
  { id: 'gummies',    name: 'Gummy Worms',    mult: 1.5, weight: 12,   rarity: 'uncommon' },
  { id: 'cards',      name: 'Hockey Cards',   mult: 2,   weight: 9,    rarity: 'uncommon' },
  { id: 'mask',       name: 'Sleep Mask',     mult: 3,   weight: 6,    rarity: 'rare' },
  { id: 'hat',        name: 'Flat Hat',       mult: 5,   weight: 4,    rarity: 'rare' },
  { id: 'pillow',     name: 'Neck Pillow',    mult: 8,   weight: 2.5,  rarity: 'epic' },
  { id: 'headphones', name: 'Headphones',     mult: 15,  weight: 1.2,  rarity: 'epic' },
  { id: 'phone',      name: 'Smartphone',     mult: 40,  weight: 0.4,  rarity: 'legendary' },
  { id: 'keys',       name: 'Sportscar Keys', mult: 150, weight: 0.08, rarity: 'legendary' },
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
