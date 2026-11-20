// The arcade room behind the claw machine: back wall, carpet and a row of
// deliberately muted neighbouring machines so the claw machine stays the star.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const FLOOR_Y = -2.8;
const WALL_Z = -2.02;
const HAZE = new THREE.Color('#35208f'); // everything in the background is pulled toward this

function tex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
// FADE: 0 = full colour, 1 = fully melted into the wall
const FADE = 0.62;
const muted = (color, amount = 0.55) => new THREE.Color(color).lerp(HAZE, 1 - (1 - amount) * (1 - FADE));
const body = (color, amount) => new THREE.MeshStandardMaterial({ color: muted(color, amount), roughness: 0.7 });
const glow = (map, strength = 0.5) => new THREE.MeshBasicMaterial({ map, color: new THREE.Color(strength, strength, strength * 1.1).multiplyScalar(0.6) });
function box(w, h, d, material, x, y, z, r = 0.12) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.99), material);
  m.position.set(x, y, z);
  return m;
}
function screenTex(seed, a, b) {
  return tex(128, 128, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, a); g.addColorStop(1, b);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    let s = seed;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 14; i++) {
      c.fillStyle = ['#ffffff', '#ffd23f', '#ff5fa2', '#5cf4ff'][i % 4];
      c.globalAlpha = 0.75;
      const k = 6 + rnd() * 12;
      c.fillRect(Math.floor(rnd() * 14) * 8 + 8, Math.floor(rnd() * 14) * 8 + 8, k, k);
    }
  });
}
function signTex(text, a, b) {
  return tex(256, 64, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, a); g.addColorStop(1, b);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff'; c.font = '700 40px "Fredoka Variable", system-ui, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, w / 2, h / 2 + 3);
  });
}

// ---- neighbouring machines (origin on the floor, back at z = 0) ---------------
function arcadeCabinet(color, accent, label, seed) {
  const g = new THREE.Group();
  const m = body(color), dark = body('#1b1240', 0.3);
  g.add(box(3.0, 3.3, 2.6, m, 0, 1.65, 1.3));
  g.add(box(3.1, 0.5, 1.2, body(accent), 0, 3.35, 2.2));
  g.add(box(3.0, 3.1, 1.9, m, 0, 4.9, 0.95));
  g.add(box(3.1, 1.0, 2.2, m, 0, 6.6, 1.1));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.2), glow(screenTex(seed, '#1b2a7a', '#0b0f33'), 0.6));
  screen.position.set(0, 4.9, 1.93); screen.rotation.x = -0.12;
  const marquee = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 0.7), glow(signTex(label, accent, color), 0.55));
  marquee.position.set(0, 6.6, 2.21);
  g.add(box(2.7, 2.5, 0.1, dark, 0, 4.9, 1.88), screen, marquee);
  for (const sx of [-0.7, 0.2, 0.75]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), body(sx < 0 ? '#ff3b5c' : '#ffd23f', 0.35));
    b.position.set(sx, 3.68, 2.35);
    g.add(b);
  }
  return g;
}
function gachaTower(color, seed) {
  const g = new THREE.Group();
  const m = body(color), cap = body('#ffffff', 0.6);
  const balls = ['#ff5fa2', '#ffd23f', '#5cf4ff', '#7dff9a', '#c084fc'];
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (const sx of [-0.85, 0.85]) for (const row of [0, 1]) {
    const y = row * 3.3;
    g.add(box(1.6, 1.5, 1.7, m, sx, y + 0.75, 0.85));
    g.add(box(0.5, 0.5, 0.1, body('#1b1240', 0.3), sx, y + 0.6, 1.72));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.78, 20, 14), new THREE.MeshStandardMaterial({ color: muted('#cfeaff', 0.4), transparent: true, opacity: 0.35, roughness: 0.15 }));
    dome.position.set(sx, y + 2.25, 0.85);
    g.add(dome, box(1.7, 0.22, 1.8, cap, sx, y + 1.55, 0.85, 0.08));
    for (let i = 0; i < 9; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), body(balls[Math.floor(rnd() * 5)], 0.4));
      b.position.set(sx + (rnd() - 0.5) * 0.9, y + 1.85 + rnd() * 0.45, 0.85 + (rnd() - 0.5) * 0.9);
      g.add(b);
    }
  }
  g.add(box(3.5, 0.3, 1.9, cap, 0, 6.42, 0.9, 0.1));
  return g;
}
function pinball(color, accent, seed) {
  const g = new THREE.Group();
  const m = body(color), leg = body('#cfd6e6', 0.6);
  const table = new THREE.Group();
  table.add(box(2.7, 0.7, 4.6, m, 0, 0, 0));
  const field = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 4.2), glow(screenTex(seed, '#3b1d8f', '#12205c'), 0.55));
  field.rotation.x = -Math.PI / 2; field.position.y = 0.36;
  table.add(field);
  table.position.set(0, 2.45, 2.9); table.rotation.x = 0.11;
  g.add(table);
  for (const sx of [-1.15, 1.15]) for (const z of [1.0, 4.8]) g.add(box(0.2, 2.3, 0.2, leg, sx, 1.15, z, 0.05));
  g.add(box(2.9, 2.6, 0.9, m, 0, 4.9, 0.45));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.2), glow(signTex('★ ★ ★', accent, color), 0.5));
  glass.position.set(0, 4.9, 0.91);
  g.add(glass);
  return g;
}

