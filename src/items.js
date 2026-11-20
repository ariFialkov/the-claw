// Procedural prize models. Everything is built from rounded primitives so the
// game ships with zero binary assets.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const matCache = new Map();
function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.0, ...o }));
  }
  return matCache.get(key);
}
const metal = (color) => mat(color, { metalness: 0.9, roughness: 0.25 });

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
const rbox = (w, h, d, r, material, x, y, z) =>
  mesh(new RoundedBoxGeometry(w, h, d, 5, Math.min(r, w / 2, h / 2, d / 2) * 0.999), material, x, y, z);
const cyl = (r, h, material, x, y, z, seg = 36) => mesh(new THREE.CylinderGeometry(r, r, h, seg), material, x, y, z);
const ball = (r, material, x, y, z) => mesh(new THREE.SphereGeometry(r, 28, 18), material, x, y, z);

const texCache = new Map();
function canvasTex(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}
const FONT = '"Fredoka Variable", "Fredoka", system-ui, sans-serif';

// ---- shared plush builder ----------------------------------------------------
const fur = (c) => mat(c, { roughness: 0.85 });
const eyeMat = () => mat('#1a1320', { roughness: 0.1 });
function sball(material, x, y, z, sx, sy, sz) {
  const m = ball(1, material, x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}
function face(g, { y = 0.53, z = 0.185, dx = 0.075, cheeks = '#ff9db5' } = {}) {
  for (const s of [-1, 1]) {
    g.add(ball(0.022, eyeMat(), s * dx, y, z));
    g.add(ball(0.008, mat('#ffffff'), s * dx + 0.008, y + 0.009, z + 0.018));
    if (cheeks) g.add(sball(mat(cheeks, { roughness: 0.8 }), s * (dx + 0.05), y - 0.065, z - 0.03, 0.03, 0.02, 0.012));
  }
}
function plush({ body, belly, ear, earColor, earInner, snout, nose = '#3b2a2a', limbs, feet, patches, beak, tail, bow, scale = 1, cheeks }) {
  const g = new THREE.Group();
  limbs = limbs ?? body;
  g.add(sball(fur(body), 0, 0.2, 0, 0.2, 0.21, 0.18));
  if (belly) g.add(sball(fur(belly), 0, 0.19, 0.05, 0.14, 0.16, 0.15));
  g.add(sball(fur(body === '#22263a' && belly ? body : (patches ? '#ffffff' : body)), 0, 0.5, 0.02, 0.205, 0.18, 0.18));
  for (const s of [-1, 1]) {
    const arm = sball(fur(limbs), s * 0.2, 0.25, 0.04, 0.07, 0.11, 0.07);
    arm.rotation.z = s * 0.5;
    g.add(arm);
    g.add(sball(fur(feet ?? limbs), s * 0.12, 0.04, 0.1, 0.085, 0.07, 0.11));
    const ec = fur(earColor ?? body);
    if (ear === 'round') {
      g.add(ball(0.075, ec, s * 0.15, 0.65, 0));
      if (earInner) g.add(ball(0.045, fur(earInner), s * 0.15, 0.65, 0.04));
    } else if (ear === 'long') {
      const e = sball(ec, s * 0.085, 0.8, 0, 0.05, 0.17, 0.035);
      e.rotation.z = -s * 0.16;
      g.add(e);
      const i = sball(fur(earInner ?? '#ffb3cf'), s * 0.085, 0.8, 0.02, 0.028, 0.13, 0.025);
      i.rotation.z = -s * 0.16;
      g.add(i);
    } else if (ear === 'pointy') {
      const e = mesh(new THREE.ConeGeometry(0.075, 0.13, 16), ec, s * 0.13, 0.69, 0);
      e.rotation.z = -s * 0.35;
      g.add(e);
    }
    if (patches) {
      const p = sball(fur(patches), s * 0.078, 0.53, 0.165, 0.05, 0.06, 0.03);
      p.rotation.z = s * 0.4;
      g.add(p);
    }
  }
  face(g, { z: patches ? 0.195 : 0.185, cheeks });
  if (snout) {
    g.add(sball(fur(snout), 0, 0.455, 0.165, 0.075, 0.055, 0.055));
    g.add(sball(mat(nose, { roughness: 0.3 }), 0, 0.475, 0.215, 0.024, 0.018, 0.016));
  } else if (beak) {
    const b = mesh(new THREE.ConeGeometry(0.04, 0.08, 14), mat(beak, { roughness: 0.4 }), 0, 0.465, 0.225);
    b.rotation.x = Math.PI / 2;
    g.add(b);
  } else {
    g.add(sball(mat(nose, { roughness: 0.3 }), 0, 0.475, 0.195, 0.018, 0.013, 0.012));
  }
  if (tail) g.add(ball(0.055, fur(tail), 0, 0.12, -0.18));
  if (bow) {
    for (const s of [-1, 1]) {
      const w = mesh(new THREE.ConeGeometry(0.045, 0.08, 12), mat(bow, { roughness: 0.4 }), s * 0.055, 0.36, 0.165);
      w.rotation.z = s * Math.PI / 2;
      g.add(w);
    }
    g.add(ball(0.025, mat(bow, { roughness: 0.4 }), 0, 0.36, 0.17));
  }
  g.scale.setScalar(scale);
  g.userData.upright = true;
  return g;
}
const upright = (g) => { g.userData.upright = true; return g; };

// ---- builders (each returns an upright group, front facing +Z) -------------

const builders = {
  ball() {
    const g = new THREE.Group();
    g.add(ball(0.2, mat('#ff5fa2', { roughness: 0.2 })));
    const b1 = mesh(new THREE.TorusGeometry(0.19, 0.03, 10, 40), mat('#ffd23f', { roughness: 0.2 }));
    b1.rotation.x = Math.PI / 2.4;
    const b2 = mesh(new THREE.TorusGeometry(0.19, 0.03, 10, 40), mat('#31e1ff', { roughness: 0.2 }));
    b2.rotation.set(Math.PI / 2.4, 0, Math.PI / 2.2);
    g.add(b1, b2);
    return upright(g);
  },

  duck() {
    const g = new THREE.Group();
    const y = mat('#ffd23f', { roughness: 0.3 });
    g.add(sball(y, 0, 0.16, -0.02, 0.2, 0.16, 0.25));
    g.add(ball(0.14, y, 0, 0.36, 0.1));
    g.add(sball(mat('#ff8a1f', { roughness: 0.3 }), 0, 0.33, 0.24, 0.07, 0.03, 0.07));
    const t = mesh(new THREE.ConeGeometry(0.07, 0.14, 14), y, 0, 0.26, -0.24);
    t.rotation.x = -0.9;
    g.add(t);
    for (const s of [-1, 1]) {
      g.add(sball(y, s * 0.17, 0.18, -0.03, 0.05, 0.09, 0.15));
      g.add(ball(0.02, eyeMat(), s * 0.07, 0.4, 0.21));
    }
    return upright(g);
  },

  keychain() {
    const g = new THREE.Group();
    const silver = metal('#e5ebf2');
    g.add(mesh(new THREE.TorusGeometry(0.09, 0.012, 10, 32), silver, 0, 0.26, 0));
    g.add(mesh(new THREE.TorusGeometry(0.03, 0.008, 8, 20), silver, 0, 0.15, 0).rotateY(Math.PI / 2));
    g.add(mesh(new THREE.TorusGeometry(0.03, 0.008, 8, 20), silver, 0, 0.105, 0));
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.095 : 0.2, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    s.closePath();
    const star = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 4 }), mat('#ffcf33', { roughness: 0.25 }), 0, -0.12, -0.025);
    g.add(star);
    const f = new THREE.Group();
    face(f, { y: -0.11, z: 0.062, dx: 0.045, cheeks: '#ff8fb0' });
    g.add(f);
    return g;
  },

  capsule() {
    const g = new THREE.Group();
    const top = mesh(new THREE.SphereGeometry(0.2, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat('#e8fbff', { transparent: true, opacity: 0.4, roughness: 0.05 }));
    const bottom = mesh(new THREE.SphereGeometry(0.2, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#ff4d6d', { roughness: 0.25 }));
    const band = mesh(new THREE.TorusGeometry(0.2, 0.018, 10, 36), mat('#ffffff', { roughness: 0.3 }));
    band.rotation.x = Math.PI / 2;
    g.add(bottom, band, ball(0.085, mat('#ffd23f', { roughness: 0.3 }), 0, 0.06, 0), ball(0.05, mat('#31e1ff', { roughness: 0.3 }), 0.07, 0.04, 0.05), top);
    return upright(g);
  },

  yoyo() {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const d = sball(mat('#3b82f6', { roughness: 0.2 }), 0, 0, s * 0.06, 0.21, 0.21, 0.06);
      g.add(d);
      g.add(cyl(0.11, 0.02, mat('#ffd23f', { roughness: 0.25 }), 0, 0, s * 0.115).rotateX(Math.PI / 2));
      g.add(cyl(0.05, 0.022, mat('#ff4d6d', { roughness: 0.25 }), 0, 0, s * 0.12).rotateX(Math.PI / 2));
    }
    g.add(cyl(0.04, 0.1, metal('#e5ebf2'), 0, 0, 0).rotateX(Math.PI / 2));
    g.add(mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 20), mat('#ffffff'), 0, 0.27, 0));
    g.add(cyl(0.006, 0.1, mat('#ffffff'), 0, 0.2, 0, 6));
    return g;
  },

  spinner() {
    const g = new THREE.Group();
    const bodyM = mat('#14b8a6', { roughness: 0.25 });
    const hubM = metal('#e5ebf2');
    g.add(cyl(0.11, 0.06, bodyM).rotateX(Math.PI / 2));
    g.add(cyl(0.06, 0.09, hubM).rotateX(Math.PI / 2));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
      const x = Math.cos(a) * 0.19, y = Math.sin(a) * 0.19;
      g.add(cyl(0.1, 0.06, bodyM, x, y, 0).rotateX(Math.PI / 2));
      g.add(cyl(0.055, 0.07, mat('#ffd23f', { metalness: 0.6, roughness: 0.25 }), x, y, 0).rotateX(Math.PI / 2));
      const arm = rbox(0.12, 0.2, 0.058, 0.02, bodyM, x / 2, y / 2, 0);
      arm.rotation.z = a - Math.PI / 2;
      g.add(arm);
    }
    return g;
  },

  car() {
    const g = new THREE.Group();
    g.add(rbox(0.3, 0.12, 0.6, 0.05, mat('#ef4444', { roughness: 0.2, metalness: 0.3 }), 0, 0.14, 0));
    g.add(rbox(0.26, 0.12, 0.3, 0.05, mat('#bfe9ff', { roughness: 0.1, metalness: 0.4 }), 0, 0.24, -0.03));
    g.add(rbox(0.265, 0.03, 0.25, 0.012, mat('#ef4444', { roughness: 0.2, metalness: 0.3 }), 0, 0.3, -0.03));
    g.add(rbox(0.1, 0.02, 0.61, 0.008, mat('#ffffff', { roughness: 0.3 }), 0, 0.195, 0));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        g.add(cyl(0.075, 0.06, mat('#1f2937', { roughness: 0.7 }), sx * 0.15, 0.075, sz * 0.18).rotateZ(Math.PI / 2));
        g.add(cyl(0.035, 0.065, metal('#e5ebf2'), sx * 0.15, 0.075, sz * 0.18).rotateZ(Math.PI / 2));
      }
      g.add(ball(0.03, mat('#fff7c2', { emissive: '#fff2a0', emissiveIntensity: 0.6 }), sx * 0.1, 0.15, 0.295));
    }
    return upright(g);
  },

  cube() {
    const cols = ['#ef4444', '#f97316', '#ffffff', '#ffd23f', '#22c55e', '#3b82f6'];
    const mats = cols.map((c0, f) => {
      const t = canvasTex('cube' + f, 192, 192, (c) => {
        c.fillStyle = '#15161c'; c.fillRect(0, 0, 192, 192);
        for (let i = 0; i < 9; i++) {
          c.fillStyle = (i * 7 + f * 3) % 5 === 0 ? cols[(f + 2) % 6] : c0;
          c.beginPath(); c.roundRect(8 + (i % 3) * 61, 8 + Math.floor(i / 3) * 61, 54, 54, 10); c.fill();
        }
      });
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.3 });
    });
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), mats));
    return upright(g);
  },

  chick: () => plush({ body: '#ffe066', beak: '#ff8a1f', feet: '#ff8a1f', scale: 0.72 }),
  penguin: () => plush({ body: '#22263a', belly: '#ffffff', beak: '#ff9f1c', feet: '#ff9f1c', scale: 0.82 }),
  teddy: () => plush({ body: '#b9783f', belly: '#e9c79a', ear: 'round', earInner: '#e9c79a', snout: '#f1d9b5', bow: '#ef4444', cheeks: null, scale: 0.92 }),
  bunny: () => plush({ body: '#fff5fa', ear: 'long', earInner: '#ffb3cf', nose: '#ff7aa8', tail: '#ffffff', bow: '#7dd3fc', scale: 0.88 }),
  cat: () => plush({ body: '#ffa94d', belly: '#fff1dc', ear: 'pointy', snout: '#fff1dc', nose: '#ff7aa8', tail: '#ffa94d', scale: 0.92 }),

  octopus() {
    const g = new THREE.Group();
    const p = fur('#ff7ab8');
    g.add(sball(p, 0, 0.3, 0, 0.25, 0.23, 0.24));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.39;
      const t = sball(p, Math.cos(a) * 0.2, 0.07, Math.sin(a) * 0.2, 0.075, 0.07, 0.11);
      t.rotation.y = -a + Math.PI / 2;
      g.add(t);
      g.add(ball(0.03, fur('#ffd0e6'), Math.cos(a) * 0.27, 0.035, Math.sin(a) * 0.27));
    }
    face(g, { y: 0.33, z: 0.225, dx: 0.085, cheeks: '#ffd0e6' });
    const smile = mesh(new THREE.TorusGeometry(0.03, 0.007, 6, 14, Math.PI), eyeMat(), 0, 0.29, 0.235);
    smile.rotation.z = Math.PI;
    g.add(smile);
    return upright(g);
  },

  dino() {
    const g = new THREE.Group();
    const gr = fur('#4ade80');
    g.add(sball(gr, 0, 0.2, -0.02, 0.18, 0.2, 0.2));
    g.add(sball(fur('#fff3b0'), 0, 0.18, 0.06, 0.12, 0.15, 0.14));
    g.add(sball(gr, 0, 0.47, 0.08, 0.15, 0.13, 0.19));
    const tail = mesh(new THREE.ConeGeometry(0.1, 0.32, 16), gr, 0, 0.12, -0.26);
    tail.rotation.x = -1.25;
    g.add(tail);
    for (let i = 0; i < 5; i++) {
      const s = mesh(new THREE.ConeGeometry(0.035, 0.08, 4), fur('#ff9f1c'), 0, 0.6 - i * 0.11 - (i > 1 ? 0.02 : 0), -0.02 - i * 0.065);
      s.rotation.x = -0.35 - i * 0.2;
      g.add(s);
    }
    for (const s of [-1, 1]) {
      g.add(sball(gr, s * 0.11, 0.05, 0.06, 0.08, 0.06, 0.11));
      g.add(sball(gr, s * 0.17, 0.27, 0.1, 0.045, 0.045, 0.08));
      g.add(ball(0.012, eyeMat(), s * 0.04, 0.47, 0.265));
    }
    face(g, { y: 0.52, z: 0.2, dx: 0.085 });
    return upright(g);
  },

  robot() {
    const g = new THREE.Group();
    const steel = mat('#8fb8ff', { metalness: 0.7, roughness: 0.3 });
    const dark = mat('#34406b', { metalness: 0.5, roughness: 0.4 });
    const glowC = mat('#5cf4ff', { emissive: '#5cf4ff', emissiveIntensity: 1.1 });
    g.add(rbox(0.3, 0.26, 0.2, 0.05, steel, 0, 0.26, 0));
    g.add(rbox(0.34, 0.24, 0.24, 0.06, steel, 0, 0.55, 0));
    g.add(rbox(0.26, 0.11, 0.02, 0.01, dark, 0, 0.56, 0.12));
    g.add(cyl(0.012, 0.1, dark, 0, 0.71, 0, 8));
    g.add(ball(0.03, mat('#ff4d6d', { emissive: '#ff4d6d', emissiveIntensity: 0.9 }), 0, 0.77, 0));
    g.add(rbox(0.14, 0.09, 0.02, 0.01, dark, 0, 0.27, 0.1));
    g.add(ball(0.022, mat('#ffd23f', { emissive: '#ffd23f', emissiveIntensity: 0.8 }), -0.03, 0.27, 0.11));
    g.add(ball(0.022, glowC, 0.03, 0.27, 0.11));
    for (const s of [-1, 1]) {
      g.add(ball(0.03, glowC, s * 0.065, 0.56, 0.125));
      g.add(rbox(0.07, 0.24, 0.08, 0.03, dark, s * 0.2, 0.25, 0));
      g.add(ball(0.045, steel, s * 0.2, 0.12, 0));
      g.add(rbox(0.1, 0.14, 0.12, 0.03, dark, s * 0.08, 0.07, 0.01));
      g.add(cyl(0.03, 0.05, dark, s * 0.19, 0.55, 0).rotateZ(Math.PI / 2));
    }
    return upright(g);
  },

  sunglasses() {
    const g = new THREE.Group();
    const gold = metal('#ffcf40');
    const lens = mat('#1b1035', { roughness: 0.05, metalness: 0.8 });
    for (const s of [-1, 1]) {
      g.add(rbox(0.25, 0.19, 0.03, 0.07, lens, s * 0.15, 0, 0));
      g.add(rbox(0.27, 0.035, 0.04, 0.015, gold, s * 0.15, 0.09, 0));
      const arm = rbox(0.025, 0.03, 0.36, 0.01, gold, s * 0.28, 0.07, -0.17);
      g.add(arm);
      g.add(rbox(0.07, 0.04, 0.025, 0.01, mat('#ff5fa2', { roughness: 0.2, transparent: true, opacity: 0.55 }), s * 0.11, 0.03, 0.017));
    }
    g.add(rbox(0.08, 0.03, 0.035, 0.012, gold, 0, 0.07, 0));
    return upright(g);
  },

  cap() {
    const g = new THREE.Group();
    const crown = mesh(new THREE.SphereGeometry(0.24, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat('#14b8a6', { roughness: 0.55 }), 0, 0, 0);
    crown.scale.set(1, 0.85, 1.05);
    g.add(crown);
    const front = mesh(new THREE.SphereGeometry(0.243, 32, 16, Math.PI * 0.25, Math.PI * 0.5, 0.25, Math.PI / 2 - 0.25), mat('#f8fafc', { roughness: 0.55 }), 0, 0, 0);
    front.scale.copy(crown.scale);
    g.add(front);
    const brim = cyl(0.23, 0.028, mat('#0f172a', { roughness: 0.5 }), 0, 0.014, 0.22);
    brim.scale.set(1, 1, 0.85);
    g.add(brim);
    g.add(ball(0.03, mat('#0f172a'), 0, 0.205, 0));
    g.add(cyl(0.06, 0.02, mat('#ffd23f', { roughness: 0.3 }), 0, 0.1, 0.235).rotateX(Math.PI / 2 - 0.35));
    g.userData.upright = true;
    return g;
  },

  sneakers() {
    const shoe = (x, col) => {
      const s = new THREE.Group();
      const up = mat(col, { roughness: 0.5 });
      const white = mat('#ffffff', { roughness: 0.4 });
      s.add(rbox(0.19, 0.06, 0.5, 0.028, white, 0, 0.03, 0));
      s.add(rbox(0.195, 0.02, 0.505, 0.008, mat('#ffd23f', { roughness: 0.3 }), 0, 0.045, 0));
      s.add(sball(up, 0, 0.1, 0.12, 0.088, 0.075, 0.13));
      s.add(sball(white, 0, 0.085, 0.205, 0.075, 0.05, 0.05));
      s.add(rbox(0.17, 0.2, 0.24, 0.06, up, 0, 0.15, -0.11));
      s.add(mesh(new THREE.TorusGeometry(0.065, 0.028, 10, 22), white, 0, 0.25, -0.12).rotateX(Math.PI / 2));
      for (let i = 0; i < 3; i++) s.add(rbox(0.1, 0.014, 0.022, 0.006, white, 0, 0.17 + i * 0.012, 0.085 - i * 0.05));
      for (const sd of [-1, 1]) s.add(rbox(0.008, 0.035, 0.2, 0.004, white, sd * 0.087, 0.12, -0.06).rotateX(0.35));
      s.position.x = x;
      return s;
    };
    const g = new THREE.Group();
    const a = shoe(-0.11, '#ff3d81');
    const b = shoe(0.11, '#ff3d81');
    b.position.z = -0.05; b.rotation.y = -0.15;
    g.add(a, b);
    return upright(g);
  },

  panda: () => plush({ body: '#ffffff', limbs: '#22232b', ear: 'round', earColor: '#22232b', patches: '#22232b', snout: '#ffffff', scale: 1.08 }),

  headphones() {
    const g = new THREE.Group();
    const shell = mat('#f8fafc', { roughness: 0.25 });
    const dark = mat('#1f2937', { roughness: 0.6 });
    g.add(mesh(new THREE.TorusGeometry(0.24, 0.032, 12, 40, Math.PI), shell, 0, 0, 0));
    g.add(mesh(new THREE.TorusGeometry(0.24, 0.04, 12, 20, Math.PI * 0.4), dark, 0, 0, 0).rotateZ(Math.PI * 0.3));
    for (const sx of [-1, 1]) {
      const cup = cyl(0.125, 0.09, shell, sx * 0.25, -0.06, 0);
      cup.rotation.z = Math.PI / 2;
      g.add(cup);
      const cushion = mesh(new THREE.TorusGeometry(0.085, 0.042, 12, 28), dark, sx * 0.195, -0.06, 0);
      cushion.rotation.y = Math.PI / 2;
      g.add(cushion);
      const ring = mesh(new THREE.TorusGeometry(0.075, 0.014, 8, 28), mat('#22d3ee', { emissive: '#22d3ee', emissiveIntensity: 0.9 }), sx * 0.297, -0.06, 0);
      ring.rotation.y = Math.PI / 2;
      g.add(ring);
    }
    return g;
  },

  controller() {
    const g = new THREE.Group();
    const shell = mat('#f8fafc', { roughness: 0.3 });
    const dark = mat('#1f2937', { roughness: 0.4 });
    g.add(rbox(0.5, 0.22, 0.09, 0.045, shell, 0, 0.04, 0));
    for (const s of [-1, 1]) {
      const grip = sball(shell, s * 0.21, -0.08, 0, 0.085, 0.15, 0.055);
      grip.rotation.z = s * 0.3;
      g.add(grip);
      g.add(cyl(0.045, 0.03, dark, s * 0.09, -0.02, 0.05).rotateX(Math.PI / 2));
      g.add(cyl(0.03, 0.05, mat('#374151', { roughness: 0.6 }), s * 0.09, -0.02, 0.06).rotateX(Math.PI / 2));
    }
    g.add(rbox(0.09, 0.03, 0.02, 0.008, dark, -0.17, 0.07, 0.048));
    g.add(rbox(0.03, 0.09, 0.02, 0.008, dark, -0.17, 0.07, 0.048));
    [['#ef4444', 0.035, 0], ['#3b82f6', -0.035, 0], ['#22c55e', 0, -0.035], ['#ffd23f', 0, 0.035]].forEach(([c, dx, dy]) => {
      g.add(cyl(0.02, 0.02, mat(c, { roughness: 0.2, emissive: c, emissiveIntensity: 0.3 }), 0.17 + dx, 0.07 + dy, 0.05).rotateX(Math.PI / 2));
    });
    g.add(rbox(0.06, 0.02, 0.015, 0.006, mat('#5cf4ff', { emissive: '#5cf4ff', emissiveIntensity: 1 }), 0, 0.1, 0.045));
    return g;
  },

  watch() {
    const g = new THREE.Group();
    const strap = mat('#ff7a59', { roughness: 0.6 });
    g.add(rbox(0.17, 0.26, 0.03, 0.014, strap, 0, 0.21, -0.005));
    g.add(rbox(0.17, 0.26, 0.03, 0.014, strap, 0, -0.21, -0.005));
    for (let i = 0; i < 3; i++) g.add(cyl(0.012, 0.035, mat('#c2410c'), 0, -0.2 - i * 0.045, 0).rotateX(Math.PI / 2));
    g.add(rbox(0.25, 0.29, 0.08, 0.06, metal('#e5ebf2'), 0, 0, 0));
    const t = canvasTex('watch', 256, 300, (c, w, h) => {
      c.fillStyle = '#0b0b14'; c.beginPath(); c.roundRect(0, 0, w, h, 50); c.fill();
      c.textAlign = 'center';
      c.fillStyle = '#fff'; c.font = `700 92px ${FONT}`; c.fillText('10:09', w / 2, 150);
      c.strokeStyle = '#ff4d6d'; c.lineWidth = 16; c.lineCap = 'round';
      c.beginPath(); c.arc(70, 225, 30, -1.57, 2.6); c.stroke();
      c.strokeStyle = '#4ade80'; c.beginPath(); c.arc(128, 225, 30, -1.57, 1.4); c.stroke();
      c.strokeStyle = '#38bdf8'; c.beginPath(); c.arc(186, 225, 30, -1.57, 3.6); c.stroke();
    });
    const s = mesh(new THREE.PlaneGeometry(0.21, 0.25), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 0.8, roughness: 0.1 }), 0, 0, 0.0405);
    s.castShadow = false;
    g.add(s);
    g.add(cyl(0.022, 0.03, metal('#ffcf40'), 0.135, 0.04, 0).rotateZ(Math.PI / 2));
    return g;
  },

  console() {
    const g = new THREE.Group();
    g.add(rbox(0.4, 0.3, 0.045, 0.02, mat('#20222b', { roughness: 0.3, metalness: 0.4 }), 0, 0, 0));
    g.add(rbox(0.13, 0.3, 0.05, 0.045, mat('#22d3ee', { roughness: 0.3 }), -0.25, 0, 0));
    g.add(rbox(0.13, 0.3, 0.05, 0.045, mat('#ff9f1c', { roughness: 0.3 }), 0.25, 0, 0));
    const t = canvasTex('console', 256, 180, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#60a5fa'); gr.addColorStop(0.6, '#a7f3d0'); gr.addColorStop(0.61, '#22c55e'); gr.addColorStop(1, '#15803d');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(60, 40, 16, 0, 7); c.arc(82, 44, 20, 0, 7); c.arc(106, 42, 14, 0, 7); c.fill();
      c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(200, 36, 18, 0, 7); c.fill();
      c.fillStyle = '#ef4444'; c.beginPath(); c.roundRect(110, 78, 34, 34, 8); c.fill();
      c.fillStyle = '#ffd23f'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(170 + i * 26, 84, 8, 0, 7); c.fill(); }
    });
    const s = mesh(new THREE.PlaneGeometry(0.36, 0.25), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 0.75, roughness: 0.1 }), 0, 0, 0.0235);
    s.castShadow = false;
    g.add(s);
    const dark = mat('#1f2937', { roughness: 0.4 });
    g.add(cyl(0.032, 0.03, dark, -0.25, 0.07, 0.03).rotateX(Math.PI / 2));
    g.add(rbox(0.07, 0.024, 0.015, 0.006, dark, -0.25, -0.05, 0.028));
    g.add(rbox(0.024, 0.07, 0.015, 0.006, dark, -0.25, -0.05, 0.028));
    g.add(cyl(0.032, 0.03, dark, 0.25, -0.06, 0.03).rotateX(Math.PI / 2));
    for (const [dx, dy] of [[0.028, 0], [-0.028, 0], [0, 0.028], [0, -0.028]]) g.add(cyl(0.014, 0.015, dark, 0.25 + dx, 0.06 + dy, 0.028).rotateX(Math.PI / 2));
    return g;
  },

  phone() {
    const g = new THREE.Group();
    g.add(rbox(0.3, 0.6, 0.036, 0.045, mat('#20222b', { metalness: 0.6, roughness: 0.25 }), 0, 0, 0));
    const screen = canvasTex('phone', 256, 512, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, '#ff5fa2'); gr.addColorStop(0.5, '#8b5cf6'); gr.addColorStop(1, '#22d3ee');
      c.fillStyle = gr; c.beginPath(); c.roundRect(0, 0, w, h, 34); c.fill();
      c.fillStyle = '#fff'; c.font = `600 64px ${FONT}`; c.textAlign = 'center'; c.fillText('9:41', w / 2, 120);
      const cols = ['#fff', '#ffd23f', '#4ade80', '#fb7185', '#38bdf8', '#fff', '#fbbf24', '#a7f3d0'];
      for (let i = 0; i < 8; i++) {
        c.fillStyle = cols[i]; c.globalAlpha = 0.92;
        c.beginPath(); c.roundRect(26 + (i % 4) * 54, 330 + Math.floor(i / 4) * 62, 42, 42, 12); c.fill();
      }
      c.globalAlpha = 1;
      c.fillStyle = '#111'; c.beginPath(); c.roundRect(w / 2 - 34, 14, 68, 20, 10); c.fill();
    });
    const s = mesh(new THREE.PlaneGeometry(0.272, 0.572), new THREE.MeshStandardMaterial({ map: screen, emissiveMap: screen, emissive: '#ffffff', emissiveIntensity: 0.75, roughness: 0.1 }), 0, 0, 0.0185);
    s.castShadow = false;
    g.add(s);
    g.add(rbox(0.11, 0.11, 0.02, 0.02, mat('#2c2f3a', { metalness: 0.6, roughness: 0.25 }), -0.075, 0.22, -0.022));
    g.add(cyl(0.03, 0.02, mat('#0b0c10', { roughness: 0.1 }), -0.075, 0.22, -0.03).rotateX(Math.PI / 2));
    return g;
  },

  goldbar() {
    const g = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(-0.17, 0); s.lineTo(0.17, 0); s.lineTo(0.11, 0.15); s.lineTo(-0.11, 0.15); s.closePath();
    const gold = mat('#ffd23f', { metalness: 0.7, roughness: 0.28, emissive: '#a86a00', emissiveIntensity: 0.55 });
    const bar = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 4 }), gold, 0, 0, -0.25);
    g.add(bar);
    g.add(rbox(0.13, 0.012, 0.3, 0.005, mat('#e0a200', { metalness: 1, roughness: 0.35 }), 0, 0.172, 0));
    return upright(g);
  },

  crown() {
    const g = new THREE.Group();
    const gold = mat('#ffc531', { metalness: 1, roughness: 0.2, emissive: '#6b4300', emissiveIntensity: 0.35 });
    const gem = (c) => mat(c, { roughness: 0.05, metalness: 0.3, emissive: c, emissiveIntensity: 0.6 });
    g.add(mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.16, 36, 1, true), new THREE.MeshStandardMaterial({ color: '#ffc531', metalness: 1, roughness: 0.2, side: THREE.DoubleSide, emissive: '#6b4300', emissiveIntensity: 0.35 }), 0, 0.08, 0));
    g.add(mesh(new THREE.TorusGeometry(0.212, 0.022, 10, 36), gold, 0, 0.01, 0).rotateX(Math.PI / 2));
    g.add(mesh(new THREE.TorusGeometry(0.24, 0.018, 10, 36), gold, 0, 0.16, 0).rotateX(Math.PI / 2));
    g.add(sball(mat('#b91c4a', { roughness: 0.8 }), 0, 0.14, 0, 0.2, 0.13, 0.2));
    const gems = ['#ff2d55', '#31c4ff', '#4ade80', '#c084fc', '#ff2d55', '#31c4ff'];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 2;
      const x = Math.cos(a), z = Math.sin(a);
      const sp = mesh(new THREE.ConeGeometry(0.06, 0.2, 4), gold, x * 0.235, 0.26, z * 0.235);
      sp.rotation.y = -a;
      g.add(sp);
      g.add(ball(0.032, gem(gems[i]), x * 0.235, 0.375, z * 0.235));
      g.add(ball(0.028, gem(gems[(i + 1) % 6]), Math.cos(a + 0.52) * 0.232, 0.085, Math.sin(a + 0.52) * 0.232));
    }
    return upright(g);
  },

  ring() {
    const g = new THREE.Group();
    const gold = mat('#ffc531', { metalness: 1, roughness: 0.18, emissive: '#6b4300', emissiveIntensity: 0.35 });
    g.add(mesh(new THREE.TorusGeometry(0.17, 0.032, 14, 44), gold, 0, 0, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.075, 0.045, 0.06, 6), gold, 0, 0.2, 0));
    const dia = new THREE.MeshPhysicalMaterial({ color: '#e9fbff', roughness: 0.02, metalness: 0.1, emissive: '#7fe3ff', emissiveIntensity: 0.55, flatShading: true, clearcoat: 1 });
    g.add(mesh(new THREE.CylinderGeometry(0.075, 0.15, 0.07, 8), dia, 0, 0.385, 0));
    const pav = mesh(new THREE.ConeGeometry(0.15, 0.15, 8), dia, 0, 0.275, 0);
    pav.rotation.x = Math.PI;
    g.add(pav);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const p = cyl(0.012, 0.15, gold, Math.cos(a) * 0.1, 0.28, Math.sin(a) * 0.1, 8);
      p.rotation.z = -Math.cos(a) * 0.45; p.rotation.x = Math.sin(a) * 0.45;
      g.add(p);
    }
    return upright(g);
  },
};

