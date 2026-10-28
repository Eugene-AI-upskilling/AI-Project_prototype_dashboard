// Finance-themed 3D loops for the market/theme cards.
// One shared WebGL renderer draws each scene into its card's 2D canvas,
// so five cards cost one GPU context. Only on-screen cards are rendered.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const UP = '#ef5f5b', DOWN = '#3d6cf0', ACCENT = '#245ce7';
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const glossy = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: .26, metalness: .04, clearcoat: 1, clearcoatRoughness: .16, ...o });
const metal = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: .22, metalness: .88, clearcoat: .6, ...o });

function camera(fov, pos, look) {
  const c = new THREE.PerspectiveCamera(fov, 2, .1, 100);
  c.position.set(...pos); c.lookAt(...look); return c;
}

function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, '#fff'); r.addColorStop(.55, '#fff'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const builders = {
  // 국내 시황: candles drawn from a looping price path, with a moving-average line.
  candles() {
    const scene = new THREE.Scene(), cam = camera(30, [2.8, 2.1, 8.2], [0, .3, 0]);
    const g = new THREE.Group(); scene.add(g);
    const up = glossy(UP), down = glossy(DOWN), wickM = glossy('#9aa8c4', { clearcoat: 0, roughness: .5 });
    const bodyGeo = new RoundedBoxGeometry(.42, 1, .42, 3, .06), wickGeo = new THREE.CylinderGeometry(.022, .022, 1, 8);
    const N = 14, gap = .62, items = [];
    for (let i = 0; i < N; i++) {
      const b = new THREE.Mesh(bodyGeo, up), w = new THREE.Mesh(wickGeo, wickM);
      b.position.x = w.position.x = (i - (N - 1) / 2) * gap; g.add(w, b); items.push({ b, w });
    }
    const pos = new Float32Array(N * 3), lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: .6 })));
    const price = (i, t) => i * .12 + Math.sin(i * .75 + t * .9) * .7 + Math.sin(i * .29 - t * .55) * .55 - .85;
    return { scene, cam, update(t) {
      g.rotation.y = -.32 + Math.sin(t * .22) * .14;
      const closes = [];
      for (let i = 0; i < N; i++) {
        const o = price(i - 1, t), c = price(i, t), hi = Math.max(o, c), lo = Math.min(o, c), h = Math.max(.07, hi - lo);
        const { b, w } = items[i]; closes.push(c);
        b.scale.y = h; b.position.y = (hi + lo) / 2; b.material = c >= o ? up : down;
        w.scale.y = h + .3 + .22 * (1 + Math.sin(i * 1.7 + t)); w.position.y = b.position.y;
        const ma = (closes[i] + (closes[i - 1] ?? c) + (closes[i - 2] ?? c)) / 3;
        pos.set([(i - (N - 1) / 2) * gap, ma + .05, .32], i * 3);
      }
      lineGeo.attributes.position.needsUpdate = true;
    } };
  },

  // 해외 시황: dotted globe with trade-flow arcs leaving Seoul.
  globe() {
    const scene = new THREE.Scene(), cam = camera(30, [0, 0, 9.8], [0, 0, 0]);
    const tilt = new THREE.Group(), g = new THREE.Group(); tilt.rotation.x = .32; tilt.add(g); scene.add(tilt);
    const R = 2;
    g.add(new THREE.Mesh(new THREE.SphereGeometry(R * .975, 64, 48), glossy('#f5f8ff', { roughness: .5, clearcoat: .3, emissive: '#c9d8ff', emissiveIntensity: .38 })));
    const pts = [], N = 7000;
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996;
      const x = Math.cos(th) * r, z = Math.sin(th) * r, lat = Math.asin(y), lon = Math.atan2(z, x);
      const land = Math.sin(lat * 2.8 + 1) * Math.cos(lon * 1.7) + .55 * Math.sin(lon * 4.1 + lat * 2) + .35 * Math.cos(lat * 6 - lon * 3);
      if (land > .1 && Math.abs(y) < .92) pts.push(x * R, y * R, z * R);
    }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: .085, map: dotTexture(), color: '#2f5fe0', transparent: true, depthWrite: false })));
    const ll = (lat, lon, r = R) => { const a = lat * Math.PI / 180, o = lon * Math.PI / 180; return new THREE.Vector3(Math.cos(a) * Math.cos(o) * r, Math.sin(a) * r, -Math.cos(a) * Math.sin(o) * r); };
    const seoul = ll(37.5, 127), cities = [[40.7, -74], [51.5, -.1], [35.7, 139.7], [31.2, 121.5], [50.1, 8.7], [1.3, 103.8], [22.3, 114.2]];
    const arcs = cities.map(([la, lo], i) => {
      const b = ll(la, lo), mid = seoul.clone().add(b).multiplyScalar(.5), lift = R + seoul.distanceTo(b) * .55;
      mid.normalize().multiplyScalar(lift);
      const geo = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(seoul, mid, b), 64, .016, 6);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? UP : ACCENT, transparent: true, opacity: .9 }));
      const dot = new THREE.Mesh(new THREE.SphereGeometry(.045, 12, 12), new THREE.MeshBasicMaterial({ color: ACCENT })); dot.position.copy(b);
      g.add(m, dot); return { geo, total: geo.index.count };
    });
    const home = new THREE.Mesh(new THREE.SphereGeometry(.08, 16, 16), new THREE.MeshBasicMaterial({ color: UP })); home.position.copy(seoul); g.add(home);
    const base = -Math.atan2(seoul.x, seoul.z);
    const unit = 6 * 6; // indices per tubular segment (radialSegments * 6)
    return { scene, cam, update(t) {
      g.rotation.y = base + Math.sin(t * .18) * .75;
      arcs.forEach((a, i) => {
        const ph = (t * .32 + i * .19) % 1.6, end = clamp(ph / .9), start = clamp((ph - .7) / .9);
        const s = Math.floor(a.total * start / unit) * unit, e = Math.floor(a.total * end / unit) * unit;
        a.geo.setDrawRange(s, Math.max(0, e - s));
      });
      home.scale.setScalar(1 + .35 * Math.sin(t * 3));
    } };
  },

  // 금리·환율: coin stacks shaped like a yield curve, coins dropping as levels move.
  coins() {
    const scene = new THREE.Scene(), cam = camera(30, [0, 3.4, 10.4], [0, 1.15, 0]);
    const g = new THREE.Group(); scene.add(g);
    const geo = new THREE.CylinderGeometry(.5, .5, .13, 48), silver = metal('#e6ecfa', { metalness: .45, roughness: .3 }), gold = metal('#f7cf78', { metalness: .5, roughness: .3 });
    const base = [2.6, 4.2, 5.3, 6.1, 6.6, 6.9], H = .145, MAX = 10, stacks = [];
    base.forEach((_, i) => {
      const x = (i - 2.5) * 1.2, z = Math.sin(i * .9) * .25, coins = [];
      for (let k = 0; k < MAX; k++) { const m = new THREE.Mesh(geo, k % 4 === 3 ? gold : silver); m.position.set(x, 0, z); m.rotation.y = k * .3; g.add(m); coins.push(m); }
      stacks.push(coins);
    });
    const pos = new Float32Array(base.length * 3), lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.add(new THREE.Line(lg, new THREE.LineBasicMaterial({ color: ACCENT })));
    return { scene, cam, update(t) {
      g.rotation.y = -.22 + Math.sin(t * .2) * .18;
      stacks.forEach((coins, i) => {
        const level = base[i] + 1.1 * Math.sin(t * .8 - i * .55), n = Math.floor(level), f = level - n;
        coins.forEach((m, k) => {
          m.visible = k <= n;
          m.position.y = k * H + H / 2 + (k === n ? (1 - f) ** 2 * 1.6 : 0);
        });
        pos.set([coins[0].position.x, level * H + .38, coins[0].position.z], i * 3);
      });
      lg.attributes.position.needsUpdate = true;
    } };
  },

  // AI 반도체: a chip whose core cells pulse like a compute wave.
  chip() {
    const scene = new THREE.Scene(), cam = camera(27, [6.6, 6.4, 8.6], [0, .35, 0]);
    const g = new THREE.Group(); scene.add(g);
    const slab = new THREE.Mesh(new RoundedBoxGeometry(4.4, .32, 4.4, 4, .14), glossy('#17234b')); slab.position.y = -.16; g.add(slab);
    const pinGeo = new THREE.BoxGeometry(.14, .06, .34), pinM = metal('#c9d2e6');
    for (let s = 0; s < 4; s++) for (let k = 0; k < 11; k++) {
      const p = new THREE.Mesh(pinGeo, pinM), o = (k - 5) * .36;
      if (s < 2) p.position.set(o, -.16, s ? 2.32 : -2.32); else { p.position.set(s === 2 ? 2.32 : -2.32, -.16, o); p.rotation.y = Math.PI / 2; }
      g.add(p);
    }
    const C = 8, sp = .46, cells = new THREE.InstancedMesh(new RoundedBoxGeometry(.36, 1, .36, 2, .05), glossy('#ffffff', { roughness: .3 }), C * C);
    g.add(cells);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s3 = new THREE.Vector3(), col = new THREE.Color();
    const lo = new THREE.Color('#3a64f2'), hi = new THREE.Color('#8ef0ff');
    return { scene, cam, update(t) {
      g.rotation.y = t * .15;
      for (let i = 0; i < C; i++) for (let j = 0; j < C; j++) {
        const x = (i - (C - 1) / 2) * sp, z = (j - (C - 1) / 2) * sp, d = Math.hypot(x, z);
        const h = .12 + 1.05 * Math.max(0, Math.sin(d * 2 - t * 2.2)) ** 3 + .12 * (.5 + .5 * Math.sin(x * 3 + z + t * 1.3));
        v.set(x, h / 2, z); s3.set(1, h, 1); m4.compose(v, q, s3); cells.setMatrixAt(i * C + j, m4);
        cells.setColorAt(i * C + j, col.copy(lo).lerp(hi, clamp(h / 1.05)));
      }
      cells.instanceMatrix.needsUpdate = true; cells.instanceColor.needsUpdate = true;
    } };
  },

  // 2차전지·에너지: glass cells charging in sequence.
  battery() {
    const scene = new THREE.Scene(), cam = camera(30, [0, 1.8, 9.4], [0, .1, 0]);
    const g = new THREE.Group(); scene.add(g);
    const glass = glossy('#dfe8ff', { transparent: true, opacity: .26, roughness: .04, depthWrite: false });
    const ring = metal('#cdd5e8'), fillGeo = new THREE.CylinderGeometry(.46, .46, 1, 48); fillGeo.translate(0, .5, 0);
    const low = new THREE.Color('#5aa6ff'), full = new THREE.Color('#2fcfae'), cells = [];
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * 1.38, fillM = glossy('#2fcfae', { emissive: '#0f6f5c', emissiveIntensity: .25 });
      const fill = new THREE.Mesh(fillGeo, fillM); fill.position.set(x, -1.13, 0);
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 2.4, 48, 1, true), glass); shell.position.x = x;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(.56, .56, .09, 48), ring); top.position.set(x, 1.22, 0);
      const bot = top.clone(); bot.position.y = -1.22;
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .18, 32), ring); tip.position.set(x, 1.34, 0);
      g.add(fill, shell, top, bot, tip); cells.push({ fill, fillM });
    }
    return { scene, cam, update(t) {
      g.rotation.y = Math.sin(t * .25) * .25;
      cells.forEach(({ fill, fillM }, i) => {
        const level = .18 + .76 * (.5 + .5 * Math.sin(t * .9 - i * .8));
        fill.scale.y = Math.max(.02, level * 2.26);
        fillM.color.copy(low).lerp(full, level);
      });
    } };
  },
};