export function createRoom(scene) {
  const room = new THREE.Group();
  scene.add(room);
  scene.background = new THREE.Color('#2a1a78');

  // back wall
  const wallTex = tex(512, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2a1a78'); g.addColorStop(0.62, '#4a2bb5'); g.addColorStop(1, '#6a3fd6');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,.035)'; c.lineWidth = 26;
    for (let i = -h; i < w; i += 80) { c.beginPath(); c.moveTo(i, h); c.lineTo(i + h, 0); c.stroke(); }
  }, [6, 1]);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(90, 26), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 }));
  wall.position.set(0, FLOOR_Y + 13, WALL_Z);
  wall.receiveShadow = true;
  room.add(wall);
  // neon trim + skirting
  const neon = (y, color, hgt) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(90, hgt), new THREE.MeshBasicMaterial({ color }));
    m.position.set(0, y, WALL_Z + 0.02);
    room.add(m);
  };
  neon(8.3, new THREE.Color('#ff5fa2').multiplyScalar(0.75), 0.09);
  neon(8.6, new THREE.Color('#5cf4ff').multiplyScalar(0.55), 0.05);
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(90, 0.5, 0.12), new THREE.MeshStandardMaterial({ color: '#22145f', roughness: 0.6 }));
  skirt.position.set(0, FLOOR_Y + 0.25, WALL_Z + 0.06);
  room.add(skirt);

  // carpet
  const carpetTex = tex(256, 256, (c, w, h) => {
    c.fillStyle = '#2b1a70'; c.fillRect(0, 0, w, h);
    let s = 7;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const cols = ['#ff5fa2', '#ffd23f', '#5cf4ff', '#7dff9a', '#c084fc'];
    for (let i = 0; i < 46; i++) {
      c.save();
      c.translate(rnd() * w, rnd() * h); c.rotate(rnd() * 6.28);
      c.globalAlpha = 0.3; c.strokeStyle = c.fillStyle = cols[i % 5]; c.lineWidth = 3; c.lineCap = 'round';
      const k = i % 4;
      if (k === 0) { c.beginPath(); c.arc(0, 0, 5, 0, 7); c.fill(); }
      else if (k === 1) { c.beginPath(); c.moveTo(-8, 0); c.quadraticCurveTo(0, -9, 8, 0); c.stroke(); }
      else if (k === 2) { c.beginPath(); c.moveTo(0, -7); c.lineTo(6, 5); c.lineTo(-6, 5); c.closePath(); c.stroke(); }
      else { c.beginPath(); c.moveTo(-7, -3); c.lineTo(-2, 3); c.lineTo(3, -3); c.lineTo(8, 3); c.stroke(); }
      c.restore();
    }
  }, [14, 7]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 45), new THREE.MeshStandardMaterial({ map: carpetTex, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, FLOOR_Y, WALL_Z + 22.5);
  floor.receiveShadow = true;
  room.add(floor);

  // the row of neighbours
  const row = [
    [arcadeCabinet('#12b5a5', '#ffd23f', 'ARCADE', 11), -7.0, 0.9],
    [gachaTower('#ff7a3d', 5), 7.1, 0.92],
    [pinball('#7c3aed', '#ff5fa2', 23), -12.6, 0.95],
    [arcadeCabinet('#ff5fa2', '#5cf4ff', 'PLAY', 31), 12.6, 0.9],
    [gachaTower('#3b82f6', 17), -18.2, 0.92],
    [arcadeCabinet('#ffb020', '#ff3b5c', 'WIN', 47), 18.2, 0.9],
    [pinball('#12b5a5', '#ffd23f', 59), 23.8, 0.95],
    [arcadeCabinet('#7c3aed', '#7dff9a', 'GO', 71), -23.8, 0.9],
  ];
  for (const [m, x, s] of row) {
    m.position.set(x, FLOOR_Y, WALL_Z + 0.05);
    m.scale.setScalar(s);
    room.add(m);
  }
  return room;
}
