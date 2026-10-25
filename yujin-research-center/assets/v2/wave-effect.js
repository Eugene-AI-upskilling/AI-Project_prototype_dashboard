/* Scroll Wave Field — Originkit.
 * Vanilla JS adapter of web_effects/scroll_wave_field/ScrollWaveField.tsx.
 * Original GLSL, grid, camera projection, seeded colors and cursor lift retained.
 * Adapter adds scroll input, responsive density, reduced motion and lifecycle pause.
 */
const VERT = `
precision highp float;

attribute vec2 aGrid;
attribute vec2 aSeed;

uniform vec2  uRes;
uniform float uFocal;
uniform float uTime;
uniform float uAmp;
uniform float uScatter;
uniform float uFreq;
uniform vec2  uDir;
uniform float uFlow;
uniform float uDepth;
uniform float uCamY;
uniform float uCamZ;
uniform float uPitch;
uniform float uRoll;

uniform float uDot;
uniform float uColorCount;
uniform vec2  uJit;
uniform vec3  uColors[8];
uniform vec3  uCursor;
uniform float uCurR;
uniform float uCurS;
uniform float uHover;

varying vec3  vCol;
varying float vA;
varying float vHot;

vec3 pickColor(float sel) {
    float idx = floor(sel * uColorCount);
    vec3 c = uColors[0];
    for (int i = 1; i < 8; i++) {
        if (float(i) >= uColorCount) break;
        if (float(i) == idx) c = uColors[i];
    }
    return c;
}

float surf(vec2 q) {
    return sin(q.x) * 0.55
         + sin(q.x * 0.55 + q.y * 1.15) * 0.30
         + sin(q.y * 0.75) * 0.22;
}

void main() {
    vec2 w = aGrid + (aSeed - 0.5) * uJit;

    w.y = uCamZ + mod(w.y - uFlow - uCamZ, uDepth);

    float h3 = fract(sin(dot(aSeed, vec2(91.37, 47.13))) * 12345.678);

    float h = surf(w * uFreq - uDir * uTime) * uAmp + (h3 - 0.5) * uScatter;

    float cd = length(w - uCursor.xy);
    float g = exp(-(cd * cd) / (uCurR * uCurR)) * uCursor.z;
    h += g * uCurS;

    float g2 = g * g; g2 = g2 * g2; g2 = g2 * g2;

    vec3 p = vec3(w.x, h - uCamY, w.y - uCamZ);
    float c = cos(uPitch);
    float s = sin(uPitch);
    float ry = p.y * c + p.z * s;
    float rz = -p.y * s + p.z * c;

    if (rz < 40.0) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        gl_PointSize = 0.0;
        vCol = uColors[0];
        vA = 0.0;
        vHot = 0.0;
        return;
    }

    float cr = cos(uRoll);
    float sr = sin(uRoll);
    float rx = p.x * cr - ry * sr;
    float ryr = p.x * sr + ry * cr;

    float sx = rx * uFocal / rz;
    float sy = ryr * uFocal / rz;
    gl_Position = vec4(sx / (uRes.x * 0.5), sy / (uRes.y * 0.5), 0.0, 1.0);

    float rad = max(uDot * uFocal / rz, 0.55);

    gl_PointSize = clamp(rad * 2.0 * (1.0 + g2 * uHover * 0.20), 1.0, 220.0);

    float bri = 0.28 + h3 * 0.72;

    vec2 bq = w * vec2(0.0040, 0.0032) - uDir * uTime * 0.30;
    float band = sin(bq.x) + sin(bq.y);
    float sel = fract((band + 2.0) * 0.25 + (aSeed.y - 0.5) * 0.55);

    vCol = pickColor(sel);

    float lum = dot(vCol, vec3(0.299, 0.587, 0.114));

    vHot = (0.25 + 0.75 * lum) * bri * bri * 0.7 + g2 * uHover * 0.55;

    float fog = (1.0 - smoothstep(2800.0, 6400.0, rz))
              * smoothstep(70.0, 240.0, rz);

    vA = bri * fog * (1.0 + g2 * uHover * 0.55);
}
`;
const FRAG = `
precision highp float;

varying vec3  vCol;
varying float vA;
varying float vHot;

void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;

    float a = (1.0 - smoothstep(0.90, 1.0, d)) * vA;

    vec3 col = vCol + vec3(1.0) * pow(1.0 - d, 10.0) * vHot * 0.9;

    gl_FragColor = vec4(col * a, a);
}
`;