export function mountFinanceScenes(canvases, { reduced = false } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch { return null; }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  const views = canvases.map(canvas => {
    const build = builders[canvas.dataset.scene]; if (!build) return null;
    const v = build(); v.scene.environment = env;
    const key = new THREE.DirectionalLight('#ffffff', 1.5); key.position.set(4, 7, 6);
    v.scene.add(new THREE.HemisphereLight('#ffffff', '#c9d6ff', .55), key);
    return { canvas, ctx: canvas.getContext('2d'), drawnAt: '', ...v };
  }).filter(Boolean);
  const size = new THREE.Vector2(), start = performance.now();
  let raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const t = (now - start) / 1000, dpr = Math.min(devicePixelRatio || 1, 2), vw = innerWidth, vh = innerHeight;
    for (const v of views) {
      const r = v.canvas.getBoundingClientRect();
      if (r.width < 2 || r.right < 0 || r.left > vw || r.bottom < 0 || r.top > vh) continue;
      const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      // Reduced motion: draw one still frame per size instead of looping.
      if (reduced && v.drawnAt === `${w}x${h}`) continue;
      if (v.canvas.width !== w || v.canvas.height !== h) { v.canvas.width = w; v.canvas.height = h; }
      renderer.getSize(size); if (size.x !== w || size.y !== h) renderer.setSize(w, h, false);
      v.cam.aspect = w / h; v.cam.zoom = Math.min(1, v.cam.aspect / 2); v.cam.updateProjectionMatrix();
      v.update(reduced ? 2.4 : t);
      renderer.render(v.scene, v.cam);
      v.ctx.clearRect(0, 0, w, h); v.ctx.drawImage(renderer.domElement, 0, 0);
      v.drawnAt = `${w}x${h}`;
    }
  }
  raf = requestAnimationFrame(frame);
  return { destroy() { cancelAnimationFrame(raf); renderer.dispose(); } };
}
