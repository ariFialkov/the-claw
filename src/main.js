import '@fontsource-variable/fredoka';
import './style.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createEngine, ITEMS, ITEM_BY_ID, RARITIES, DEFAULT_RTP } from './engine.js';
import { createItem } from './items.js';
import { createMachine, BIN, CHUTE, CLAW_HOME, CLAW_RANGE, CLAW_IDLE_Y, PIT_Y } from './machine.js';
import { createVfx } from './vfx.js';
import { audio } from './audio.js';
import { tween, wait, updateTweens, ease, lerp, clamp, rand, pick, money } from './util.js';

const $ = (id) => document.getElementById(id);
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const BETS = [50, 100, 200, 500, 1000];
const ROUND_SECONDS = 10;
const START_CREDITS = 10000;
const CLAW_SPEED = 1.9;

// ---- persisted state ---------------------------------------------------------
const store = {
  get(k, d) { try { const v = localStorage.getItem('claw.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('claw.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const urlRtp = parseFloat(new URLSearchParams(location.search).get('rtp'));
const engine = createEngine({ rtp: Number.isFinite(urlRtp) ? urlRtp : store.get('rtp', DEFAULT_RTP) });
let balance = store.get('balance', START_CREDITS);
let betIndex = clamp(store.get('bet', 1), 0, BETS.length - 1);
audio.setMuted(store.get('muted', false));

let state = 'boot'; // boot | menu | shuffle | play | resolve
let outcome = null;
let timeLeft = 0;
let lastWholeSecond = 0;
let pile = [];

// ---- three.js setup ------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
scene.add(camera);

{
  const c = document.createElement('canvas');
  c.width = 16; c.height = 512;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#3a22c9'); g.addColorStop(0.45, '#7a45f0'); g.addColorStop(0.8, '#ff6fb5'); g.addColorStop(1, '#ffb36b');
  x.fillStyle = g; x.fillRect(0, 0, 16, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  scene.background = t;
}
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

scene.add(new THREE.HemisphereLight('#ffffff', '#9a7bff', 0.8));
const sun = new THREE.DirectionalLight('#fff4e0', 1.9);
sun.position.set(4.5, 11, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 8, bottom: -5, near: 1, far: 30 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun);
const binLight = new THREE.PointLight('#fff1d0', 3.5, 9, 1.6);
binLight.position.set(0, 3.6, 0.4);
scene.add(binLight);

// ground: a soft pool of light that fades into the backdrop + a shadow catcher
{
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,190,240,.75)'); g.addColorStop(0.45, 'rgba(190,140,255,.35)'); g.addColorStop(1, 'rgba(150,110,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = -2.81;
  scene.add(pool);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), new THREE.ShadowMaterial({ color: '#2a1a5e', opacity: 0.28 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.8;
  ground.receiveShadow = true;
  scene.add(ground);
}

try { await document.fonts.load('700 40px "Fredoka Variable"'); } catch { /* fall back to system font */ }
const machine = createMachine(scene);
const claw = machine.claw;
const vfx = createVfx(scene, $('fx'));

// background bokeh
const bokeh = [];
for (let i = 0; i < 16; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: vfx.texDot, color: pick(['#ffd23f', '#ff8fd0', '#7df9ff', '#ffffff']), transparent: true, opacity: rand(0.1, 0.28), depthWrite: false }));
  s.position.set(rand(-16, 16), rand(-1, 13), rand(-16, -7));
  s.scale.setScalar(rand(1.5, 4.5));
  s.userData = { y: s.position.y, ph: rand(0, 6.28), sp: rand(0.2, 0.5) };
  scene.add(s);
  bokeh.push(s);
}

// showcase rig (prize presented in front of the camera)
const show = new THREE.Group();
show.visible = false;
camera.add(show);
const showRays = new THREE.Sprite(new THREE.SpriteMaterial({ map: vfx.texRays, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
const showGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: vfx.texDot, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
showRays.position.z = showGlow.position.z = -1.0;
const showSpin = new THREE.Group();
const showLight = new THREE.PointLight('#ffffff', 0, 6, 1.2);
showLight.position.set(0.6, 0.8, 1.2);
show.add(showRays, showGlow, showSpin, showLight);
// dimmer that sits between the machine and the showcased prize
const dimmer = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: '#160a44', transparent: true, opacity: 0, depthWrite: false }));
dimmer.position.z = -4.2;
dimmer.visible = false;
camera.add(dimmer);
let dimWant = 0;
const setDim = (v) => { dimWant = v; };

// ---- camera framing ------------------------------------------------------------
const view = { mode: 'menu', pos: new THREE.Vector3(0, 3, 16), target: new THREE.Vector3(0, 1.5, 0), shake: 0 };
const wantPos = new THREE.Vector3();
const wantTarget = new THREE.Vector3();
let portrait = false;
function frame(mode) {
  const aspect = camera.aspect;
  portrait = aspect < 0.8;
  const box = mode === 'menu'
    ? { w: 6.2, y0: -2.9, y1: 6.1, pitch: 0.2 }
    : { w: 5.3, y0: -0.5, y1: 4.5, pitch: 0.36 };
  const h = box.y1 - box.y0;
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  let d = Math.max(h / (2 * tanV), box.w / (2 * tanV * aspect)) + 2.4;
  const visH = 2 * (d - 2.4) * tanV;
  // leave room for bottom UI: shift the machine up on screen
  const spare = Math.max(0, visH - h);
  const shift = mode === 'menu' ? Math.min(spare * 0.5, visH * 0.07) : Math.min(spare * 0.5, visH * (portrait ? 0.16 : 0.05));
  wantTarget.set(0, (box.y0 + box.y1) / 2 - shift, 0);
  wantPos.set(0, wantTarget.y + Math.sin(box.pitch) * d, Math.cos(box.pitch) * d);
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  vfx.resize();
}
window.addEventListener('resize', resize);
resize();

// ---- pile ----------------------------------------------------------------------
const CELLS = [];
{
  const cols = 6, rows = 5;
  const cw = (BIN.x1 - BIN.x0 - 0.3) / cols, ch = (BIN.z1 - BIN.z0 - 0.3) / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = BIN.x0 + 0.15 + cw * (i + 0.5), z = BIN.z0 + 0.15 + ch * (j + 0.5);
    if (x < CHUTE.x1 + 0.25 && z > CHUTE.z0 - 0.25) continue;
    CELLS.push({ x, z });
  }
}
function weighted(list, w) {
  let r = Math.random() * list.reduce((s, i) => s + w(i), 0);
  for (const i of list) { r -= w(i); if (r <= 0) return i; }
  return list[list.length - 1];
}
/**
 * Lay out a fresh pile for a resolved round. One "featured" prize is spread
 * evenly across the bin so it is always within reach of the claw: on winning
 * rounds that is the prize the engine awarded, on losing rounds it is drawn
 * from the same distribution so both kinds of round look alike.
 */
function planPile(outcomeId) {
  const featured = outcomeId ?? weighted(ITEMS, (i) => i.weight).id;
  const free = CELLS.map((c) => ({ ...c }));
  const plan = [];
  const take = (idx, id) => { const [c] = free.splice(idx, 1); plan.push({ id, x: c.x + rand(-0.07, 0.07), z: c.z + rand(-0.06, 0.06) }); return c; };
  const spread = [take(Math.floor(Math.random() * free.length), featured)];
  while (spread.length < 4) {
    const scored = free.map((c, i) => ({ i, d: Math.min(...spread.map((s) => Math.hypot(s.x - c.x, s.z - c.z))) })).sort((a, b) => b.d - a.d);
    spread.push(take(scored[Math.floor(Math.random() * 2)].i, featured));
  }
  for (const id of ['keys', 'phone', 'headphones', 'pillow', 'hat', 'mask']) {
    if (id !== featured) take(Math.floor(Math.random() * free.length), id);
  }
  while (free.length) take(0, weighted(ITEMS, (i) => Math.sqrt(i.weight)).id);
  return plan;
}

async function shufflePile(outcomeId) {
  const old = pile;
  pile = [];
  if (old.length) {
    audio.whoosh();
    old.sort((a, b) => a.x - b.x);
    old.forEach((it, i) => {
      wait(i * 0.016).then(() => tween(0.3, (k) => {
        it.obj.scale.setScalar(Math.max(0.001, 1 - k));
        it.obj.position.y = PIT_Y + k * 0.9;
        it.obj.rotation.y += 0.25;
      }, ease.in)).then(() => machine.group.remove(it.obj));
    });
    await wait(0.5);
  }
  const plan = planPile(outcomeId).sort((a, b) => (a.x + a.z * 0.6) - (b.x + b.z * 0.6));
  const jobs = plan.map((p, i) => {
    const obj = createItem(p.id);
    const yaw = rand(0, Math.PI * 2);
    obj.position.set(p.x, 3.3, p.z);
    obj.scale.setScalar(0.001);
    obj.traverse((m) => { if (m.isMesh) m.receiveShadow = true; });
    machine.group.add(obj);
    const it = { ...p, obj, yaw, tiltX: rand(-0.12, 0.12), tiltZ: rand(-0.12, 0.12), rarity: ITEM_BY_ID[p.id].rarity };
    pile.push(it);
    return wait(i * 0.05).then(() => {
      audio.pop(i);
      return tween(0.75, (k, raw) => {
        obj.scale.setScalar(Math.min(1, raw * 4));
        obj.position.y = lerp(3.3, PIT_Y, k);
        obj.rotation.set(it.tiltX * raw, yaw + (1 - ease.out(raw)) * 7, it.tiltZ * raw);
      }, ease.bounce);
    }).then(() => vfx.emit({ x: p.x, y: PIT_Y + 0.1, z: p.z }, { count: 2, color: RARITIES[it.rarity].color, speed: 0.8, size: 0.1, life: 0.4 }));
  });
  await Promise.all(jobs);
}

// ---- HUD -----------------------------------------------------------------------
const touch = matchMedia('(hover: none)').matches;
$('prompt-text').textContent = `${touch ? 'Tap' : 'Click'} anywhere to place bet and play`;
function setHud() {
  $('balance-val').textContent = money(balance);
  $('bet-val').textContent = money(BETS[betIndex]);
  $('btn-sound').textContent = audio.muted ? '🔇' : '🔊';
}
function bumpBalance() {
  const el = $('balance');
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}
const showEl = (id, on) => $(id).classList.toggle('hidden', !on);
let toastTimer = 0;
function toast(text, ms = 1300) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}
function enterMenu() {
  state = 'menu';
  view.mode = 'menu';
  machine.setLights('idle');
  showEl('prompt', true); showEl('bet', true); showEl('controls', false); showEl('timer', false);
  setHud();
}

$('bet-down').onclick = () => { betIndex = Math.max(0, betIndex - 1); store.set('bet', betIndex); audio.click(); setHud(); };
$('bet-up').onclick = () => { betIndex = Math.min(BETS.length - 1, betIndex + 1); store.set('bet', betIndex); audio.click(); setHud(); };
$('btn-sound').onclick = () => { audio.setMuted(!audio.muted); store.set('muted', audio.muted); audio.click(); setHud(); };

const operator = new URLSearchParams(location.search).has('operator');
$('operator').style.display = operator ? '' : 'none';
function renderPaytable() {
  const t = engine.table;
  $('paytable').innerHTML = [...t.rows].reverse().map((r) =>
    `<span class="dot" style="background:${RARITIES[r.rarity].color}"></span><span>${r.name}</span><span class="m">×${r.mult}</span><span class="o">1 in ${Math.round(1 / r.p).toLocaleString()}</span>`).join('');
  $('disclosure').textContent = `Each round's result is drawn by a random number generator the moment the bet is placed; ` +
    `claw position and timing do not change it. Theoretical return to player: ${(t.rtp * 100).toFixed(1)}%. ` +
    `Chance of a prize per round: ${(t.hitRate * 100).toFixed(1)}%. Demo credits only — no real-money value.`;
  $('rtp').value = (t.rtp * 100).toFixed(1);
  $('rtp-val').textContent = (t.rtp * 100).toFixed(1) + '%';
}
$('btn-info').onclick = () => { renderPaytable(); showEl('modal', true); audio.click(); };
$('modal-close').onclick = () => showEl('modal', false);
$('modal').addEventListener('pointerdown', (e) => { if (e.target === $('modal')) showEl('modal', false); });
$('rtp').oninput = (e) => { engine.setRtp(e.target.value / 100); store.set('rtp', engine.rtp); renderPaytable(); };
$('reset-credits').onclick = () => { balance = START_CREDITS; store.set('balance', balance); setHud(); bumpBalance(); };

// ---- input ---------------------------------------------------------------------
const input = machine.input;
const keys = new Set();
const stickVec = { x: 0, y: 0 };
{
  const el = $('stick'), knob = $('stick-knob');
  let id = null;
  const move = (e) => {
    const r = el.getBoundingClientRect();
    const max = r.width * 0.36;
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const m = Math.hypot(dx, dy);
    if (m > max) { dx *= max / m; dy *= max / m; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    stickVec.x = dx / max; stickVec.y = dy / max;
  };
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null; stickVec.x = stickVec.y = 0;
    knob.style.transition = 'transform .15s'; knob.style.transform = '';
  };
  el.addEventListener('pointerdown', (e) => { id = e.pointerId; el.setPointerCapture(id); knob.style.transition = 'none'; move(e); e.preventDefault(); });
  el.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}
$('grab').addEventListener('pointerdown', (e) => { e.preventDefault(); if (state === 'play') resolveDrop(); });
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    if (!$('modal').classList.contains('hidden')) return;
    if (state === 'play') resolveDrop(); else if (state === 'menu') startRound();
  }
  if (e.code === 'Escape') showEl('modal', false);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
