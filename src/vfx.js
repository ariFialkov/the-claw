// Visual effects: in-world sprite particles + a 2D overlay canvas for
// confetti, coin showers, light rays and flashes.
import * as THREE from 'three';

function dotTexture(star) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,.75)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  if (!star) {
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  } else {
    x.fillStyle = g;
    x.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? 9 : 64;
      const a = (i / 8) * Math.PI * 2;
      x.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
    }
    x.fill();
    x.globalAlpha = 0.6; x.beginPath(); x.arc(64, 64, 18, 0, 7); x.fill();
  }
  return new THREE.CanvasTexture(c);
}

function raysTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  x.translate(256, 256);
  for (let i = 0; i < 14; i++) {
    x.rotate((Math.PI * 2) / 14);
    const g = x.createLinearGradient(0, 0, 0, -256);
    g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(-26, -256); x.lineTo(26, -256); x.fill();
  }
  return new THREE.CanvasTexture(c);
}

export function createVfx(scene, overlayCanvas) {
  const texDot = dotTexture(false);
  const texStar = dotTexture(true);
  const texRays = raysTexture();

  // ---- 3D sprite pool -----------------------------------------------------
  const POOL = 220;
  const pool = [];
  for (let i = 0; i < POOL; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texDot, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.visible = false;
    s.renderOrder = 10;
    scene.add(s);
    pool.push({ s, life: 0, max: 1, v: new THREE.Vector3(), g: 0, size: 0.1, drag: 0 });
  }
  let cursor = 0;
  function emit(pos, { count = 12, color = '#fff', speed = 1.5, life = 0.7, size = 0.14, gravity = 2, star = false, spread = 0.1, up = 0.5, drag = 1.5 } = {}) {
    const colors = Array.isArray(color) ? color : [color];
    for (let i = 0; i < count; i++) {
      const p = pool[cursor = (cursor + 1) % POOL];
      p.s.visible = true;
      p.s.material.map = star ? texStar : texDot;
      p.s.material.color.set(colors[i % colors.length]);
      p.s.position.set(pos.x + (Math.random() - 0.5) * spread, pos.y + (Math.random() - 0.5) * spread, pos.z + (Math.random() - 0.5) * spread);
      const a = Math.random() * Math.PI * 2, e = Math.acos(Math.random() * 2 - 1);
      const sp = speed * (0.4 + Math.random() * 0.6);
      p.v.set(Math.sin(e) * Math.cos(a) * sp, Math.cos(e) * sp + up * speed, Math.sin(e) * Math.sin(a) * sp);
      p.max = p.life = life * (0.6 + Math.random() * 0.6);
      p.g = gravity; p.size = size * (0.6 + Math.random() * 0.8); p.drag = drag;
      p.s.material.rotation = Math.random() * 6.28;
    }
  }

  // glow that follows an object (rarity colour on the grabbed prize)
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: texDot, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  glow.renderOrder = 9;
  const glowRays = new THREE.Sprite(new THREE.SpriteMaterial({ map: texRays, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  glowRays.renderOrder = 9;
  const glowLight = new THREE.PointLight('#fff', 0, 4, 1.5);
  const glowAnchor = new THREE.Group();
  glowAnchor.add(glow, glowRays, glowLight);
  scene.add(glowAnchor);
  let glowTarget = null, glowLevel = 0, glowAmt = 0, glowWant = 0;
  const tmp = new THREE.Vector3();

  // ---- 2D overlay ---------------------------------------------------------
  const ctx = overlayCanvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = overlayCanvas.clientWidth; H = overlayCanvas.clientHeight;
    overlayCanvas.width = W * dpr; overlayCanvas.height = H * dpr;
  }
  const bits = []; // confetti + coins
  let rays = null, flash = null, dim = 0, dimWant = 0;

  function confetti(count, colors, { burst = true } = {}) {
    for (let i = 0; i < count; i++) {
      const fromLeft = i % 2 === 0;
      bits.push(burst ? {
        kind: 'c', x: fromLeft ? -10 : W + 10, y: H * (0.55 + Math.random() * 0.3),
        vx: (fromLeft ? 1 : -1) * (300 + Math.random() * 700), vy: -(500 + Math.random() * 800),
        r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 14, w: 7 + Math.random() * 8, h: 10 + Math.random() * 10,
        col: colors[i % colors.length], life: 3.5, ph: Math.random() * 6.28,
      } : {
        kind: 'c', x: Math.random() * W, y: -20 - Math.random() * H * 0.6,
        vx: (Math.random() - 0.5) * 120, vy: 140 + Math.random() * 220,
        r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 10, w: 7 + Math.random() * 8, h: 10 + Math.random() * 10,
        col: colors[i % colors.length], life: 5, ph: Math.random() * 6.28, rain: true,
      });
    }
  }
  function coins(count) {
    for (let i = 0; i < count; i++) {
      bits.push({
        kind: '$', x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.5,
        vx: (Math.random() - 0.5) * 900, vy: -(500 + Math.random() * 900),
        r: 0, vr: 6 + Math.random() * 10, w: 13 + Math.random() * 9, life: 3, ph: Math.random() * 6.28, delay: Math.random() * 0.8,
      });
    }
  }

  function update(dt, t, camera) {
    // sprites
    for (const p of pool) {
      if (!p.s.visible) continue;
      p.life -= dt;
      if (p.life <= 0) { p.s.visible = false; continue; }
      p.v.y -= p.g * dt;
      p.v.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      p.s.position.addScaledVector(p.v, dt);
      const k = p.life / p.max;
      p.s.material.opacity = Math.min(1, k * 2.5);
      p.s.scale.setScalar(p.size * (0.5 + k * 0.7));
    }
    // glow
    glowAmt += (glowWant - glowAmt) * Math.min(1, dt * 8);
    if (glowTarget && glowAmt > 0.01) {
      glowTarget.getWorldPosition(tmp);
      glowAnchor.position.copy(tmp);
      const pulse = 1 + Math.sin(t * 7) * 0.08;
      glow.scale.setScalar((1.2 + glowLevel * 0.35) * pulse);
      glow.material.opacity = glowAmt * (0.45 + glowLevel * 0.1);
      glowRays.scale.setScalar(1.6 + glowLevel * 0.5);
      glowRays.material.rotation = t * 0.9;
      glowRays.material.opacity = glowLevel >= 2 ? glowAmt * 0.35 : 0;
      glowLight.intensity = glowAmt * (2 + glowLevel * 2);
    } else {
      glow.material.opacity = 0; glowRays.material.opacity = 0; glowLight.intensity = 0;
    }
    void camera;

    // overlay
    dim += (dimWant - dim) * Math.min(1, dt * 5);
    const active = bits.length || rays || flash || dim > 0.005;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!active) return;
    if (dim > 0.005) { ctx.fillStyle = `rgba(20,8,60,${dim})`; ctx.fillRect(0, 0, W, H); }
    if (rays) {
      rays.t += dt;
      const k = Math.min(1, rays.t / 0.4) * Math.min(1, Math.max(0, (rays.dur - rays.t) / 0.6));
      if (rays.t >= rays.dur) rays = null;
      else {
        ctx.save();
        ctx.translate(W / 2, H * rays.cy);
        ctx.rotate(rays.t * 0.5);
        ctx.globalCompositeOperation = 'lighter';
        const R = Math.hypot(W, H);
        const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.7);
        gr.addColorStop(0, rays.color); gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gr;
        ctx.globalAlpha = 0.5 * k;
        for (let i = 0; i < 12; i++) {
          ctx.rotate(Math.PI / 6);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-R * 0.09, -R); ctx.lineTo(R * 0.09, -R); ctx.fill();
        }
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i];
      if (b.delay > 0) { b.delay -= dt; continue; }
      b.life -= dt;
      b.vy += (b.kind === '$' ? 1700 : b.rain ? 0 : 1100) * dt;
      if (b.kind === 'c') { b.vx *= 1 - 1.2 * dt; if (b.vy > 260) b.vy = 260; b.x += Math.sin(t * 3 + b.ph) * 40 * dt; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt;
      if (b.life <= 0 || b.y > H + 40) { bits.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.globalAlpha = Math.min(1, b.life * 2);
      if (b.kind === 'c') {
        ctx.rotate(b.r);
        ctx.scale(1, Math.cos(t * 6 + b.ph));
        ctx.fillStyle = b.col;
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      } else {
        const sx = Math.abs(Math.cos(b.r)) * 0.85 + 0.15;
        ctx.scale(sx, 1);
        ctx.fillStyle = '#e09a00'; ctx.beginPath(); ctx.arc(0, 2, b.w, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, 0, b.w, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(0, 0, b.w * 0.62, 0, 7); ctx.fill();
        ctx.fillStyle = '#e09a00'; ctx.font = `700 ${b.w * 1.1}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 1);
      }
      ctx.restore();
    }
    if (flash) {
      flash.t += dt;
      const k = 1 - flash.t / flash.dur;
      if (k <= 0) flash = null;
      else { ctx.globalAlpha = k * 0.7; ctx.fillStyle = flash.color; ctx.fillRect(0, 0, W, H); }
    }
    ctx.globalAlpha = 1;
  }

  return {
    emit, update, resize, confetti, coins, texRays, texDot,
    setGlow(target, color, level) {
      glowTarget = target; glowLevel = level; glowWant = target ? 1 : 0;
      if (color) { glow.material.color.set(color); glowRays.material.color.set(color); glowLight.color.set(color); }
    },
    rays(color, dur = 3, cy = 0.42) { rays = { color, dur, t: 0, cy }; },
    flash(color = '#fff', dur = 0.35) { flash = { color, dur, t: 0 }; },
    dim(v) { dimWant = v; },
  };
}
