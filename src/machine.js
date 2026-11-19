// The claw machine: cabinet, glass, lights, gantry and the claw itself.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const BIN = { x0: -2.1, x1: 2.1, z0: -1.6, z1: 1.6 };
export const CHUTE = { x0: -2.1, x1: -0.85, z0: 0.35, z1: 1.6 };
export const CLAW_HOME = { x: -1.5, z: 1.0 };
export const CLAW_RANGE = { x0: -1.85, x1: 1.85, z0: -1.35, z1: 1.35 };
export const RAIL_Y = 3.85;
export const CLAW_IDLE_Y = 2.75;
export const PIT_Y = 0.16; // resting height of prizes on the ball pit

const FONT = '"Fredoka Variable", "Fredoka", system-ui, sans-serif';
const C = { pink: '#ff3d81', pinkDark: '#d81e63', yellow: '#ffd23f', teal: '#1fd6c1', white: '#fff8fc', ink: '#2a1a5e' };

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, ...o });
function rbox(w, h, d, r, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 5, r), material);
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

export function createMachine(scene) {
  const g = new THREE.Group();
  scene.add(g);

  // ---- cabinet ------------------------------------------------------------
  const body = std(C.pink, { roughness: 0.28 });
  g.add(rbox(4.9, 2.6, 3.9, 0.18, body, 0, -1.32, 0));
  g.add(rbox(4.5, 1.5, 0.1, 0.05, std(C.pinkDark, { roughness: 0.3 }), 0, -1.55, 1.93));
  // star decals on the front panel
  const starTex = canvasTex(512, 160, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.font = `700 92px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(255,255,255,.22)'; c.fillText('★  ★  ★', w / 2, h / 2 + 6);
  });
  const stars = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.8), new THREE.MeshBasicMaterial({ map: starTex, transparent: true }));
  stars.position.set(0.85, -1.75, 1.99);
  g.add(stars);
  // prize door
  g.add(rbox(1.3, 0.95, 0.12, 0.08, std(C.yellow, { roughness: 0.3 }), -1.45, -1.75, 1.95));
  g.add(rbox(1.08, 0.72, 0.12, 0.06, std('#2a1a5e', { roughness: 0.2, metalness: 0.2 }), -1.45, -1.75, 1.97));
  // control panel ledge
  g.add(rbox(4.9, 0.42, 1.0, 0.16, std(C.yellow, { roughness: 0.3 }), 0, -0.42, 2.25));
  g.add(rbox(4.9, 0.14, 1.02, 0.07, std(C.white), 0, -0.2, 2.25));
  // joystick + button (decorative, mirror the player's input)
  const stickPivot = new THREE.Group();
  stickPivot.position.set(0.2, -0.12, 2.3);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.36, 12), std('#dfe6ee', { metalness: 0.9, roughness: 0.25 }));
  stick.position.y = 0.18;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), std('#ff3b5c', { roughness: 0.15 }));
  knob.position.y = 0.4;
  knob.castShadow = true;
  stickPivot.add(stick, knob);
  g.add(stickPivot);
  const stickBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.06, 28), std(C.ink));
  stickBase.position.set(0.2, -0.11, 2.3);
  g.add(stickBase);
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.12, 28), std(C.teal, { roughness: 0.2, emissive: C.teal, emissiveIntensity: 0.25 }));
  button.position.set(1.5, -0.08, 2.3);
  g.add(button);
  const btnBase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.06, 28), std(C.ink));
  btnBase.position.set(1.5, -0.11, 2.3);
  g.add(btnBase);
  // feet
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(rbox(0.5, 0.2, 0.5, 0.08, std(C.ink), sx * 2.05, -2.7, sz * 1.55));
  }

  // ---- interior -----------------------------------------------------------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 3.5), std('#3b2a8c'));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.005;
  floor.receiveShadow = true;
  g.add(floor);

  const backTex = canvasTex(1024, 1024, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#5ad1ff'); gr.addColorStop(1, '#7b6cff');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.translate(w / 2, h * 0.62);
    for (let i = 0; i < 18; i++) {
      c.rotate((Math.PI * 2) / 18);
      c.fillStyle = 'rgba(255,255,255,.13)';
      c.beginPath(); c.moveTo(0, 0); c.lineTo(-70, -1100); c.lineTo(70, -1100); c.fill();
    }
  });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.2), new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.6 }));
  back.position.set(0, 2.1, -1.74);
  g.add(back);

  // ball pit (pastel filler under the prizes)
  const pitColors = ['#ff9cc4', '#8fdcff', '#ffe07a', '#b9a4ff', '#8eecb8', '#ffb08a'].map((c) => new THREE.Color(c));
  const pitCount = 420;
  const pit = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 14, 10), std('#ffffff', { roughness: 0.35 }), pitCount);
  const dummy = new THREE.Object3D();
  let n = 0;
  for (let i = 0; i < 2000 && n < pitCount; i++) {
    const x = THREE.MathUtils.lerp(BIN.x0 + 0.08, BIN.x1 - 0.08, Math.random());
    const z = THREE.MathUtils.lerp(BIN.z0 + 0.08, BIN.z1 - 0.08, Math.random());
    if (x < CHUTE.x1 + 0.1 && z > CHUTE.z0 - 0.1) continue;
    dummy.position.set(x, 0.02 + Math.random() * 0.1, z);
    dummy.scale.setScalar(0.8 + Math.random() * 0.5);
    dummy.updateMatrix();
    pit.setMatrixAt(n, dummy.matrix);
    pit.setColorAt(n, pitColors[n % pitColors.length]);
    n++;
  }
  pit.count = n;
  pit.receiveShadow = true;
  g.add(pit);

  // chute
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(CHUTE.x1 - CHUTE.x0, CHUTE.z1 - CHUTE.z0), new THREE.MeshBasicMaterial({ color: '#120a33' }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.set((CHUTE.x0 + CHUTE.x1) / 2, 0.012, (CHUTE.z0 + CHUTE.z1) / 2);
  g.add(hole);
  const acrylic = new THREE.MeshStandardMaterial({ color: C.yellow, transparent: true, opacity: 0.55, roughness: 0.15, side: THREE.DoubleSide });
  const w1 = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.62, CHUTE.z1 - CHUTE.z0, 3, 0.03), acrylic);
  w1.position.set(CHUTE.x1, 0.31, (CHUTE.z0 + CHUTE.z1) / 2);
  const w2 = new THREE.Mesh(new RoundedBoxGeometry(CHUTE.x1 - CHUTE.x0, 0.62, 0.06, 3, 0.03), acrylic);
  w2.position.set((CHUTE.x0 + CHUTE.x1) / 2, 0.31, CHUTE.z0);
  g.add(w1, w2);

  // pillars, glass, top
  const frame = std(C.white, { roughness: 0.25 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(rbox(0.26, 4.3, 0.26, 0.1, frame, sx * 2.28, 2.1, sz * 1.78));
  g.add(rbox(4.82, 0.16, 3.82, 0.07, frame, 0, 0.0, 0));
  const glassMat = new THREE.MeshStandardMaterial({ color: '#dff6ff', transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide });
  const gFront = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.2), glassMat);
  gFront.position.set(0, 2.1, 1.78);
  gFront.renderOrder = 5;
  const gL = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.2), glassMat);
  gL.position.set(-2.28, 2.1, 0); gL.rotation.y = Math.PI / 2; gL.renderOrder = 5;
  const gR = gL.clone(); gR.position.x = 2.28;
  g.add(gFront, gL, gR);
  // glass glare streaks
  const glareTex = canvasTex(256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.16)';
    c.beginPath(); c.moveTo(30, h); c.lineTo(110, 0); c.lineTo(150, 0); c.lineTo(70, h); c.fill();
    c.fillStyle = 'rgba(255,255,255,.09)';
    c.beginPath(); c.moveTo(100, h); c.lineTo(180, 0); c.lineTo(196, 0); c.lineTo(116, h); c.fill();
  });
  const glare = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 4.2), new THREE.MeshBasicMaterial({ map: glareTex, transparent: true, depthWrite: false }));
  glare.position.set(1.1, 2.1, 1.79);
  glare.renderOrder = 6;
  g.add(glare);

  g.add(rbox(4.9, 0.55, 3.9, 0.18, body, 0, 4.5, 0));
  const lightPanel = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.2), new THREE.MeshBasicMaterial({ color: '#fff3d6' }));
  lightPanel.rotation.x = Math.PI / 2;
  lightPanel.position.y = 4.22;
  g.add(lightPanel);

  // marquee
  g.add(rbox(4.3, 1.25, 0.6, 0.22, std(C.ink, { roughness: 0.3 }), 0, 5.35, 1.3));
  const marqueeTex = canvasTex(1024, 256, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, '#7c3aed'); gr.addColorStop(0.5, '#ff3d81'); gr.addColorStop(1, '#ff9f1c');
    c.fillStyle = gr; c.beginPath(); c.roundRect(0, 0, w, h, 50); c.fill();
    c.font = `700 170px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.strokeStyle = '#2a1a5e'; c.lineWidth = 34; c.strokeText('THE CLAW', w / 2, h / 2 + 12);
    c.strokeStyle = '#ffffff'; c.lineWidth = 14; c.strokeText('THE CLAW', w / 2, h / 2 + 6);
    c.fillStyle = '#ffd23f'; c.fillText('THE CLAW', w / 2, h / 2 + 6);
  });
  const marquee = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 0.92), new THREE.MeshBasicMaterial({ map: marqueeTex, transparent: true }));
  marquee.position.set(0, 5.35, 1.61);
  g.add(marquee);

  // LED bulbs (marquee border + front pillars)
  const bulbPos = [];
  const mw = 2.0, mh = 0.5;
  for (let i = 0; i < 13; i++) bulbPos.push([-mw + (i * 2 * mw) / 12, 5.35 + mh, 1.62]);
  for (let i = 1; i < 4; i++) bulbPos.push([mw, 5.35 + mh - (i * 2 * mh) / 4, 1.62]);
  for (let i = 12; i >= 0; i--) bulbPos.push([-mw + (i * 2 * mw) / 12, 5.35 - mh, 1.62]);
  for (let i = 3; i > 0; i--) bulbPos.push([-mw, 5.35 + mh - (i * 2 * mh) / 4, 1.62]);
  const marqueeBulbs = bulbPos.length;
  for (let i = 0; i < 9; i++) { bulbPos.push([-2.28, 0.35 + i * 0.44, 1.93]); }
  for (let i = 0; i < 9; i++) { bulbPos.push([2.28, 0.35 + i * 0.44, 1.93]); }
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 12, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), bulbPos.length);
  bulbPos.forEach((p, i) => {
    dummy.position.set(...p); dummy.scale.setScalar(1); dummy.updateMatrix();
    bulbs.setMatrixAt(i, dummy.matrix);
    bulbs.setColorAt(i, new THREE.Color('#fff'));
  });
  g.add(bulbs);
  const palette = ['#ffd23f', '#ff5fa2', '#31e1ff', '#7dff9a', '#ffffff'].map((c) => new THREE.Color(c));
  const off = new THREE.Color('#5a3a7a');
  const tmpC = new THREE.Color();
  let lightMode = 'idle';
  let lightColor = new THREE.Color('#ffd23f');

  // ---- gantry + claw ------------------------------------------------------
  const chrome = std('#e8eef5', { metalness: 0.95, roughness: 0.22 });
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 12), chrome);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(sx * 2.05, RAIL_Y + 0.12, 0);
    g.add(rail);
  }
  const bridge = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 4.2, 12), chrome);
  bar.rotation.z = Math.PI / 2;
  bridge.add(bar);
  bridge.position.y = RAIL_Y + 0.12;
  g.add(bridge);
  const carriage = rbox(0.5, 0.26, 0.42, 0.08, std(C.yellow, { roughness: 0.3 }));
  carriage.position.y = RAIL_Y + 0.05;
  g.add(carriage);

  const pendulum = new THREE.Group(); // pivots at the carriage, everything hangs from it
  pendulum.position.y = RAIL_Y - 0.08;
  g.add(pendulum);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 8), std('#3a3f55', { metalness: 0.6, roughness: 0.4 }));
  pendulum.add(cable);
  const head = new THREE.Group();
  pendulum.add(head);
  const hubTop = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 0.2, 24), std(C.pink, { roughness: 0.25 }));
  hubTop.position.y = 0.12;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 28), std(C.white, { roughness: 0.2 }));
  const hubRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 10, 28), std(C.teal, { emissive: C.teal, emissiveIntensity: 0.5, roughness: 0.2 }));
  hubRing.rotation.x = Math.PI / 2;
  [hubTop, hub, hubRing].forEach((m) => { m.castShadow = true; head.add(m); });
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
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), std(C.pink, { roughness: 0.3 }));
    tip.position.y = -0.35;
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), std(C.yellow, { roughness: 0.3 }));
    [upper, lower, tip, joint].forEach((m) => { m.castShadow = true; });
    knee.add(lower, tip, joint);
    pivot.add(upper, knee);
    yaw.add(pivot);
    head.add(yaw);
    fingers.push(pivot);
  }
  const holder = new THREE.Group(); // grabbed prize attaches here
  holder.position.y = -0.74;
  head.add(holder);

  const claw = {
    x: CLAW_HOME.x, z: CLAW_HOME.z, y: CLAW_IDLE_Y, open: 1,
    swayX: 0, swayZ: 0, vSwayX: 0, vSwayZ: 0, px: CLAW_HOME.x, pz: CLAW_HOME.z, jitter: 0,
    holder, head,
    worldPos(target = new THREE.Vector3()) { return head.getWorldPosition(target); },
  };

  const input = { x: 0, y: 0, pressed: false };

  function update(dt, t) {
    // pendulum sway driven by carriage acceleration
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
    button.position.y = THREE.MathUtils.damp(button.position.y, input.pressed ? -0.13 : -0.08, 20, dt);

    // bulbs
    for (let i = 0; i < bulbPos.length; i++) {
      let on = 0;
      if (lightMode === 'idle') on = (i + Math.floor(t * 6)) % 3 === 0 ? 1 : 0.15;
      else if (lightMode === 'play') on = 0.55 + 0.45 * Math.sin(t * 5 + i * 0.7);
      else if (lightMode === 'shuffle') on = (i + Math.floor(t * 22)) % 4 === 0 ? 1 : 0.1;
      else if (lightMode === 'win') on = Math.floor(t * 10 + (i % 2)) % 2 ? 1 : 0.1;
      else if (lightMode === 'lose') on = 0.18;
      const base = lightMode === 'win' ? lightColor : palette[(i + (lightMode === 'idle' ? 0 : Math.floor(t * 2))) % palette.length];
      tmpC.copy(off).lerp(base, on);
      if (on > 0.5) tmpC.multiplyScalar(1.35);
      bulbs.setColorAt(i, tmpC);
    }
    bulbs.instanceColor.needsUpdate = true;
    void marqueeBulbs;
  }

  return {
    group: g, claw, input, update,
    setLights(mode, color) { lightMode = mode; if (color) lightColor = new THREE.Color(color); },
  };
}