let downOnUi = false;
window.addEventListener('pointerdown', (e) => { downOnUi = !!e.target.closest('[data-ui]'); }, true);
window.addEventListener('pointerup', (e) => {
  audio.unlock();
  if (state !== 'menu') return;
  if (downOnUi || e.target.closest('[data-ui]')) return;
  startRound();
});
document.addEventListener('contextmenu', (e) => e.preventDefault());

// ---- round flow ----------------------------------------------------------------
async function startRound() {
  if (state !== 'menu') return;
  const stake = BETS[betIndex];
  if (balance < stake) {
    balance = START_CREDITS; store.set('balance', balance);
    setHud(); bumpBalance(); toast('Credits refilled!');
    return;
  }
  state = 'shuffle';
  balance -= stake; store.set('balance', balance);
  outcome = engine.playRound(stake); // the round is decided here, before any input
  setHud(); bumpBalance();
  audio.bet();
  showEl('prompt', false); showEl('bet', false); showEl('win', false);
  view.mode = 'play';
  machine.setLights('shuffle');
  await shufflePile(outcome.itemId);
  timeLeft = ROUND_SECONDS; lastWholeSecond = ROUND_SECONDS;
  updateTimer();
  showEl('controls', true); showEl('timer', true);
  machine.setLights('play');
  audio.go();
  toast('GO!', 600);
  state = 'play';
}

