// The claw machine: a glossy dark cabinet with neon LED trim, a deep prize pit,
// a real drop trough that feeds a lit prize bay, plus the gantry and claw.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const BIN = { x0: -2.1, x1: 2.1, z0: -1.6, z1: 1.6 };
export const CHUTE = { x0: -2.1, x1: -0.85, z0: 0.35, z1: 1.6 };
export const CLAW_HOME = { x: -1.5, z: 1.0 };
export const CLAW_RANGE = { x0: -1.85, x1: 1.85, z0: -1.35, z1: 1.35 };
export const RAIL_Y = 3.85;
export const CLAW_IDLE_Y = 2.75;
export const PIT_FLOOR = -1.1;
/** Height of the top of the prize pile at a point (it banks up toward the back). */
export const surfY = (x, z) => 0.02 + 0.34 * ((1.6 - z) / 3.2) + 0.05 * Math.sin(x * 2.1 + z * 1.3);
export const inChute = (x, z, pad = 0) => x < CHUTE.x1 + pad && z > CHUTE.z0 - pad;
/** Prize bay under the trough (interior box). */
export const BAY = { x0: -2.33, x1: -0.75, y0: -2.46, y1: -1.24, z0: 0.85, z1: 1.95 };

const FONT = '"Fredoka Variable", "Fredoka", system-ui, sans-serif';
const C = { body: '#15103d', bodyHi: '#241a66', pink: '#ff2d95', cyan: '#22e3ff', violet: '#8b5cff', yellow: '#ffd23f', chrome: '#e8eef5' };

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, ...o });
const neonMat = (color, k = 1.8) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false });
function rbox(w, h, d, r, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2) * 0.99), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function haloTex() {
  return canvasTex(128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.4, 'rgba(255,255,255,.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  });
}

export function createMachine(scene) {
  const g = new THREE.Group();
  scene.add(g);
  const body = std(C.body, { roughness: 0.2, metalness: 0.55 });
  const bodyHi = std(C.bodyHi, { roughness: 0.25, metalness: 0.5 });
  const chrome = std(C.chrome, { metalness: 0.95, roughness: 0.18 });
  const add = (...m) => { g.add(...m); return m[0]; };

  // ---- base (with a recessed prize bay front-left) ---------------------------
  add(rbox(4.9, 1.5, 2.8, 0.14, body, 0, -1.85, -0.55));
  add(rbox(3.2, 1.5, 1.12, 0.14, body, 0.85, -1.85, 1.4));
  add(rbox(0.12, 1.5, 1.12, 0.05, body, -2.39, -1.85, 1.4));
  add(rbox(1.62, 0.14, 1.12, 0.05, body, -1.58, -2.53, 1.4));
  add(rbox(1.62, 0.14, 1.12, 0.05, body, -1.58, -1.17, 1.4));
  add(rbox(4.96, 0.1, 3.96, 0.04, chrome, 0, -1.1, 0)); // chrome belt under the glass
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(rbox(0.5, 0.2, 0.5, 0.08, chrome, sx * 2.05, -2.7, sz * 1.55));

  // synthwave front panel
  const panelTex = canvasTex(768, 320, (c, w, h) => {
    const bg = c.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#120a3a'); bg.addColorStop(0.55, '#3b1a8f'); bg.addColorStop(1, '#ff2d95');
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(34,227,255,.75)'; c.lineWidth = 2.5;
    for (let i = -12; i <= 12; i++) { c.beginPath(); c.moveTo(w / 2 + i * 14, h * 0.5); c.lineTo(w / 2 + i * 120, h); c.stroke(); }
    for (let j = 0; j < 7; j++) { const y = h * 0.5 + Math.pow(j / 6, 2) * h * 0.5; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    const sun = c.createLinearGradient(0, 40, 0, 170);
    sun.addColorStop(0, '#ffd23f'); sun.addColorStop(1, '#ff2d95');
    c.fillStyle = sun; c.beginPath(); c.arc(w / 2, h * 0.5, 96, Math.PI, 0); c.fill();
    c.fillStyle = '#3b1a8f'; for (let k = 0; k < 4; k++) c.fillRect(w / 2 - 100, h * 0.5 - 14 - k * 20, 200, 5 - k);
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.86, 1.16), new THREE.MeshBasicMaterial({ map: panelTex, color: '#cfcfe6' }));
  panel.position.set(0.85, -1.92, 1.976);
  add(panel);
  add(rbox(2.98, 1.28, 0.04, 0.02, chrome, 0.85, -1.92, 1.95));

  // control deck
  add(rbox(3.3, 0.34, 0.95, 0.12, bodyHi, 0.85, -1.26, 2.3));
  add(rbox(3.3, 0.05, 0.97, 0.02, neonMat(C.cyan, 1.3), 0.85, -1.44, 2.3));
  const stickPivot = new THREE.Group();
  stickPivot.position.set(0.25, -1.08, 2.35);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.36, 12), chrome);
  stick.position.y = 0.18;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), std(C.pink, { roughness: 0.12, emissive: C.pink, emissiveIntensity: 0.5 }));
  knob.position.y = 0.4; knob.castShadow = true;
  stickPivot.add(stick, knob);
  const ring = (x, col) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.025, 8, 32), neonMat(col)); r.rotation.x = Math.PI / 2; r.position.set(x, -1.085, 2.35); return r; };
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.12, 28), std(C.cyan, { roughness: 0.15, emissive: C.cyan, emissiveIntensity: 0.7 }));
  button.position.set(1.55, -1.05, 2.35);
  add(stickPivot, ring(0.25, C.pink), ring(1.55, C.cyan), button);
  const miniTex = canvasTex(256, 96, (c, w, h) => {
    c.fillStyle = '#06041a'; c.fillRect(0, 0, w, h);
    c.font = `700 54px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = '#22e3ff'; c.shadowBlur = 16; c.fillStyle = '#9ff4ff'; c.fillText('PLAY ▶', w / 2, h / 2 + 3);
  });
  const mini = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.26), new THREE.MeshBasicMaterial({ map: miniTex }));
  mini.rotation.x = -Math.PI / 2; mini.position.set(0.9, -1.085, 2.42);
  add(mini);

  // ---- prize bay ---------------------------------------------------------------
  const bayC = new THREE.Vector3((BAY.x0 + BAY.x1) / 2, (BAY.y0 + BAY.y1) / 2, (BAY.z0 + BAY.z1) / 2);
  const bayBackTex = canvasTex(256, 256, (c, w, h) => {
    const r = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7);
    r.addColorStop(0, '#5a3ad6'); r.addColorStop(1, '#0c0626');
    c.fillStyle = r; c.fillRect(0, 0, w, h);
  });
  const bayBack = new THREE.Mesh(new THREE.PlaneGeometry(BAY.x1 - BAY.x0, BAY.y1 - BAY.y0), new THREE.MeshBasicMaterial({ map: bayBackTex }));
  bayBack.position.set(bayC.x, bayC.y, BAY.z0 + 0.01);
  add(bayBack);
  const flap = new THREE.Mesh(new THREE.PlaneGeometry(BAY.x1 - BAY.x0, 0.5), new THREE.MeshStandardMaterial({ color: '#bff3ff', transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }));
  flap.position.set(bayC.x, BAY.y1 - 0.25, BAY.z1 + 0.01);
  add(flap);
  const bayLight = new THREE.PointLight('#bfe9ff', 2.2, 4, 1.4);
  bayLight.position.set(bayC.x, BAY.y1 - 0.15, BAY.z1 - 0.25);
  add(bayLight);
  const prizeTex = canvasTex(256, 64, (c, w, h) => {
    c.font = `700 44px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = '#ff2d95'; c.shadowBlur = 14; c.fillStyle = '#ffd6ec'; c.fillText('PRIZE', w / 2, h / 2 + 3);
  });
  const prizeLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshBasicMaterial({ map: prizeTex, transparent: true }));
  prizeLabel.position.set(bayC.x, -1.17, 1.97);
  add(prizeLabel);

  // ---- interior ------------------------------------------------------------------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 3.5), std('#0d0828'));
  floor.rotation.x = -Math.PI / 2; floor.position.y = PIT_FLOOR + 0.055;
  add(floor);
  const coreMat = std('#1a1150', { roughness: 0.9 });
  const coreA = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.95, 1.55), coreMat); coreA.position.set(0, PIT_FLOOR + 0.475, -0.78);
  const coreB = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.95, 1.2), coreMat); coreB.position.set(0.63, PIT_FLOOR + 0.475, 0.6);
  add(coreA, coreB);

  const backTex = canvasTex(1024, 1024, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#2b1c9c'); gr.addColorStop(0.5, '#7a4dff'); gr.addColorStop(0.8, '#ff5fb8'); gr.addColorStop(1, '#ffb36b');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 3;
    for (let i = 0; i <= 16; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); }
    c.save(); c.translate(w / 2, h * 0.42);
    for (let i = 0; i < 20; i++) {
      c.rotate((Math.PI * 2) / 20);
      c.fillStyle = 'rgba(255,255,255,.1)';
      c.beginPath(); c.moveTo(0, 0); c.lineTo(-60, -1100); c.lineTo(60, -1100); c.fill();
    }
    c.restore();
  });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 5.3), new THREE.MeshStandardMaterial({ map: backTex, emissiveMap: backTex, emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.6 }));
  back.position.set(0, 1.55, -1.74);
  add(back);

  // capsule balls packed around the visible faces and top of the pile
  const ballCols = ['#ff5fa2', '#31d6ff', '#ffd23f', '#a98bff', '#5ef0a8', '#ff9a5c', '#ffffff'].map((c) => new THREE.Color(c));
  const ballMax = 560;
  const pit = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 14, 10), std('#ffffff', { roughness: 0.22 }), ballMax);
  const dummy = new THREE.Object3D();
  let n = 0;
  for (let i = 0; i < 9000 && n < ballMax; i++) {
    const x = THREE.MathUtils.lerp(BIN.x0 + 0.1, BIN.x1 - 0.1, Math.random());
    const z = THREE.MathUtils.lerp(BIN.z0 + 0.1, BIN.z1 - 0.1, Math.random());
    if (inChute(x, z, 0.14)) continue;
    const top = surfY(x, z) - 0.06;
    const y = THREE.MathUtils.lerp(PIT_FLOOR + 0.14, top, Math.random());
    const shell = y > top - 0.2 || z > 1.22 || x < -1.75 || x > 1.75 || (x < -0.5 && z > 0.02 && inChute(x, z, 0.42));
    if (!shell) continue;
    dummy.position.set(x, y, z);
    dummy.scale.setScalar(0.75 + Math.random() * 0.45);
    dummy.updateMatrix();
    pit.setMatrixAt(n, dummy.matrix);
    pit.setColorAt(n, ballCols[Math.floor(Math.random() * ballCols.length)]);
    n++;
  }
  pit.count = n;
  pit.receiveShadow = true;
  add(pit);

  // drop trough: acrylic shaft from the top of the pile down to the prize bay
  const troughH = 0.8 - PIT_FLOOR;
  const acrylic = new THREE.MeshStandardMaterial({ color: '#8fefff', transparent: true, opacity: 0.2, roughness: 0.08, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false });
  const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, troughH, CHUTE.z1 - CHUTE.z0), acrylic);
  w1.position.set(CHUTE.x1, PIT_FLOOR + troughH / 2, (CHUTE.z0 + CHUTE.z1) / 2);
  const w2 = new THREE.Mesh(new THREE.BoxGeometry(CHUTE.x1 - CHUTE.x0, troughH, 0.05), acrylic);
  w2.position.set((CHUTE.x0 + CHUTE.x1) / 2, PIT_FLOOR + troughH / 2, CHUTE.z0);
  w1.renderOrder = w2.renderOrder = 3;
  add(w1, w2);
  const rim = neonMat(C.cyan, 1.6);
  add(rbox(0.07, 0.05, CHUTE.z1 - CHUTE.z0, 0.02, rim, CHUTE.x1, 0.8, (CHUTE.z0 + CHUTE.z1) / 2));
  add(rbox(CHUTE.x1 - CHUTE.x0, 0.05, 0.07, 0.02, rim, (CHUTE.x0 + CHUTE.x1) / 2, 0.8, CHUTE.z0));
  add(rbox(0.07, troughH, 0.07, 0.02, rim, CHUTE.x1, PIT_FLOOR + troughH / 2, CHUTE.z0));
  const holeTex = canvasTex(128, 128, (c) => {
    const r = c.createRadialGradient(64, 64, 6, 64, 64, 64);
    r.addColorStop(0, '#000'); r.addColorStop(0.72, '#090420'); r.addColorStop(0.9, '#22e3ff'); r.addColorStop(1, '#0d0828');
    c.fillStyle = r; c.fillRect(0, 0, 128, 128);
  });
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(CHUTE.x1 - CHUTE.x0 - 0.1, CHUTE.z1 - CHUTE.z0 - 0.1), new THREE.MeshBasicMaterial({ map: holeTex }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.set((CHUTE.x0 + CHUTE.x1) / 2, PIT_FLOOR + 0.07, (CHUTE.z0 + CHUTE.z1) / 2);
  add(hole);

  // ---- frame, glass, top -----------------------------------------------------------
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(rbox(0.24, 5.4, 0.24, 0.08, sz > 0 ? bodyHi : body, sx * 2.28, 1.58, sz * 1.78));
  const glassMat = new THREE.MeshStandardMaterial({ color: '#dff6ff', transparent: true, opacity: 0.09, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide });
  const gFront = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 5.3), glassMat);
  gFront.position.set(0, 1.55, 1.78); gFront.renderOrder = 5;
  const gL = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.3), glassMat);
  gL.position.set(-2.28, 1.55, 0); gL.rotation.y = Math.PI / 2; gL.renderOrder = 5;
  const gR = gL.clone(); gR.position.x = 2.28;
  add(gFront, gL, gR);
  const glareTex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = 'rgba(255,255,255,.13)';
    c.beginPath(); c.moveTo(30, h); c.lineTo(110, 0); c.lineTo(150, 0); c.lineTo(70, h); c.fill();
    c.fillStyle = 'rgba(255,255,255,.07)';
    c.beginPath(); c.moveTo(100, h); c.lineTo(180, 0); c.lineTo(196, 0); c.lineTo(116, h); c.fill();
  });
  const glare = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 5.3), new THREE.MeshBasicMaterial({ map: glareTex, transparent: true, depthWrite: false }));
  glare.position.set(1.1, 1.55, 1.79); glare.renderOrder = 6;
  add(glare);

  add(rbox(4.9, 0.56, 3.9, 0.16, body, 0, 4.5, 0));
  add(rbox(4.96, 0.06, 3.96, 0.03, chrome, 0, 4.2, 0));
  const lightPanel = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.2), new THREE.MeshBasicMaterial({ color: '#f4efff' }));
  lightPanel.rotation.x = Math.PI / 2; lightPanel.position.y = 4.16;
  add(lightPanel);

  // marquee: LED sign on chrome struts
  add(rbox(4.5, 1.3, 0.34, 0.12, body, 0, 5.42, 1.42));
  add(rbox(4.62, 1.42, 0.2, 0.14, chrome, 0, 5.42, 1.36));
  const marqueeTex = canvasTex(1024, 280, (c, w, h) => {
    c.fillStyle = '#080420'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(139,92,255,.16)';
    for (let y = 0; y < h; y += 8) c.fillRect(0, y, w, 3);
    c.font = `700 178px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.shadowColor = '#ff2d95'; c.shadowBlur = 44;
    c.strokeStyle = '#ff2d95'; c.lineWidth = 22; c.strokeText('THE CLAW', w / 2, h / 2 + 8);
    c.shadowColor = '#22e3ff'; c.shadowBlur = 18;
    const tg = c.createLinearGradient(0, 40, 0, h - 30);
    tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.55, '#ffe3f4'); tg.addColorStop(1, '#8ff3ff');
    c.fillStyle = tg; c.fillText('THE CLAW', w / 2, h / 2 + 8);
  });
  const marquee = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.06), new THREE.MeshBasicMaterial({ map: marqueeTex, toneMapped: false }));
  marquee.position.set(0, 5.42, 1.6);
  add(marquee);

  // ---- LEDs (instanced; colours animated every frame) ---------------------------------
  const leds = []; // { p:[x,y,z], s:[sx,sy,sz], grp }
  const led = (x, y, z, sx, sy, grp) => leds.push({ p: [x, y, z], s: [sx, sy, 0.6], grp });
  const mw = 2.2, mh = 0.62, my = 5.42, mz = 1.61;
  for (let i = 0; i < 19; i++) led(-mw + (i * 2 * mw) / 18, my + mh, mz, 1, 1, 'm');
  for (let i = 1; i < 5; i++) led(mw, my + mh - (i * 2 * mh) / 5, mz, 1, 1, 'm');
  for (let i = 18; i >= 0; i--) led(-mw + (i * 2 * mw) / 18, my - mh, mz, 1, 1, 'm');
  for (let i = 4; i > 0; i--) led(-mw, my + mh - (i * 2 * mh) / 5, mz, 1, 1, 'm');
  for (const sx of [-1, 1]) for (let i = 0; i < 20; i++) led(sx * 2.28, -0.92 + i * 0.262, 1.91, 0.75, 2.2, 'p');
  for (let i = 0; i < 22; i++) led(-2.2 + i * 0.2095, 4.5, 1.96, 2.1, 0.7, 't');
  const bw = (BAY.x1 - BAY.x0) / 2 + 0.03, bh = (BAY.y1 - BAY.y0) / 2 + 0.03;
  for (let i = 0; i < 9; i++) { led(bayC.x - bw + (i * 2 * bw) / 8, bayC.y + bh, 1.98, 1.7, 0.6, 'b'); led(bayC.x - bw + (i * 2 * bw) / 8, bayC.y - bh, 1.98, 1.7, 0.6, 'b'); }
  for (let i = 1; i < 6; i++) { led(bayC.x - bw, bayC.y - bh + (i * 2 * bh) / 6, 1.98, 0.6, 1.7, 'b'); led(bayC.x + bw, bayC.y - bh + (i * 2 * bh) / 6, 1.98, 0.6, 1.7, 'b'); }
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), leds.length);
  leds.forEach((l, i) => {
    dummy.position.set(...l.p); dummy.scale.set(...l.s); dummy.updateMatrix();
    bulbs.setMatrixAt(i, dummy.matrix);
    bulbs.setColorAt(i, new THREE.Color('#fff'));
  });
  add(bulbs);

  // soft halos behind the brightest light sources (cheap stand-in for bloom)
  const hTex = haloTex();
  const halo = (w, h, x, y, z, color, op = 0.55) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: hTex, color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(x, y, z); m.renderOrder = 7;
    g.add(m);
    return m;
  };
  const halos = [halo(1.5, 6.6, -2.28, 1.6, 1.97, C.pink), halo(1.5, 6.6, 2.28, 1.6, 1.97, C.cyan), halo(7.2, 3.2, 0, 5.42, 1.3, C.pink, 0.7), halo(6.4, 1.4, 0, 4.5, 1.98, C.violet, 0.5)];
  const bayHalo = halo(3.0, 2.6, bayC.x, bayC.y, 2.0, C.cyan, 0.35);
  const under = halo(8.5, 6.5, 0, -2.78, 0.4, C.pink, 0.5);
  under.rotation.x = -Math.PI / 2;

  const off = new THREE.Color('#1a1240');
  const tmpC = new THREE.Color();
  const hueC = new THREE.Color();
  let lightMode = 'idle';
  let lightColor = new THREE.Color(C.yellow);
  let bayColor = null;

  // ---- gantry + claw -----------------------------------------------------------------
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 12), chrome);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(sx * 2.05, RAIL_Y + 0.12, 0);
    add(rail);
  }
  const bridge = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 4.2, 12), chrome);
  bar.rotation.z = Math.PI / 2;
  bridge.add(bar);
  bridge.position.y = RAIL_Y + 0.12;
  add(bridge);
  const carriage = rbox(0.5, 0.26, 0.42, 0.08, bodyHi);
  carriage.position.y = RAIL_Y + 0.05;
  const carLed = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.44), neonMat(C.pink, 1.5));
  carriage.add(carLed);
  add(carriage);

  const pendulum = new THREE.Group();
  pendulum.position.y = RAIL_Y - 0.08;
  add(pendulum);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 8), std('#9aa3b8', { metalness: 0.8, roughness: 0.3 }));
  pendulum.add(cable);
  const head = new THREE.Group();
  pendulum.add(head);
  const hubTop = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 0.2, 24), bodyHi);
  hubTop.position.y = 0.12;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 28), chrome);
  const hubRing = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.03, 10, 28), neonMat(C.cyan, 1.7));
  hubRing.rotation.x = Math.PI / 2;
  [hubTop, hub].forEach((m) => { m.castShadow = true; });
  head.add(hubTop, hub, hubRing);
  const fingers = [];
  for (let i = 0; i < 3; i++) {
    const yaw = new THREE.Group();
    yaw.rotation.y = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const pivot = new THREE.Group();
    pivot.position.set(0.13, -0.06, 0);
    const upper = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.4, 0.1, 3, 0.028), chrome);
    upper.position.y = -0.19;
    const knee = new THREE.Group();
    knee.position.y = -0.38;
    knee.rotation.z = -1.0;
    const lower = new THREE.Mesh(new RoundedBoxGeometry(0.055, 0.36, 0.09, 3, 0.026), chrome);
    lower.position.y = -0.17;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), std(C.pink, { roughness: 0.2, emissive: C.pink, emissiveIntensity: 0.8 }));
    tip.position.y = -0.35;
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), std(C.body, { metalness: 0.6, roughness: 0.3 }));
    [upper, lower, tip, joint].forEach((m) => { m.castShadow = true; });
    knee.add(lower, tip, joint);
    pivot.add(upper, knee);
    yaw.add(pivot);
    head.add(yaw);
    fingers.push(pivot);
  }
  const holder = new THREE.Group();
  holder.position.y = -0.74;
  head.add(holder);

  const claw = {
    x: CLAW_HOME.x, z: CLAW_HOME.z, y: CLAW_IDLE_Y, open: 1,
    swayX: 0, swayZ: 0, vSwayX: 0, vSwayZ: 0, px: CLAW_HOME.x, pz: CLAW_HOME.z, jitter: 0,
    holder, head,
  };
  const input = { x: 0, y: 0, pressed: false };

  function update(dt, t) {
    const vx = (claw.x - claw.px) / Math.max(dt, 1e-4);
    const vz = (claw.z - claw.pz) / Math.max(dt, 1e-4);
    claw.px = claw.x; claw.pz = claw.z;
    const k = 38, d = 3.2;
    claw.vSwayX += (-k * (claw.swayX + vx * 0.06) - d * claw.vSwayX) * dt;
    claw.vSwayZ += (-k * (claw.swayZ + vz * 0.06) - d * claw.vSwayZ) * dt;
    claw.swayX += claw.vSwayX * dt;
    claw.swayZ += claw.vSwayZ * dt;

    bridge.position.z = claw.z;
    carriage.position.x = claw.x; carriage.position.z = claw.z;
    pendulum.position.x = claw.x; pendulum.position.z = claw.z;
    pendulum.rotation.z = -claw.swayX;
    pendulum.rotation.x = claw.swayZ;
    const len = pendulum.position.y - claw.y;
    cable.scale.y = len;
    cable.position.y = -len / 2;
    head.position.y = -len;
    const a = THREE.MathUtils.lerp(0.3, 0.92, claw.open) + Math.sin(t * 40) * claw.jitter;
    for (const f of fingers) f.rotation.z = a;

    stickPivot.rotation.z = THREE.MathUtils.damp(stickPivot.rotation.z, -input.x * 0.45, 14, dt);
    stickPivot.rotation.x = THREE.MathUtils.damp(stickPivot.rotation.x, -input.y * 0.45, 14, dt);
    button.position.y = THREE.MathUtils.damp(button.position.y, input.pressed ? -1.1 : -1.05, 20, dt);

    // LEDs: a flowing spectrum, with per-mode patterns
    for (let i = 0; i < leds.length; i++) {
      const grp = leds[i].grp;
      let on;
      if (lightMode === 'idle') on = 0.55 + 0.45 * Math.sin(t * 2.2 - i * 0.45);
      else if (lightMode === 'play') on = 0.7 + 0.3 * Math.sin(t * 6 + i * 0.8);
      else if (lightMode === 'shuffle') on = (i + Math.floor(t * 26)) % 4 === 0 ? 1 : 0.12;
      else if (lightMode === 'win') on = Math.floor(t * 11 + (i % 2)) % 2 ? 1 : 0.15;
      else on = 0.14;
      if (grp === 'b' && bayColor) { tmpC.copy(off).lerp(bayColor, 0.6 + 0.4 * Math.sin(t * 12 - i * 0.7)); tmpC.multiplyScalar(1.9); }
      else {
        if (lightMode === 'win') hueC.copy(lightColor);
        else if (lightMode === 'lose') hueC.set('#ff3355');
        else hueC.setHSL((0.86 + 0.26 * Math.sin(i * 0.11 + t * 0.5) + (grp === 't' ? 0.08 : 0)) % 1, 1, 0.58);
        tmpC.copy(off).lerp(hueC, on);
        if (on > 0.5) tmpC.multiplyScalar(1.7);
      }
      bulbs.setColorAt(i, tmpC);
    }
    bulbs.instanceColor.needsUpdate = true;
    const pulse = lightMode === 'lose' ? 0.25 : 0.8 + 0.2 * Math.sin(t * 3);
    halos.forEach((h, i) => {
      if (lightMode === 'win') h.material.color.copy(lightColor);
      else h.material.color.setHSL((0.88 + 0.12 * Math.sin(t * 0.5 + i * 1.7)) % 1, 1, 0.6);
      h.material.opacity = (i === 2 ? 0.7 : 0.5) * pulse;
    });
    under.material.color.copy(halos[0].material.color);
    under.material.opacity = 0.45 * pulse;
    bayHalo.material.color.copy(bayColor ?? halos[1].material.color);
    bayHalo.material.opacity = bayColor ? 0.75 : 0.25;
  }

  return {
    group: g, claw, input, update,
    bay: { center: bayC, floorY: BAY.y0, light: bayLight },
    setLights(mode, color) { lightMode = mode; if (color) lightColor = new THREE.Color(color); },
    setBay(color) {
      bayColor = color ? new THREE.Color(color) : null;
      bayLight.color.set(color ?? '#bfe9ff');
      bayLight.intensity = color ? 7 : 2.2;
    },
  };
}