const FIELD_W = 3600, FIELD_D = 7000, CAM_Z = 700, FOV = 60;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function parseColor(s) {
  let h = (s || '#d21f23').replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
}
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function mountWave(host, options = {}) {
  if (!host) return { setScroll() {}, setPaused() {}, destroy() {} };
  const cfg = {
    colors: ['#d21f23', '#ff634e', '#ffab96'], bg: '#100b0c',
    density: 110, mobileDensity: 62, dotSize: 2.0, scatter: 108,
    waveHeight: 200, waveLength: 2070, waveSpeed: 120,
    tiltStart: 9, rollStart: 0, cameraHeight: 50,
    cursorRadius: 25, cursorLift: 160, hoverGlow: 190,
    scrollTilt: 8, scrollHeight: 150, ...options
  };
  if (options.background) cfg.bg = options.background;
  if (options.wave) Object.assign(cfg, options.wave);
  if (options.tilt) Object.assign(cfg, options.tilt);
  if (options.cursor) Object.assign(cfg, options.cursor);
  host.dataset.effectReady = 'false';
  host.dataset.effectSource = 'Originkit Scroll Wave Field';
  host.style.backgroundColor = cfg.bg;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: 'none' });
  host.append(canvas);
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, depth: false });
  let scroll = 0, stopped = false, destroyed = false, visible = true, raf = 0, cssW = 1, cssH = 1, dpr = 1, areaScale = 1;
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = mq.matches;
  let program, gridBuf, seedBuf, shaders = [], resizeObserver, intersectionObserver;
  const cleanup = [];
  const listen = (target, type, fn, opt) => { target.addEventListener(type, fn, opt); cleanup.push(() => target.removeEventListener(type, fn, opt)); };
  const fallback = () => {
    canvas.remove();
    host.dataset.effectReady = 'true'; host.dataset.effectRenderer = 'fallback'; host.dataset.effectStatus = 'static';
    host.style.backgroundImage = 'radial-gradient(ellipse at 72% 100%, #96202588, transparent 64%), radial-gradient(ellipse at 20% 92%, #eb443344, transparent 55%)';
    const layer = document.createElement('div');
    layer.setAttribute('aria-hidden', 'true');
    Object.assign(layer.style, { position: 'absolute', inset: '38% -15% -20%', backgroundImage: 'radial-gradient(circle, #ef544d 1px, transparent 1.5px)', backgroundSize: '20px 20px', opacity: '.5', transform: 'perspective(600px) rotateX(50deg)', maskImage: 'linear-gradient(transparent, black 38%)' });
    host.append(layer);
    return { setScroll(p) { scroll = clamp(p || 0, 0, 1); }, setPaused() {}, destroy() { layer.remove(); } };
  };
  if (!gl) return fallback();
  try {
    program = gl.createProgram();
    for (const [type, source] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]]) {
      const shader = gl.createShader(type); shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (err) {
    console.warn('Scroll Wave Field unavailable:', err.message);
    for (const s of shaders) gl.deleteShader(s); if (program) gl.deleteProgram(program);
    return fallback();
  }
  gl.useProgram(program); gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  const names = ['Res','Focal','Time','Amp','Scatter','Freq','Dir','Flow','Depth','CamY','CamZ','Pitch','Roll','Dot','ColorCount','Jit','Cursor','CurR','CurS','Hover'];
  const u = Object.fromEntries(names.map(n => [n, gl.getUniformLocation(program, 'u' + n)]));
  u.Colors = gl.getUniformLocation(program, 'uColors[0]');
  const aGrid = gl.getAttribLocation(program, 'aGrid'), aSeed = gl.getAttribLocation(program, 'aSeed');
  gridBuf = gl.createBuffer(); seedBuf = gl.createBuffer();
  let count = 0, density = 0, spacingX = 1, spacingZ = 1;
  function buildGrid(d) {
    density = d; const cols = Math.max(8, Math.round(d)), rows = Math.max(8, Math.round(d * 2)); count = cols * rows;
    spacingX = FIELD_W / (cols - 1); spacingZ = FIELD_D / (rows - 1);
    const grid = new Float32Array(count * 2), seeds = new Float32Array(count * 2), rnd = mulberry32(0x5eed);
    let i = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      grid[i * 2] = -FIELD_W / 2 + (c + .5) * spacingX; grid[i * 2 + 1] = r * spacingZ;
      seeds[i * 2] = rnd(); seeds[i * 2 + 1] = rnd(); i++;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBuf); gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf); gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    host.dataset.effectParticles = String(count);
  }
  const pal = cfg.colors.slice(0, 8), palBuf = new Float32Array(24);
  pal.forEach((c, i) => palBuf.set(parseColor(c), i * 3));
  const pointer = { x: 0, y: 0, sx: 0, sy: 0, hover: 0, target: 0, press: 0, pressTarget: 0 };
  let last = performance.now(), phase = 0, flow = 0, hitX = 0, hitZ = -1e6;
  function resize() {
    cssW = host.clientWidth || 1; cssH = host.clientHeight || 1;
    dpr = Math.min(window.devicePixelRatio || 1, cssW < 700 ? 1.25 : 1.5);
    areaScale = clamp(Math.sqrt(cssW * cssH / (1200 * 800)), .5, 2.5);
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr); gl.viewport(0, 0, canvas.width, canvas.height);
    const d = cssW < 700 ? cfg.mobileDensity : cfg.density;
    if (d !== density) buildGrid(d);
    if (reduced || stopped) draw(performance.now(), false);
  }
  function groundHit(mx, my, focal, pitch, roll, camY) {
    const px = mx * dpr - canvas.width / 2, py = -(my * dpr - canvas.height / 2), cr = Math.cos(roll), sr = Math.sin(roll);
    const sx = px * cr + py * sr, sy = -px * sr + py * cr, dx = sx / focal, dy = sy / focal, c = Math.cos(pitch), s = Math.sin(pitch);
    const wy = dy * c - s, wz = dy * s + c;
    if (wy > -1e-4) return null;
    const t = -camY / wy; return { x: dx * t, z: CAM_Z + wz * t };
  }
  function draw(now, animate = true) {
    const dt = animate ? Math.min((now - last) / 1000, .05) : 0; last = now;
    const k = 1 - Math.exp(-dt * 7);
    pointer.hover += (pointer.target - pointer.hover) * k; pointer.press += (pointer.pressTarget - pointer.press) * k;
    if (pointer.hover < .002) { pointer.sx = pointer.x; pointer.sy = pointer.y; }
    else { pointer.sx += (pointer.x - pointer.sx) * k; pointer.sy += (pointer.y - pointer.sy) * k; }
    phase += dt * (cfg.waveSpeed / 100) * (1 + pointer.press);
    flow = (flow + dt * (cfg.flowSpeed ?? cfg.waveSpeed * 260 / 160) * (1 + pointer.press)) % FIELD_D;
    const pitch = (cfg.tiltStart + scroll * cfg.scrollTilt) * Math.PI / 180, roll = -cfg.rollStart * Math.PI / 180;
    const camY = clamp(cfg.cameraHeight, 0, 100) / 100 * 550 * areaScale;
    const focal = canvas.height / (2 * Math.tan(FOV / 2 * Math.PI / 180));
    if (pointer.hover <= .001) { hitX = 0; hitZ = -1e6; }
    else {
      const hit = groundHit(pointer.sx, pointer.sy, focal, pitch, roll, camY);
      if (hit) { hitX = hit.x; hitZ = hit.z; } else if (hitZ === -1e6) { hitX = 0; hitZ = FIELD_D; }
    }
    gl.uniform2f(u.Res, canvas.width, canvas.height); gl.uniform1f(u.Focal, focal); gl.uniform1f(u.Time, phase);
    gl.uniform1f(u.Amp, cfg.waveHeight + scroll * cfg.scrollHeight); gl.uniform1f(u.Scatter, cfg.scatter); gl.uniform1f(u.Freq, Math.PI * 2 / Math.max(50, cfg.waveLength));
    gl.uniform2f(u.Dir, 0, -1); gl.uniform1f(u.Flow, flow); gl.uniform1f(u.Depth, FIELD_D); gl.uniform1f(u.CamY, camY); gl.uniform1f(u.CamZ, CAM_Z);
    gl.uniform1f(u.Pitch, pitch); gl.uniform1f(u.Roll, roll); gl.uniform1f(u.Dot, cfg.dotSize); gl.uniform1f(u.ColorCount, pal.length);
    gl.uniform2f(u.Jit, spacingX * .25, spacingZ * .7); gl.uniform3fv(u.Colors, palBuf); gl.uniform3f(u.Cursor, hitX, hitZ, pointer.hover);
    gl.uniform1f(u.CurR, Math.max(1, cfg.cursorRadius / 100 * FIELD_W / 2)); gl.uniform1f(u.CurS, cfg.cursorLift); gl.uniform1f(u.Hover, cfg.hoverGlow / 100);
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBuf); gl.enableVertexAttribArray(aGrid); gl.vertexAttribPointer(aGrid, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf); gl.enableVertexAttribArray(aSeed); gl.vertexAttribPointer(aSeed, 2, gl.FLOAT, false, 0, 0);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.POINTS, 0, count);
    host.dataset.effectReady = 'true';
  }
  const active = () => !destroyed && !stopped && visible && !document.hidden && !reduced;
  function tick(now) { raf = 0; if (!active()) return; draw(now); raf = requestAnimationFrame(tick); }
  function schedule() {
    if (active() && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); host.dataset.effectStatus = 'running'; }
    else if (!active()) { cancelAnimationFrame(raf); raf = 0; host.dataset.effectStatus = reduced ? 'static' : 'paused'; }
  }
  listen(host, 'pointermove', e => { const r = host.getBoundingClientRect(); pointer.x = (e.clientX - r.left) * cssW / r.width; pointer.y = (e.clientY - r.top) * cssH / r.height; pointer.target = 1; }, { passive: true });
  listen(host, 'pointerleave', () => { pointer.target = 0; pointer.pressTarget = 0; });
  listen(host, 'pointerdown', () => { pointer.pressTarget = 1; }, { passive: true });
  listen(host, 'pointercancel', () => { pointer.pressTarget = 0; });
  listen(window, 'pointerup', () => { pointer.pressTarget = 0; });
  listen(document, 'visibilitychange', schedule);
  listen(mq, 'change', e => { reduced = e.matches; if (reduced) draw(performance.now(), false); schedule(); });
  listen(canvas, 'webglcontextlost', e => { e.preventDefault(); stopped = true; schedule(); host.dataset.effectStatus = 'context-lost'; });
  resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
  intersectionObserver = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }, { rootMargin: '60px' }); intersectionObserver.observe(host);
  host.dataset.effectRenderer = 'webgl'; resize(); draw(performance.now(), false); schedule();
  return {
    setScroll(p) { scroll = clamp(p || 0, 0, 1); if (reduced || stopped) draw(performance.now(), false); },
    setPaused(value) { stopped = !!value; schedule(); },
    destroy() {
      destroyed = true; cancelAnimationFrame(raf); resizeObserver.disconnect(); intersectionObserver.disconnect(); cleanup.forEach(fn => fn());
      gl.deleteBuffer(gridBuf); gl.deleteBuffer(seedBuf); shaders.forEach(s => gl.deleteShader(s)); gl.deleteProgram(program); canvas.remove();
      host.dataset.effectStatus = 'destroyed';
    }
  };
}
