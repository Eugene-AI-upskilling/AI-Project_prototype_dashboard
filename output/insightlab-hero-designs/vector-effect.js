/**
 * Vector Wordmark — Originkit.
 * Vanilla ES module adaptation of web_effects/vector_wordmark/VectorWordmark.tsx.
 * Original text atlas, fragment shader, grid snapping and three-handle drift retained.
 * Added accessible static fallback, visibility gating, lifecycle cleanup and scroll API.
 */
const MAX_DPR = 1.6;
const REF_WIDTH = 1200;
const MAX_TEX = 4096;
const CELL_ASPECT = .6;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const fract = x => x - Math.floor(x);
const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
}`;
const FRAG = `
precision highp float;
uniform sampler2D uMap;
uniform vec2 uRes;
uniform vec2 uAtlas;
uniform vec2 uPtr;
uniform float uReach;
uniform vec3 uText;
uniform vec3 uShade;
uniform vec4 uAccent;
uniform vec2 uV0;
uniform vec2 uV1;
uniform vec2 uV2;
uniform float uHalf;
varying vec2 vUv;
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}
vec2 blurRG(vec2 uv, float e) {
    vec4 sum = vec4(0.0);
    for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float th = radians(fi / 6.0 * 360.0);
        vec2 dir = vec2(cos(th), sin(th));
        vec2 off = dir * (hash(vec2(fi, uv.x + uv.y)) + e);
        sum += texture2D(uMap, uv + off * e);
    }
    return (sum / 6.0).rg;
}
vec2 segment(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a;
    vec2 ap = p - a;
    float t = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-8), 0.0, 1.0);
    return vec2(length(ap - ab * t), t);
}
float stroke(float d, float lw, float px) {
    return 1.0 - smoothstep(lw, lw + px, d);
}
float dashedLine(vec2 p, vec2 a, vec2 b, float lw, float px) {
    vec2 s = segment(p, a, b);
    float dash = step(0.5, fract(s.y * length(b - a) * 100.0));
    return stroke(s.x, lw, px) * dash;
}
float boxEdge(vec2 p, vec2 c, float h, float lw, float px) {
    vec2 q = abs(p - c) - vec2(h);
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    return stroke(abs(d), lw, px);
}
void main() {
    float aspect = uRes.x / uRes.y;
    vec2 E = (vUv * uRes - (uRes - uAtlas) * 0.5) / uAtlas;
    float inside = step(0.0, E.x) * step(E.x, 1.0) * step(0.0, E.y) * step(E.y, 1.0);
    vec2 safeUv = clamp(E, 0.0, 1.0);
    float b = clamp(1.0 - E.y * 3.5, 0.0, 1.0) * 0.008;
    vec2 soft = blurRG(safeUv, b);
    vec2 sharp = blurRG(safeUv, b * 0.1);
    float d = length((vUv - uPtr) / vec2(1.0, aspect));
    float k = 1.0 - pow(smoothstep(0.0, max(uReach, 1e-4), d), 3.0);
    float mask = mix(soft.r, sharp.g, k) * inside;
    vec3 fill = mix(uShade, uText, smoothstep(0.0, 1.0, E.y));
    vec2 P = vec2(vUv.x * aspect, vUv.y);
    float px = 1.0 / uRes.y;
    float lw = px * 0.2;
    float lines = max(
        max(dashedLine(P, uV0, uV1, lw, px), dashedLine(P, uV1, uV2, lw, px)),
        dashedLine(P, uV2, uV0, lw, px)
    );
    float boxes = max(
        max(boxEdge(P, uV0, uHalf, lw, px), boxEdge(P, uV1, uHalf, lw, px)),
        boxEdge(P, uV2, uHalf, lw, px)
    );
    float A = max(lines, boxes) * uAccent.a * (1.0 - vUv.y);
    vec4 card = vec4(fill * mask, mask);
    vec4 comp = vec4(uAccent.rgb * A, A) + card * (1.0 - A);
    gl_FragColor = comp * pow(clamp(E.y, 0.0, 1.0), 0.7);
}`;

function parseColor(input, fallback = [0, 0, 0, 1]) {
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) return fallback;
  probe.fillStyle = 'rgba(0,0,0,0)';
  probe.fillStyle = input || '#000';
  probe.fillRect(0, 0, 1, 1);
  const p = probe.getImageData(0, 0, 1, 1).data;
  return [p[0] / 255, p[1] / 255, p[2] / 255, p[3] / 255];
}

function buildAtlas(text, font, drawFontPx, dpr) {
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) throw new Error('No text atlas renderer');
  const setFont = (context, px) => {
    context.font = `${font.weight} ${px}px ${font.family}`;
    if ('letterSpacing' in context) context.letterSpacing = font.spacing;
  };
  const measure = px => {
    setFont(probe, px);
    const metric = probe.measureText(text);
    return { w: Math.max(1, metric.width), asc: metric.actualBoundingBoxAscent || px * .8, desc: metric.actualBoundingBoxDescent || px * .22 };
  };
  let fpx = Math.max(8, drawFontPx * dpr);
  let m = measure(fpx);
  let pad = fpx * .12;
  const over = Math.max((m.w + pad * 2) / MAX_TEX, (m.asc + m.desc + pad * 2) / MAX_TEX);
  if (over > 1) { fpx /= over; m = measure(fpx); pad = fpx * .12; }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(m.w + pad * 2));
  canvas.height = Math.max(1, Math.ceil(m.asc + m.desc + pad * 2));
  const context = canvas.getContext('2d');
  context.fillStyle = '#000'; context.fillRect(0, 0, canvas.width, canvas.height);
  setFont(context, fpx);
  context.textBaseline = 'alphabetic'; context.textAlign = 'left';
  context.globalCompositeOperation = 'lighter';
  context.fillStyle = '#f00'; context.fillText(text, pad, pad + m.asc);
  const block = m.asc + m.desc;
  context.strokeStyle = '#0f0'; context.lineCap = 'round'; context.lineJoin = 'round';
  context.lineWidth = Math.max(1, block * (4 / 440));
  context.setLineDash([0, Math.max(2, block * (12 / 440))]);
  context.strokeText(text, pad, pad + m.asc);
  const cssPerPx = drawFontPx / fpx;
  return { canvas, cssW: canvas.width * cssPerPx, cssH: canvas.height * cssPerPx };
}

function compile(gl) {
  const shaders = [];
  const make = (type, source) => {
    const shader = gl.createShader(type); shaders.push(shader);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, make(gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, make(gl.FRAGMENT_SHADER, FRAG));
  gl.bindAttribLocation(program, 0, 'aPos'); gl.linkProgram(program);
  for (const shader of shaders) gl.deleteShader(shader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); throw new Error('Vector program link failed'); }
  return program;
}

export function mountVector(host, options = {}) {
  if (!host) throw new Error('Vector wordmark host is required');
  const opt = {
    text: 'INSIGHT', background: '#f4f1e9', textColor: '#191815', shade: '#6f6b63', accent: '#d21f23',
    fontFamily: 'Pretendard, Arial, sans-serif', fontWeight: 900, fontSize: 278, letterSpacing: '-0.055em',
    reach: 325, speed: 28, damping: 72, ...options,
  };
  const handles = { size: 88, spread: 22, labels: true, ...options.handles };
  const font = { family: opt.fontFamily, weight: opt.fontWeight, spacing: opt.letterSpacing };
  let fallback = host.querySelector('.vector-fallback');
  if (!fallback) { fallback = document.createElement('span'); fallback.className = 'vector-fallback'; host.append(fallback); }
  fallback.textContent = opt.text;
  fallback.style.fontFamily = opt.fontFamily;
  fallback.style.fontWeight = opt.fontWeight;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true'); host.append(canvas);
  const labels = Array.from({ length: handles.labels ? 3 : 0 }, () => {
    const label = document.createElement('div'); label.className = 'vector-coord'; label.style.color = opt.accent;
    label.setAttribute('aria-hidden', 'true'); host.append(label); return label;
  });
  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let alive = true, paused = false, visible = true, reduced = reducedQuery.matches;
  let raf = 0, last = 0, boxDirty = true, initialized = false, initializing = false, failed = false;
  let gl, program, quad, texture, uniforms;
  let boxW = 1, boxH = 1, bufferW = 1, bufferH = 1, dpr = 1, atlasW = 1, atlasH = 1;
  let hasPointer = false, sweepClock = 0, driftTime = 0, scroll = 0;
  const handleSize = () => Math.max(32, Math.min(handles.size, handles.size * boxW / 1200));
  const target = { x: .18, y: .47 }, eased = { x: .18, y: .47 };
  const cells = Array.from({ length: 3 }, () => ({ x: .2, y: .5 }));
  const verts = Array.from({ length: 3 }, () => ({ x: .2, y: .5 }));
  const textColor = parseColor(opt.textColor), shadeColor = parseColor(opt.shade), accentColor = parseColor(opt.accent);
  host.dataset.effectReady = 'false';
  host.dataset.effectSource = 'Originkit Vector Wordmark';

  function showStatic(reason) {
    canvas.style.display = 'none';
    for (const label of labels) label.style.display = 'none';
    host.dataset.renderer = reason === 'reduced-motion' ? 'static' : 'fallback';
    host.dataset.effectStatus = reason;
    host.dataset.effectReady = 'true';
  }
  function resize() {
    boxW = Math.max(1, host.clientWidth); boxH = Math.max(1, host.clientHeight);
    dpr = Math.min(MAX_DPR, devicePixelRatio || 1);
    bufferW = Math.round(boxW * dpr); bufferH = Math.round(boxH * dpr);
    canvas.width = bufferW; canvas.height = bufferH;
    const px = Math.max(8, opt.fontSize * boxW / REF_WIDTH);
    const atlas = buildAtlas(opt.text, font, px, dpr);
    atlasW = atlas.cssW; atlasH = atlas.cssH;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    fallback.style.fontSize = `${px}px`;
    boxDirty = false;
  }
  function snap(x, y, cw, ch) {
    const cx = Math.floor(x / cw), cy = Math.floor(y / ch), found = [];
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const px = (cx + i + .5) * cw, py = (cy + j + .5) * ch;
      found.push({ x: px, y: py, d: Math.hypot(px - x, py - y) });
    }
    found.sort((a, b) => a.d - b.d);
    for (let i = 0; i < 3; i++) { cells[i].x = found[i + 1].x; cells[i].y = found[i + 1].y; }
  }
  function step(dt) {
    const rate = Math.max(0, opt.speed) / 50;
    const cw = Math.max(.01, handles.spread / 100), ch = cw * CELL_ASPECT, aspect = boxW / boxH;
    if (!hasPointer) {
      const band = atlasH / boxH;
      target.x += dt * .5 * rate;
      target.y = (1 - band) / 2 + .28 * band;
      if (target.x > 1.3) { target.x = -.3; eased.x = -.3; }
      sweepClock += dt;
      if (sweepClock >= .2) { sweepClock = 0; snap(target.x * aspect, target.y, cw, ch); }
    } else snap(target.x * aspect, target.y, cw, ch);
    const damp = clamp(opt.damping / 100 * 20 * dt, 0, 1);
    eased.x += (target.x - eased.x) * damp; eased.y += (target.y - eased.y) * damp;
    driftTime += dt * rate;
    for (let i = 0; i < 3; i++) {
      const c = cells[i], sx = Math.round(c.x / cw - .5), sy = Math.round(c.y / ch - .5);
      const h1 = fract(Math.sin(sx * 127.1 + sy * 311.7) * 43758.5453);
      const h2 = fract(Math.sin(sx * 269.5 + sy * 183.3) * 43758.5453);
      verts[i].x = c.x + .08 * cw * Math.sin(driftTime * 1.3 + h1 * Math.PI * 2);
      verts[i].y = c.y + .04 * ch * Math.sin(driftTime * 1.69 + h2 * Math.PI * 2);
    }
  }
  function draw() {
    gl.viewport(0, 0, bufferW, bufferH); gl.useProgram(program);
    gl.uniform1i(uniforms.map, 0); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform2f(uniforms.res, boxW, boxH); gl.uniform2f(uniforms.atlas, atlasW, atlasH);
    gl.uniform2f(uniforms.ptr, eased.x, eased.y + scroll * .025);
    gl.uniform1f(uniforms.reach, Math.max(1, Math.min(opt.reach, boxW * .38)) / boxW);
    gl.uniform3f(uniforms.text, ...textColor.slice(0, 3)); gl.uniform3f(uniforms.shade, ...shadeColor.slice(0, 3));
    gl.uniform4f(uniforms.accent, ...accentColor);
    for (let i = 0; i < 3; i++) {
      gl.uniform2f(uniforms[`v${i}`], verts[i].x, verts[i].y);
      const label = labels[i];
      if (label) {
        const bx = verts[i].x / (boxW / boxH), by = verts[i].y;
        label.style.transform = `translate(${bx * boxW - handleSize() / 2}px,${(1 - by) * boxH - handleSize() / 2 - 15}px)`;
        label.style.opacity = '.75';
        label.textContent = `${Math.round(clamp(bx * 100, 0, 100))}, ${Math.round(clamp(by * 100, 0, 100))}`;
      }
    }
    gl.uniform1f(uniforms.half, handleSize() / 2 / boxH);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    host.dataset.effectReady = 'true';
  }
  function frame(now) {
    raf = 0;
    if (!alive || failed || reduced || paused || !visible || document.hidden) return;
    const dt = last ? Math.min(.08, (now - last) / 1000) : 1 / 60;
    last = now;
    if (boxDirty) resize();
    step(dt); draw();
    raf = requestAnimationFrame(frame);
  }
  function gate() {
    if (!alive) return;
    if (reduced) { if (raf) cancelAnimationFrame(raf); raf = 0; showStatic('reduced-motion'); return; }
    if (failed) return;
    if (!initialized) return;
    canvas.style.display = 'block'; for (const label of labels) label.style.display = 'block';
    host.dataset.renderer = 'webgl';
    const active = !paused && visible && !document.hidden;
    host.dataset.effectStatus = active ? 'running' : 'paused';
    if (active && !raf) { last = 0; raf = requestAnimationFrame(frame); }
    if (!active && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function onMove(event) {
    if (reduced || failed || event.pointerType === 'touch') return;
    const rect = host.getBoundingClientRect();
    hasPointer = true; target.x = clamp((event.clientX - rect.left) / rect.width, -.2, 1.2);
    target.y = 1 - clamp((event.clientY - rect.top) / rect.height, 0, 1);
  }
  const onLeave = () => { hasPointer = false; };
  const onReduce = () => { reduced = reducedQuery.matches; if (!reduced && !initialized && !failed) initialize(); gate(); };
  const onContextLoss = event => { event.preventDefault(); failed = true; if (raf) cancelAnimationFrame(raf); raf = 0; showStatic('context-lost'); };
  host.addEventListener('pointermove', onMove, { passive: true });
  host.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('webglcontextlost', onContextLoss);
  document.addEventListener('visibilitychange', gate);
  reducedQuery.addEventListener('change', onReduce);
  const resizeObserver = new ResizeObserver(() => { boxDirty = true; if (reduced) fallback.style.fontSize = `${Math.max(8, opt.fontSize * host.clientWidth / REF_WIDTH)}px`; });
  resizeObserver.observe(host);
  const intersectionObserver = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; gate(); }, { rootMargin: '50px' });
  intersectionObserver.observe(host);

  async function initialize() {
    if (initializing || initialized || failed) return;
    initializing = true;
    if (document.fonts) {
      try { await document.fonts.load(`${opt.fontWeight} 64px ${opt.fontFamily}`, opt.text); await document.fonts.ready; } catch (_) { /* Safe fallback font remains available. */ }
    }
    if (!alive) return;
    if (reduced) { initializing = false; showStatic('reduced-motion'); return; }
    try {
      gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: 'low-power' });
      if (!gl) { failed = true; showStatic('webgl-unavailable'); return; }
      program = compile(gl);
      uniforms = {};
      for (const name of ['map', 'res', 'atlas', 'ptr', 'reach', 'text', 'shade', 'accent', 'v0', 'v1', 'v2', 'half']) {
        const title = name[0].toUpperCase() + name.slice(1);
        uniforms[name] = gl.getUniformLocation(program, `u${title}`);
      }
      quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.disable(gl.BLEND);
      texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      initialized = true; resize();
      const aspect = boxW / boxH; snap(target.x * aspect, target.y, handles.spread / 100, handles.spread / 100 * CELL_ASPECT);
      gate();
    } catch (error) {
      failed = true; showStatic('shader-fallback');
      host.dataset.effectError = String(error.message || error).slice(0, 150);
    }
    initializing = false;
  }
  initialize();
  return {
    setScroll(progress) { scroll = clamp(Number(progress) || 0, 0, 1); },
    setPaused(value) { paused = Boolean(value); gate(); },
    destroy() {
      if (!alive) return; alive = false; if (raf) cancelAnimationFrame(raf);
      resizeObserver.disconnect(); intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', gate); reducedQuery.removeEventListener('change', onReduce);
      host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('webglcontextlost', onContextLoss);
      if (gl) { if (texture) gl.deleteTexture(texture); if (quad) gl.deleteBuffer(quad); if (program) gl.deleteProgram(program); }
      canvas.remove(); labels.forEach(label => label.remove());
      host.dataset.renderer = 'fallback'; host.dataset.effectStatus = 'destroyed';
    },
  };
}
