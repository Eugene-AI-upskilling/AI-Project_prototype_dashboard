// Synthesised score for the 15s reel — 120 BPM, every scene cut lands on a beat.
// node audio.js -> showreel.wav (48 kHz, 16-bit stereo)
const fs = require('fs');
const SR = 48000, DUR = 15, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

function add(t0, len, fn, gain = 1, pan = 0) {          // fn(t, i) -> sample
  const s0 = Math.floor(t0 * SR), n = Math.floor(len * SR);
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n && s0 + i < N; i++) { if (s0 + i < 0) continue; const v = fn(i / SR, i); L[s0 + i] += v * gl; R[s0 + i] += v * gr; }
}
const kick = (t0, g = .9) => { let ph = 0; add(t0, .45, t => { ph += 2 * Math.PI * (45 + 140 * Math.exp(-t * 32)) / SR; return Math.sin(ph) * Math.exp(-t * 7.5) + (t < .004 ? rnd() * .4 : 0); }, g); };
const clap = (t0, g = .35) => { let lp = 0; add(t0, .3, t => { const n = rnd(); lp += .5 * (n - lp); const env = Math.exp(-t * 20) * (t < .02 ? (1 + Math.sin(t * 900)) / 1.5 : 1); return (n - lp) * env + Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 30) * .4; }, g); };
const hat = (t0, g = .12, open = false, pan = .25) => { let p1 = 0, p2 = 0; add(t0, open ? .35 : .08, t => { const n = rnd(), h = n - p1; p1 = n; const hh = h - p2; p2 = h; return hh * Math.exp(-t * (open ? 11 : 55)); }, g, pan); };
const impact = (t0, g = 1) => {
  let ph = 0, lp = 0;
  add(t0, 2.2, t => { ph += 2 * Math.PI * (32 + 40 * Math.exp(-t * 5)) / SR; lp += .02 * (rnd() - lp); return Math.sin(ph) * Math.exp(-t * 2) * .9 + lp * 6 * Math.exp(-t * 5); }, g);
  let p1 = 0; add(t0, 1.6, t => { const n = rnd(), h = n - p1; p1 = n; return h * Math.exp(-t * 3.2) * .35; }, g * .7, 0);   // crash air
};
const riser = (t0, len, g = .35) => { let lp = 0; add(t0, len, t => { const x = t / len, a = .002 + x * x * .25; lp += a * (rnd() - lp); return (lp * 3 + Math.sin(2 * Math.PI * (180 + 900 * x * x) * t) * .08) * x * x; }, g); };
const whoosh = (t0, len = .28, g = .22, from = -1, to = 1) => { let lp = 0; add(t0, len, t => { const x = t / len; lp += (.04 + .25 * Math.sin(Math.PI * x)) * (rnd() - lp); return lp * 2.5 * Math.sin(Math.PI * x); }, g, 0); };
const blip = (t0, f, g = .18, pan = 0) => { let ph = 0; add(t0, .16, t => { ph += 2 * Math.PI * f * (1 + 1.2 * Math.exp(-t * 40)) / SR; return Math.sin(ph) * Math.exp(-t * 28); }, g, pan); };
const tick = (t0, g = .2, pan = 0) => add(t0, .05, t => Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-t * 160) + (t < .002 ? rnd() * .5 : 0), g, pan);
const bass = (t0, f, len = .46, g = .32) => add(t0, len, t => {
  let v = 0; for (let h = 1; h <= 7; h++) v += Math.sin(2 * Math.PI * f * h * t) / Math.pow(h, 1.6);
  const duck = 1 - Math.exp(-t * 18);                   // sidechain feel
  return v * duck * Math.min(1, (len - t) * 30);
}, g);
const bell = (t0, f, g = .14, pan = 0) => add(t0, 3.2, t => (Math.sin(2 * Math.PI * f * t) + .45 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 3) + .25 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t * 6)) * Math.exp(-t * 1.25) * Math.min(1, t * 400), g, pan);
const pad = (t0, len, fs_, g = .05) => add(t0, len, t => {
  const a = Math.min(1, t / .8) * Math.min(1, (len - t) / 1.2);
  return fs_.reduce((s, f, k) => s + Math.sin(2 * Math.PI * f * t + k) + .5 * Math.sin(2 * Math.PI * f * 1.003 * t), 0) * a;
}, g);

/* ── score ── */
riser(0, .6, .3); impact(.6, 1);                                     // drop
[1.5, 2.0, 2.5, 3.0].forEach((b, i) => { kick(b, .95); clap(b + .005, .3); whoosh(b - .06, .2, .18); bass(b, [82.41, 98, 110, 73.42][i], .45, .36); });
riser(3.5, .5, .4); whoosh(3.66, .34, .3);                           // INSIGHT fly-through
impact(4.0, .75);
const bassline = [82.41, 82.41, 98, 110, 73.42, 73.42, 98, 123.47];
for (let b = 4.0, k = 0; b < 11.0 - 1e-6; b += .5, k++) {
  if (b === 6.5 || b === 9.0) { kick(b, 1); } else kick(b, .85);
  if (k % 2 === 1) clap(b, .26);
  hat(b + .25, .11, k % 4 === 3);
  hat(b + .125, .05, false, -.3); hat(b + .375, .05, false, .3);
  if (b < 10.5) bass(b, bassline[k % 8]);
}
riser(6.0, .5, .38); impact(6.5, .7);                                // chart zoom → cards
[0, 1, 2, 3, 4, 5].forEach(k => whoosh(6.55 + k * .07, .26, .12));    // card fly-ins
[[7.0, 0], [7.4, .3], [7.8, -.3]].forEach(([t, p]) => tick(t, .12, p));
riser(8.45, .55, .4); impact(9.0, .85);                              // suck-in → bubbles
for (let k = 0; k < 16; k++) blip(9.02 + k * .03 + (k % 3) * .01, 500 + ((k * 137) % 900), .14, ((k * 53) % 200) / 100 - 1);
riser(10.2, .8, .42);                                                 // merge
impact(11.0, 1.1);                                                    // full-red hit
for (let k = 0; k < 6; k++) tick(11.48 + k * .045, .18, -.4 + k * .16); // wordmark letters
kick(12.45, .45);                                                     // globe lands
whoosh(12.62, .4, .14);                                               // Insight Lab slide
[[523.25, -.3], [659.25, .3], [783.99, -.1], [1046.5, .2]].forEach(([f, p], i) => bell(12.62 + i * .035, f, .1, p));
pad(11.3, 3.7, [130.81, 196, 261.63, 329.63], .03);
whoosh(13.75, .7, .1);                                                // gloss sweep shimmer
[1567.98, 2093].forEach((f, i) => bell(13.9 + i * .08, f, .03, i ? .4 : -.4));

/* ── master: feedback-delay ambience, soft clip, normalise, fade ── */
const d = Math.floor(.19 * SR);
for (let i = d; i < N; i++) { L[i] += R[i - d] * .18; R[i] += L[i - d] * .18; }
let peak = 0;
for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * 1.3); R[i] = Math.tanh(R[i] * 1.3); peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
const norm = .93 / peak, fadeStart = (DUR - .5) * SR;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const f = i > fadeStart ? 1 - (i - fadeStart) / (N - fadeStart) : 1;
  buf.writeInt16LE(Math.round(L[i] * norm * f * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(R[i] * norm * f * 32767), 46 + i * 4);
}
fs.writeFileSync('showreel.wav', buf);
console.log('peak', peak.toFixed(2), '→ showreel.wav');