function updateTimer() {
  const ring = $('timer').firstElementChild;
  ring.style.setProperty('--p', `${(timeLeft / ROUND_SECONDS) * 100}%`);
  ring.classList.toggle('urgent', timeLeft <= 3);
  $('timer-val').textContent = Math.max(0, Math.ceil(timeLeft));
}

function dropToPit(it, x, z) {
  const obj = it.obj;
  machine.group.attach(obj);
  const from = obj.position.clone();
  const rx = obj.rotation.x, rz = obj.rotation.z;
  it.x = x; it.z = z;
  return tween(0.55, (k, raw) => {
    obj.position.set(lerp(from.x, x, raw), lerp(from.y, PIT_Y, k), lerp(from.z, z, raw));
    obj.rotation.x = lerp(rx, it.tiltX, raw); obj.rotation.z = lerp(rz, it.tiltZ, raw);
    obj.rotation.y += 0.05 * (1 - raw);
  }, ease.bounce);
}

async function resolveDrop() {
  if (state !== 'play') return;
  state = 'resolve';
  input.pressed = true;
  $('grab').classList.add('down');
  audio.motor(false);
  showEl('controls', false); showEl('timer', false);
  const win = outcome.itemId !== null;
  const dist = (it) => Math.hypot(it.x - claw.x, it.z - claw.z);

  // Presentation only: pick which model the claw goes for. The payout is already fixed.
  let target = null;
  if (win) target = pile.filter((it) => it.id === outcome.itemId).sort((a, b) => dist(a) - dist(b))[0];
  else {
    const near = [...pile].sort((a, b) => dist(a) - dist(b))[0];
    if (near && dist(near) < 0.85) target = near;
  }
  const tx = target ? target.x : claw.x, tz = target ? target.z : claw.z;
  const grabY = PIT_Y + (target ? target.obj.userData.height * 0.5 : 0) + 0.66;

  audio.drop();
  const sx = claw.x, sz = claw.z;
  await tween(1.15, (k, raw) => {
    claw.y = lerp(CLAW_IDLE_Y, grabY, ease.inOut(raw));
    const s = ease.inOut(Math.min(1, raw * 1.25));
    claw.x = lerp(sx, tx, s); claw.z = lerp(sz, tz, s);
  }, ease.linear);
  input.pressed = false;
  $('grab').classList.remove('down');
  audio.grab();
  await tween(0.28, (k) => { claw.open = lerp(1, target ? 0.42 : 0, k); }, ease.out);

  if (!target) {
    await wait(0.15);
    audio.lift();
    await tween(0.9, (k) => { claw.y = lerp(grabY, CLAW_IDLE_Y, k); });
    return finishLoss('Missed!');
  }

  // pick the prize up
  const obj = target.obj;
  claw.holder.attach(obj);
  const h = obj.userData.height;
  obj.position.set(0, 0.1 - h / 2, 0);
  const rarity = RARITIES[target.rarity];
  const level = RARITY_ORDER.indexOf(target.rarity);
  vfx.setGlow(obj, rarity.color, level);
  vfx.emit(claw.holder.getWorldPosition(new THREE.Vector3()), { count: 6 + level * 5, color: [rarity.color, '#ffffff'], speed: 1.4 + level * 0.3, star: level >= 2, size: 0.16 });
  if (level >= 2) audio.sparkle();
  await wait(0.12);
  audio.lift();

  if (win) {
    await tween(1.0, (k) => { claw.y = lerp(grabY, CLAW_IDLE_Y, k); });
    const fx = claw.x, fz = claw.z;
    const cx = (CHUTE.x0 + CHUTE.x1) / 2 + 0.05, cz = (CHUTE.z0 + CHUTE.z1) / 2;
    audio.motor(true);
    await tween(0.55 + Math.hypot(cx - fx, cz - fz) * 0.32, (k) => { claw.x = lerp(fx, cx, k); claw.z = lerp(fz, cz, k); });
    audio.motor(false);
    await wait(0.25);
    await tween(0.18, (k) => { claw.open = lerp(0.42, 1, k); }, ease.out);
    machine.group.attach(obj);
    const y0 = obj.position.y;
    audio.chute();
    await tween(0.42, (k) => {
      obj.position.y = lerp(y0, -0.5, k);
      obj.rotation.x += 0.12;
      obj.scale.setScalar(lerp(1, 0.7, k));
    }, ease.in);
    vfx.setGlow(null);
    machine.group.remove(obj);
    pile.splice(pile.indexOf(target), 1);
    await presentWin(target.id, level);
    await tween(0.4, (k) => { claw.x = lerp(cx, CLAW_HOME.x, k); claw.z = lerp(cz, CLAW_HOME.z, k); });
    enterMenu();
    return;
  }

  // losing round: the prize slips
  const variant = Math.random();
  claw.jitter = 0.012;
  if (variant < 0.2) {
    await tween(0.3, (k) => { claw.y = lerp(grabY, grabY + 0.25, k); });
    await slip(target, target.x, target.z);
    await tween(0.8, (k) => { claw.y = lerp(grabY + 0.25, CLAW_IDLE_Y, k); });
    return finishLoss(pick(['Slipped!', 'No grip!']));
  }
  if (variant < 0.7) {
    const top = lerp(grabY, CLAW_IDLE_Y, rand(0.4, 0.95));
    await tween(0.95 * ((top - grabY) / (CLAW_IDLE_Y - grabY)), (k) => { claw.y = lerp(grabY, top, k); }, ease.out);
    claw.jitter = 0.03;
    await wait(0.22);
    await slip(target, target.x + rand(-0.1, 0.1), target.z + rand(-0.1, 0.1));
    await tween(0.45, (k) => { claw.y = lerp(top, CLAW_IDLE_Y, k); });
    return finishLoss(pick(['So close!', 'Slipped!', 'Ooh!']));
  }
  // near miss on the way to the chute
  await tween(1.0, (k) => { claw.y = lerp(grabY, CLAW_IDLE_Y, k); });
  const fx = claw.x, fz = claw.z;
  const cx = (CHUTE.x0 + CHUTE.x1) / 2, cz = (CHUTE.z0 + CHUTE.z1) / 2;
  const total = Math.hypot(cx - fx, cz - fz);
  // travel most of the way, but always let go while still over the pile
  let frac = rand(0.45, 0.85);
  for (; frac > 0.05; frac -= 0.05) {
    const px = lerp(fx, cx, frac), pz = lerp(fz, cz, frac);
    if (!(px < CHUTE.x1 + 0.35 && pz > CHUTE.z0 - 0.35)) break;
  }
  const mx = lerp(fx, cx, frac), mz = lerp(fz, cz, frac);
  audio.motor(true);
  claw.jitter = 0.025;
  await tween(0.3 + total * frac * 0.34, (k) => { claw.x = lerp(fx, mx, k); claw.z = lerp(fz, mz, k); }, ease.in);
  audio.motor(false);
  await slip(target, clamp(mx, BIN.x0 + 0.4, BIN.x1 - 0.4), clamp(mz, BIN.z0 + 0.4, BIN.z1 - 0.4));
  return finishLoss(pick(['So close!', 'Nooo!', 'Almost!']));
}

