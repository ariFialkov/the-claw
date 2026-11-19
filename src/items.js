// Procedural prize models. Everything is built from rounded primitives so the
// game ships with zero binary assets.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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

// ---- builders (each returns an upright group, front facing +Z) -------------

const builders = {
  mints() {
    const g = new THREE.Group();
    g.add(cyl(0.24, 0.09, mat('#f8fafc'), 0, 0, 0));
    g.add(cyl(0.247, 0.05, mat('#2dd4bf', { roughness: 0.25 }), 0, 0.06, 0));
    const t = canvasTex('mints', 256, 256, (c, w) => {
      c.fillStyle = '#eafffb'; c.beginPath(); c.arc(w / 2, w / 2, w / 2, 0, 7); c.fill();
      c.strokeStyle = '#2dd4bf'; c.lineWidth = 14; c.beginPath(); c.arc(w / 2, w / 2, w / 2 - 22, 0, 7); c.stroke();
      c.fillStyle = '#0f766e'; c.font = `700 62px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('MINTS', w / 2, w / 2 + 4);
    });
    const top = mesh(new THREE.CircleGeometry(0.2, 40), mat('#ffffff', { map: t }), 0, 0.087, 0);
    top.rotation.x = -Math.PI / 2;
    g.add(top);
    g.rotation.x = Math.PI / 2; // face the lid forward when upright
    const w = new THREE.Group(); w.add(g);
    return w;
  },

  chips() {
    const g = new THREE.Group();
    g.add(rbox(0.4, 0.56, 0.15, 0.075, mat('#ffd23f', { roughness: 0.3 }), 0, 0, 0));
    const oval = ball(1, mat('#ff4d4d', { roughness: 0.3 }), 0, 0.03, 0);
    oval.scale.set(0.15, 0.13, 0.083);
    const dot = ball(1, mat('#fff7d6'), 0, 0.03, 0);
    dot.scale.set(0.08, 0.06, 0.088);
    g.add(oval, dot);
    g.add(rbox(0.3, 0.05, 0.152, 0.02, mat('#ff8a00', { roughness: 0.3 }), 0, -0.17, 0));
    g.add(rbox(0.4, 0.07, 0.025, 0.012, mat('#ffb703'), 0, 0.3, 0));
    g.add(rbox(0.4, 0.07, 0.025, 0.012, mat('#ffb703'), 0, -0.3, 0));
    return g;
  },

  chocolate() {
    const g = new THREE.Group();
    const choc = mat('#6b3a1e', { roughness: 0.35 });
    g.add(rbox(0.3, 0.3, 0.06, 0.02, choc, 0, 0.13, 0));
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      g.add(rbox(0.12, 0.12, 0.03, 0.012, choc, -0.07 + i * 0.14, 0.08 + j * 0.14, 0.035));
    }
    g.add(rbox(0.33, 0.34, 0.085, 0.025, mat('#7c3aed', { roughness: 0.3 }), 0, -0.12, 0));
    g.add(rbox(0.335, 0.05, 0.09, 0.02, metal('#ffd76a'), 0, 0.05, 0));
    g.add(rbox(0.2, 0.09, 0.09, 0.02, mat('#f5e9ff'), 0, -0.14, 0.002));
    return g;
  },

  soda() {
    const g = new THREE.Group();
    g.add(cyl(0.15, 0.4, mat('#ff3b5c', { roughness: 0.2, metalness: 0.35 }), 0, 0, 0));
    g.add(cyl(0.152, 0.11, mat('#ffffff', { roughness: 0.25 }), 0, 0.02, 0));
    g.add(cyl(0.154, 0.03, mat('#31c4ff', { roughness: 0.25 }), 0, 0.02, 0));
    const silver = metal('#dfe6ee');
    g.add(mesh(new THREE.CylinderGeometry(0.125, 0.15, 0.04, 36), silver, 0, 0.22, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.04, 36), silver, 0, -0.22, 0));
    g.add(rbox(0.05, 0.012, 0.09, 0.005, silver, 0, 0.245, 0.02));
    return g;
  },

  gummies() {
    const g = new THREE.Group();
    const pairs = [['#ff4d6d', '#ffd23f'], ['#4ade80', '#ff8a3d'], ['#38bdf8', '#ff5fa2']];
    pairs.forEach(([a, b], i) => {
      const pts = [];
      const ph = i * 2.1;
      for (let k = 0; k <= 8; k++) {
        const t = k / 8;
        pts.push(new THREE.Vector3((t - 0.5) * 0.58, Math.sin(t * 6 + ph) * 0.07 + (i - 1) * 0.11, Math.cos(t * 5 + ph) * 0.03 + i * 0.035));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const all = curve.getPoints(40);
      const h1 = new THREE.CatmullRomCurve3(all.slice(0, 21));
      const h2 = new THREE.CatmullRomCurve3(all.slice(20));
      const o = { roughness: 0.15, transparent: true, opacity: 0.93 };
      g.add(mesh(new THREE.TubeGeometry(h1, 20, 0.048, 10), mat(a, o)));
      g.add(mesh(new THREE.TubeGeometry(h2, 20, 0.048, 10), mat(b, o)));
      g.add(ball(0.048, mat(a, o), all[0].x, all[0].y, all[0].z));
      g.add(ball(0.048, mat(b, o), all[40].x, all[40].y, all[40].z));
    });
    return g;
  },

  cards() {
    const g = new THREE.Group();
    const face = canvasTex('card', 256, 360, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, '#1d4ed8'); gr.addColorStop(1, '#22d3ee');
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
      c.fillStyle = gr; c.beginPath(); c.roundRect(16, 16, w - 32, h - 32, 18); c.fill();
      c.fillStyle = '#e0f2fe'; c.beginPath(); c.ellipse(w / 2, 290, 90, 26, 0, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2, 110, 34, 0, 7); c.fill(); // helmet
      c.fillStyle = '#ef4444'; c.beginPath(); c.roundRect(w / 2 - 46, 146, 92, 104, 22); c.fill(); // jersey
      c.fillStyle = '#fff'; c.font = `700 54px ${FONT}`; c.textAlign = 'center'; c.fillText('9', w / 2, 218);
      c.strokeStyle = '#111827'; c.lineWidth = 10; c.lineCap = 'round';
      c.beginPath(); c.moveTo(196, 130); c.lineTo(168, 280); c.lineTo(206, 290); c.stroke(); // stick
      c.fillStyle = '#111827'; c.beginPath(); c.ellipse(70, 292, 16, 7, 0, 0, 7); c.fill(); // puck
      c.fillStyle = '#ffd23f'; c.font = `700 30px ${FONT}`; c.fillText('★ ROOKIE ★', w / 2, 58);
    });
    const colors = ['#fde68a', '#fca5a5', '#ffffff'];
    colors.forEach((col, i) => {
      const card = rbox(0.3, 0.42, 0.012, 0.006, mat(col, { roughness: 0.3 }), (i - 1) * 0.035, (i - 1) * 0.01, i * 0.014);
      card.rotation.z = (1 - i) * 0.16;
      g.add(card);
      if (i === 2) {
        const f = mesh(new THREE.PlaneGeometry(0.28, 0.4), mat('#ffffff', { map: face, roughness: 0.25 }), 0, 0, 0.0065);
        f.castShadow = false;
        card.add(f);
      }
    });
    return g;
  },

  mask() {
    const g = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(-0.3, 0.02);
    s.bezierCurveTo(-0.3, 0.16, -0.08, 0.16, 0, 0.1);
    s.bezierCurveTo(0.08, 0.16, 0.3, 0.16, 0.3, 0.02);
    s.bezierCurveTo(0.3, -0.14, 0.1, -0.15, 0.04, -0.06);
    s.bezierCurveTo(0.02, -0.03, -0.02, -0.03, -0.04, -0.06);
    s.bezierCurveTo(-0.1, -0.15, -0.3, -0.14, -0.3, 0.02);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.03, bevelSegments: 5, curveSegments: 24 });
    g.add(mesh(geo, mat('#4f46e5', { roughness: 0.28 }), 0, 0, -0.015));
    for (const sx of [-1, 1]) {
      const lash = mesh(new THREE.TorusGeometry(0.07, 0.011, 8, 20, Math.PI), mat('#fef3c7'), sx * 0.15, 0.03, 0.05);
      lash.rotation.z = Math.PI;
      g.add(lash);
      g.add(ball(0.03, mat('#f9a8d4'), sx * 0.24, -0.05, 0.035));
    }
    const strap = mesh(new THREE.TorusGeometry(0.29, 0.016, 8, 40, Math.PI), mat('#1e1b4b'), 0, 0.02, -0.01);
    strap.rotation.x = -Math.PI / 2;
    strap.scale.set(1, 0.55, 1);
    g.add(strap);
    return g;
  },

  hat() {
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

  pillow() {
    const g = new THREE.Group();
    const arc = Math.PI * 1.55;
    const m = mat('#a78bfa', { roughness: 0.7 });
    const t = mesh(new THREE.TorusGeometry(0.2, 0.1, 18, 40, arc), m);
    t.rotation.z = Math.PI / 2 + (Math.PI * 2 - arc) / 2;
    g.add(t);
    for (const s of [0, 1]) {
      const a = t.rotation.z + s * arc;
      g.add(ball(0.1, m, Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0));
    }
    const piping = mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 40, arc), mat('#f5f3ff'), 0, 0, 0.1);
    piping.rotation.z = t.rotation.z;
    g.add(piping);
    g.add(ball(0.025, metal('#ffd76a'), 0.085, -0.19, 0.07));
    return g;
  },

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

  keys() {
    const g = new THREE.Group();
    const gold = metal('#ffcf40');
    const silver = metal('#e5ebf2');
    g.add(rbox(0.24, 0.36, 0.085, 0.06, mat('#16181f', { roughness: 0.18, metalness: 0.3 }), 0, -0.12, 0));
    g.add(rbox(0.25, 0.03, 0.09, 0.012, mat('#e11d48', { roughness: 0.25 }), 0, -0.02, 0));
    g.add(cyl(0.055, 0.02, mat('#e11d48', { roughness: 0.2, emissive: '#e11d48', emissiveIntensity: 0.35 }), 0, 0.01 - 0.0, 0.04).rotateX(Math.PI / 2));
    g.add(cyl(0.03, 0.022, gold, 0, 0.01, 0.042).rotateX(Math.PI / 2));
    for (let i = 0; i < 3; i++) g.add(rbox(0.13, 0.05, 0.02, 0.02, mat('#3a3f4d', { roughness: 0.4 }), 0, -0.1 - i * 0.075, 0.04));
    g.add(mesh(new THREE.TorusGeometry(0.1, 0.014, 10, 36), gold, 0, 0.16, 0));
    const blade = new THREE.Group();
    blade.add(rbox(0.06, 0.3, 0.016, 0.008, silver, 0, -0.15, 0));
    blade.add(rbox(0.03, 0.05, 0.016, 0.006, silver, 0.035, -0.2, 0));
    blade.add(rbox(0.03, 0.04, 0.016, 0.006, silver, 0.035, -0.11, 0));
    blade.position.set(0.02, 0.26, 0.02);
    blade.rotation.z = -2.2;
    g.add(blade);
    const tag = rbox(0.12, 0.16, 0.02, 0.03, mat('#ffd23f', { roughness: 0.3 }), -0.14, 0.05, 0.03);
    tag.rotation.z = 0.7;
    g.add(tag);
    return g;
  },
};

const PILE_SCALE = 1.15;

/**
 * Create a prize model.
 * pose 'pile': lying in the bin, origin at its resting contact point.
 * pose 'show': upright and centred, for the win showcase.
 */
export function createItem(id, pose = 'pile') {
  const model = builders[id]();
  const root = new THREE.Group();
  const mid = new THREE.Group();
  mid.add(model);
  if (pose === 'pile') mid.scale.setScalar(PILE_SCALE);
  root.add(mid);
  if (pose === 'pile' && !model.userData.upright) mid.rotation.x = -Math.PI / 2;
  if (pose === 'pile' && id === 'soda' && Math.random() < 0.5) mid.rotation.x = 0;
  const box = new THREE.Box3().setFromObject(mid);
  const c = box.getCenter(new THREE.Vector3());
  mid.position.set(-c.x, pose === 'pile' ? -box.min.y : -c.y, -c.z);
  const size = box.getSize(new THREE.Vector3());
  root.userData = { id, height: size.y, radius: Math.max(size.x, size.z) / 2 };
  return root;
}
