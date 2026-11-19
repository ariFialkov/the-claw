// Monte-Carlo check of the outcome engine: `npm run simulate -- 0.95 5000000`
import { createEngine } from '../src/engine.js';

const rtp = parseFloat(process.argv[2] ?? '0.95');
const rounds = parseInt(process.argv[3] ?? '5000000', 10);
const engine = createEngine({ rtp, rng: Math.random });
const stake = 100;
let paid = 0;
let hits = 0;
const counts = {};
for (let i = 0; i < rounds; i++) {
  const r = engine.playRound(stake);
  paid += r.win;
  if (r.itemId) { hits++; counts[r.itemId] = (counts[r.itemId] ?? 0) + 1; }
}
console.log(`target RTP   ${(rtp * 100).toFixed(2)}%`);
console.log(`theoretical  ${(engine.table.rtp * 100).toFixed(2)}%  hit rate ${(engine.table.hitRate * 100).toFixed(2)}%`);
console.log(`simulated    ${((paid / (rounds * stake)) * 100).toFixed(2)}%  hit rate ${((hits / rounds) * 100).toFixed(2)}%  (${rounds} rounds)`);
for (const row of engine.table.rows) {
  const n = counts[row.id] ?? 0;
  console.log(`  ${row.name.padEnd(15)} x${String(row.mult).padEnd(4)} p=${(row.p * 100).toFixed(3).padStart(7)}%  1 in ${(1 / row.p).toFixed(0).padStart(5)}  seen ${n}`);
}