async function slip(it, x, z) {
  audio.slip();
  vfx.setGlow(null);
  claw.jitter = 0;
  tween(0.2, (k) => { claw.open = lerp(0.42, 0.75, k); }, ease.out);
  await dropToPit(it, x, z);
  audio.thud();
  vfx.emit({ x, y: PIT_Y + 0.15, z }, { count: 6, color: '#ffffff', speed: 0.9, size: 0.1, life: 0.35 });
}

async function finishLoss(text) {
  claw.jitter = 0;
  machine.setLights('lose');
  audio.lose();
  toast(text, 1100);
  const fx = claw.x, fz = claw.z, fo = claw.open;
  await tween(0.9, (k) => {
    claw.x = lerp(fx, CLAW_HOME.x, k); claw.z = lerp(fz, CLAW_HOME.z, k); claw.open = lerp(fo, 1, k);
  });
  enterMenu();
}

// ---- win presentation ------------------------------------------------------------
async function presentWin(id, level) {
  const item = ITEM_BY_ID[id];
  const rarity = RARITIES[item.rarity];
  const dur = [1.5, 1.9, 2.6, 3.4, 5.6][level];
  machine.setLights('win', rarity.color);
  audio.win(level);

  // 3D prize in front of the camera
  const model = createItem(id, 'show');
  showSpin.clear();
  showSpin.add(model);
  const dist = 2.2;
  const visH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const size = Math.min(visH * 0.3, visH * camera.aspect * 0.42) * (0.85 + level * 0.06);
  show.position.set(0, visH * 0.16, -dist);
  show.visible = true;
  showRays.material.color.set(rarity.color); showGlow.material.color.set(rarity.color);
  showRays.material.opacity = level >= 1 ? 0.55 : 0.25;
  showGlow.material.opacity = 0.6;
  showLight.intensity = 6;
  const baseScale = size / Math.max(0.45, model.userData.radius * 2, model.userData.height);
  let spinning = true;
  const t0 = performance.now();
  (function spin() {
    if (!spinning) return;
    const t = (performance.now() - t0) / 1000;
    model.rotation.y = Math.sin(t * 1.6) * 0.7 + (level >= 4 ? t * 2.4 : 0);
    model.rotation.z = Math.sin(t * 2.3) * 0.08;
    model.position.y = Math.sin(t * 2.6) * 0.03;
    showRays.material.rotation = t * 0.6;
    const s = baseScale * 2.6 * (1 + Math.sin(t * 5) * 0.04);
    showRays.scale.setScalar(s * (1 + level * 0.45)); showGlow.scale.setScalar(s * 0.9);
    requestAnimationFrame(spin);
  })();

  // overlay effects by tier
  const confettiCols = [rarity.color, '#ffffff', '#ff5fa2', '#ffd23f', '#31e1ff'];
  if (level >= 1) vfx.confetti(24 + level * 10, confettiCols);
  if (level >= 2) vfx.flash(rarity.color, 0.3);
  if (level >= 3) { setDim(0.5); vfx.confetti(120, confettiCols); view.shake = 0.25; }
  if (level >= 4) {
    setDim(0.72); vfx.flash('#ffffff', 0.6); view.shake = 0.5;
    vfx.coins(70);
    wait(0.8).then(() => vfx.confetti(160, confettiCols, { burst: false }));
    wait(1.6).then(() => { vfx.confetti(140, confettiCols); vfx.coins(50); view.shake = 0.3; });
    wait(3.0).then(() => { vfx.confetti(120, confettiCols, { burst: false }); vfx.coins(40); });
  }

  // text
  const el = $('win');
  el.style.setProperty('--rc', rarity.color);
  $('win-rarity').textContent = level >= 4 ? '★ ' + rarity.label + ' ★' : rarity.label;
  $('win-name').textContent = item.name;
  $('win-mult').textContent = `×${item.mult}`;
  $('win-amount').textContent = '+' + money(level >= 2 ? 0 : outcome.win);
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  showEl('win', true);

  const entrance = tween(level >= 3 ? 0.7 : 0.4, (k, raw) => {
    show.scale.setScalar(baseScale * k);
    if (level >= 3) showSpin.rotation.y = (1 - raw) * Math.PI * 4;
  }, ease.outBack);

  if (level >= 2) {
    let lastTick = -1;
    await tween(Math.min(dur * 0.5, 0.6 + level * 0.45), (k) => {
      $('win-amount').textContent = '+' + money(Math.round(outcome.win * k));
      const tick = Math.floor(k * (8 + level * 6));
      if (tick !== lastTick) { lastTick = tick; audio.coin(tick); }
    }, ease.out);
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }
  await entrance;
  balance += outcome.win; store.set('balance', balance);
  setHud(); bumpBalance();
  await wait(dur * (level >= 2 ? 0.5 : 0.8));

  showEl('win', false);
  setDim(0);
  await tween(0.28, (k) => { show.scale.setScalar(baseScale * (1 - k)); showLight.intensity = 6 * (1 - k); }, ease.in);
  spinning = false;
  show.visible = false;
  showSpin.clear();
}