const PILE_SCALE = 1.15;

const templates = new Map();
const liteMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 });

// Build a prize once, then bake it down to one geometry per material so every
// copy in the pile costs a handful of draw calls instead of dozens.
function template(id, pose) {
  const key = id + ':' + pose;
  if (templates.has(key)) return templates.get(key);
  const model = builders[id]();
  const mid = new THREE.Group();
  mid.add(model);
  if (pose === 'pile') mid.scale.setScalar(PILE_SCALE);
  if (pose === 'pile' && !model.userData.upright) mid.rotation.x = -Math.PI / 2;
  const box = new THREE.Box3().setFromObject(mid);
  const c = box.getCenter(new THREE.Vector3());
  mid.position.set(-c.x, pose === 'pile' ? -box.min.y : -c.y, -c.z);
  mid.updateMatrixWorld(true);
  const size = box.getSize(new THREE.Vector3());

  const byMat = new Map();
  const parts = [];
  mid.traverse((m) => {
    if (!m.isMesh) return;
    let geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    geo.applyMatrix4(m.matrixWorld);
    if (Array.isArray(m.material)) { parts.push({ geo, mat: m.material }); return; }
    for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
    geo.clearGroups();
    if (!byMat.has(m.material)) byMat.set(m.material, []);
    byMat.get(m.material).push(geo);
  });
  const col = new THREE.Color();
  const liteGeos = [];
  for (const [mat, geos] of byMat) {
    const merged = mergeGeometries(geos, false);
    parts.push({ geo: merged, mat });
    if (mat.transparent) continue;
    const lg = merged.clone();
    col.copy(mat.color);
    if (mat.emissive && mat.emissiveIntensity > 0.5 && !mat.emissiveMap) col.lerp(mat.emissive, 0.5);
    const n = lg.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    lg.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    liteGeos.push(lg);
  }
  const t = { parts, lite: liteGeos.length ? mergeGeometries(liteGeos, false) : null, height: size.y, radius: Math.max(size.x, size.z) / 2 };
  templates.set(key, t);
  return t;
}

/** Ids that still read well as a flat-coloured background copy. */
export const LITE_IDS = Object.keys(builders).filter((id) => !['cube', 'phone', 'console', 'watch', 'capsule'].includes(id));

/**
 * Create a prize model.
 * pose 'pile': lying in the bin, origin at its resting contact point.
 * pose 'show': upright and centred.
 * lite: single-mesh, flat-coloured copy used for the deep filler layers.
 */
export function createItem(id, pose = 'pile', lite = false) {
  const t = template(id, pose);
  const root = new THREE.Group();
  if (lite && t.lite) {
    const m = new THREE.Mesh(t.lite, liteMat);
    m.receiveShadow = true;
    root.add(m);
  } else {
    for (const part of t.parts) {
      const m = new THREE.Mesh(part.geo, part.mat);
      m.castShadow = true;
      m.receiveShadow = true;
      root.add(m);
    }
  }
  root.userData = { id, height: t.height, radius: t.radius };
  return root;
}