// ---- main loop -------------------------------------------------------------------
const clock = new THREE.Clock();
// adaptive quality: step the resolution down (then drop shadows) on slow GPUs
let slowT = 0, quality = 0;
function adapt(rawDt) {
  slowT = rawDt > 0.03 ? slowT + rawDt : Math.max(0, slowT - rawDt * 2);
  if (slowT < 1.5 || quality >= 3) return;
  slowT = 0; quality++;
  const pr = Math.min(window.devicePixelRatio || 1, 2);
  if (quality === 1) renderer.setPixelRatio(Math.max(1, pr * 0.75));
  else if (quality === 2) { renderer.setPixelRatio(1); sun.shadow.mapSize.set(1024, 1024); sun.shadow.map?.dispose(); sun.shadow.map = null; }
  else { renderer.shadowMap.enabled = false; sun.castShadow = false; scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); }
}
let twinkleT = 0;
let timeScale = 1;
let moving = false;
function loop() {
  const rawDt = clock.getDelta();
  adapt(rawDt);
  const dt = Math.min(rawDt, 0.05) * timeScale;
  const t = clock.elapsedTime;
  updateTweens(dt);

  // input → claw
  let ix = stickVec.x, iy = stickVec.y;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) ix -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) ix += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) iy -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) iy += 1;
  const mag = Math.hypot(ix, iy);
  if (mag > 1) { ix /= mag; iy /= mag; }
  if (state === 'play') {
    input.x = ix; input.y = iy;
    claw.x = clamp(claw.x + ix * CLAW_SPEED * dt, CLAW_RANGE.x0, CLAW_RANGE.x1);
    claw.z = clamp(claw.z + iy * CLAW_SPEED * dt, CLAW_RANGE.z0, CLAW_RANGE.z1);
    const nowMoving = mag > 0.15;
    if (nowMoving !== moving) { moving = nowMoving; audio.motor(moving); }
    timeLeft -= dt;
    const whole = Math.ceil(timeLeft);
    if (whole !== lastWholeSecond) { lastWholeSecond = whole; if (whole > 0) audio.tick(whole <= 3); }
    updateTimer();
    if (timeLeft <= 0) resolveDrop(); // timer ran out: the claw drops where it is
  } else {
    input.x = input.y = 0;
    if (moving && state !== 'resolve') { moving = false; audio.motor(false); }
  }

  machine.update(dt, t);

  // twinkles on the fancy prizes
  twinkleT -= dt;
  if (twinkleT <= 0 && pile.length && state !== 'shuffle') {
    twinkleT = 0.16;
    const it = pick(pile);
    const lvl = RARITY_ORDER.indexOf(it.rarity);
    if (lvl >= 3 && it.obj.parent === machine.group) {
      vfx.emit({ x: it.x, y: PIT_Y + 0.3, z: it.z }, { count: 1, color: [RARITIES[it.rarity].color, '#ffffff'], speed: 0.25, gravity: -0.3, life: 0.9, size: 0.22, star: true, spread: 0.4 });
    }
  }
  for (const b of bokeh) b.position.y = b.userData.y + Math.sin(t * b.userData.sp + b.userData.ph) * 0.8;

  // camera
  frame(view.mode);
  const kcam = 1 - Math.exp(-dt * 3.2);
  view.pos.lerp(wantPos, kcam);
  view.target.lerp(wantTarget, kcam);
  camera.position.copy(view.pos);
  if (view.mode === 'menu') camera.position.x += Math.sin(t * 0.35) * 0.5;
  if (view.shake > 0.001) {
    camera.position.x += (Math.random() - 0.5) * view.shake;
    camera.position.y += (Math.random() - 0.5) * view.shake;
    view.shake *= Math.exp(-dt * 4);
  }
  camera.lookAt(view.target);

  dimmer.material.opacity += (dimWant - dimmer.material.opacity) * Math.min(1, dt * 5);
  dimmer.visible = dimmer.material.opacity > 0.01;
  vfx.update(dt, t, camera);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// ---- boot ------------------------------------------------------------------------
async function boot() {
  setHud();
  showEl('prompt', false); showEl('bet', false);
  frame('menu');
  view.pos.copy(wantPos).multiplyScalar(1.25); view.target.copy(wantTarget);
  loop();
  try { await document.fonts.ready; } catch { /* ignore */ }
  machine.setLights('shuffle');
  await shufflePile(null); // attract-mode pile
  enterMenu();
}
boot();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

// debug hook, dev builds only: window.__claw.force('keys')
if (import.meta.env.DEV) window.__claw = {
  get state() { return state; },
  engine,
  set timeScale(v) { timeScale = v; },
  force(id) {
    const orig = engine.playRound;
    engine.playRound = (stake) => {
      engine.playRound = orig;
      const it = ITEM_BY_ID[id];
      return { roundId: -1, stake, itemId: it ? id : null, mult: it ? it.mult : 0, win: it ? Math.round(stake * it.mult) : 0 };
    };
  },
};
