// Synthesised score for the 39s long cut — 120 BPM, every scene cut lands on a beat.
// node audio-long.js -> showreel-long.wav (48 kHz, 16-bit stereo)
const fs = require('fs');
const SR = 48000, DUR = 39, N = Math.round(SR * DUR);
let OFF = 0;   // time offset applied by add()
const L = new Float32Array(N), R = new Float32Array(N);
let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
function add(t0, len, fn, gain = 1, pan = 0) {
  const s0 = Math.floor((t0 + OFF) * SR), n = Math.floor(len * SR);
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n && s0 + i < N; i++) { if (s0 + i < 0) continue; const v = fn(i / SR, i); L[s0 + i] += v * gl; R[s0 + i] += v * gr; }
}
const kick = (t0, g = .9) => { let ph = 0; add(t0, .45, t => { ph += 2 * Math.PI * (45 + 140 * Math.exp(-t * 32)) / SR; return Math.sin(ph) * Math.exp(-t * 7.5) + (t < .004 ? rnd() * .4 : 0); }, g); };
const clap = (t0, g = .35) => { let lp = 0; add(t0, .3, t => { const n = rnd(); lp += .5 * (n - lp); const env = Math.exp(-t * 20) * (t < .02 ? (1 + Math.sin(t * 900)) / 1.5 : 1); return (n - lp) * env + Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 30) * .4; }, g); };
const hat = (t0, g = .12, open = false, pan = .25) => { let p1 = 0, p2 = 0; add(t0, open ? .35 : .08, t => { const n = rnd(), h = n - p1; p1 = n; const hh = h - p2; p2 = h; return hh * Math.exp(-t * (open ? 11 : 55)); }, g, pan); };
const impact = (t0, g = 1) => {
  let ph = 0, lp = 0;
  add(t0, 2.2, t => { ph += 2 * Math.PI * (32 + 40 * Math.exp(-t * 5)) / SR; lp += .02 * (rnd() - lp); return Math.sin(ph) * Math.exp(-t * 2) * .9 + lp * 6 * Math.exp(-t * 5); }, g);
  let p1 = 0; add(t0, 1.6, t => { const n = rnd(), h = n - p1; p1 = n; return h * Math.exp(-t * 3.2) * .35; }, g * .7, 0);
};
const riser = (t0, len, g = .35) => { let lp = 0; add(t0, len, t => { const x = t / len, a = .002 + x * x * .25; lp += a * (rnd() - lp); return (lp * 3 + Math.sin(2 * Math.PI * (180 + 900 * x * x) * t) * .08) * x * x; }, g); };
const whoosh = (t0, len = .28, g = .22) => { let lp = 0; add(t0, len, t => { const x = t / len; lp += (.04 + .25 * Math.sin(Math.PI * x)) * (rnd() - lp); return lp * 2.5 * Math.sin(Math.PI * x); }, g, 0); };
const blip = (t0, f, g = .18, pan = 0) => { let ph = 0; add(t0, .16, t => { ph += 2 * Math.PI * f * (1 + 1.2 * Math.exp(-t * 40)) / SR; return Math.sin(ph) * Math.exp(-t * 28); }, g, pan); };
const tick = (t0, g = .2, pan = 0) => add(t0, .05, t => Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-t * 160) + (t < .002 ? rnd() * .5 : 0), g, pan);
const bass = (t0, f, len = .46, g = .32) => add(t0, len, t => {
  let v = 0; for (let h = 1; h <= 7; h++) v += Math.sin(2 * Math.PI * f * h * t) / Math.pow(h, 1.6);
  return v * (1 - Math.exp(-t * 18)) * Math.min(1, (len - t) * 30);
}, g);
const bell = (t0, f, g = .14, pan = 0) => add(t0, 3.2, t => (Math.sin(2 * Math.PI * f * t) + .45 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 3) + .25 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t * 6)) * Math.exp(-t * 1.25) * Math.min(1, t * 400), g, pan);
const pad = (t0, len, fs_, g = .05) => add(t0, len, t => {
  const a = Math.min(1, t / .8) * Math.min(1, (len - t) / 1.2);
  return fs_.reduce((s, f, k) => s + Math.sin(2 * Math.PI * f * t + k) + .5 * Math.sin(2 * Math.PI * f * 1.003 * t), 0) * a;
}, g);
const heart = (t0, g = .8) => { kick(t0, g); kick(t0 + .16, g * .6); };
const BL = [82.41, 82.41, 98, 110, 73.42, 73.42, 98, 123.47];
function groove(a, b, o = {}) {
  for (let t = a, k = 0; t < b - 1e-6; t += .5, k++) {
    kick(t, o.kick ?? .85);
    if (k % 2 === 1) clap(t, o.clap ?? .26);
    hat(t + .25, .11, k % 4 === 3);
    hat(t + .125, .05, false, -.3); hat(t + .375, .05, false, .3);
    if (o.bass !== false) bass(t, BL[k % 8]);
  }
}

/* A · drop / B · words (original 0–4s) */
riser(0, .6, .3); impact(.6, 1);
[1.5, 2.0, 2.5, 3.0].forEach((b, i) => { kick(b, .95); clap(b + .005, .3); whoosh(b - .06, .2, .18); bass(b, [82.41, 98, 110, 73.42][i], .45, .36); });
riser(3.5, .5, .4); whoosh(3.66, .34, .3);
/* C · glass opener */
impact(4.0, .7);
pad(4.0, 4.6, [130.81, 164.81, 196, 246.94], .035);
[523.25, 659.25, 783.99, 987.77, 1046.5, 783.99, 659.25, 987.77].forEach((f, i) => bell(4.25 + i * .5, f, .06, i % 2 ? .4 : -.4));
for (let t = 6.0; t < 8.0; t += .5) { kick(t, .55); hat(t + .25, .08); }
riser(7.6, .9, .45); whoosh(8.05, .45, .3);
/* D · market chart (original S3 cues, 4.0 → 8.5) */
impact(8.5, .75);
groove(8.5, 11.0);
riser(10.5, .5, .38);
/* everything after the chart was laid out on the 56s grid; shift it 11.5s earlier */
OFF = -11.5;
/* E · board / F · wall */
impact(22.5, .55);
groove(22.5, 30.5);
[0, 1, 2, 3, 4, 5].forEach(k => whoosh(22.55 + k * .07, .26, .12));
[[23.0, 0], [23.4, .3], [23.8, -.3]].forEach(([t, p]) => tick(t, .12, p));
riser(25.6, .9, .3); whoosh(25.6, .9, .16);
riser(30.2, .8, .38); whoosh(30.6, .5, .32);
/* G · phone */
kick(31.0, .9); clap(31.0, .3);
for (let t = 31.5, k = 1; t < 36.5; t += .5, k++) { kick(t, .6); hat(t + .25, .09, k % 4 === 3); if (k % 2) clap(t, .18); bass(t, BL[k % 8], .46, .22); }
[[31.6, 1046.5], [31.9, 1318.5], [34.4, 1174.66]].forEach(([t, f]) => bell(t, f, .05, .3));
whoosh(34.0, .45, .22);
riser(36.2, .8, .38); whoosh(36.6, .5, .32);
/* H · bubbles */
impact(37.0, .85); kick(37.0, 1);
for (let k = 0; k < 16; k++) blip(37.02 + k * .03 + (k % 3) * .01, 500 + ((k * 137) % 900), .14, ((k * 53) % 200) / 100 - 1);
groove(37.5, 39.0, { bass: false });
riser(38.2, .8, .42);
/* (brand mark construction removed — collage follows the bubbles) */
OFF = -17;
/* J · collage */
impact(44.5, .7);
groove(44.5, 48.0, { kick: .9 });
for (let t = 44.5; t < 48; t += .125) hat(t + .0625, .035, false, -.4);
riser(47.4, 1.1, .45); whoosh(47.6, .6, .25); kick(48.5, .7);
/* K · logo resolve (original cues + 38s) */
impact(49.0, 1.1);
for (let k = 0; k < 6; k++) tick(49.48 + k * .045, .18, -.4 + k * .16);
kick(50.45, .45);
whoosh(50.62, .4, .14);
[[523.25, -.3], [659.25, .3], [783.99, -.1], [1046.5, .2]].forEach(([f, p], i) => bell(50.62 + i * .035, f, .1, p));
pad(49.3, 6.7, [130.81, 196, 261.63, 329.63], .032);
whoosh(51.75, .7, .1);
[1567.98, 2093].forEach((f, i) => bell(51.9 + i * .08, f, .03, i ? .4 : -.4));
whoosh(54.2, .7, .07); bell(54.4, 2093, .02, .3);

/* master: feedback-delay ambience, soft clip, normalise, fade */
const d = Math.floor(.19 * SR);
for (let i = d; i < N; i++) { L[i] += R[i - d] * .18; R[i] += L[i - d] * .18; }
let peak = 0;
for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * 1.3); R[i] = Math.tanh(R[i] * 1.3); peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
const norm = .93 / peak, fadeStart = (DUR - 1.5) * SR;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const f = i > fadeStart ? 1 - (i - fadeStart) / (N - fadeStart) : 1;
  buf.writeInt16LE(Math.round(L[i] * norm * f * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(R[i] * norm * f * 32767), 46 + i * 4);
}
fs.writeFileSync('showreel-long.wav', buf);
console.log('peak', peak.toFixed(2), '→ showreel-long.wav');
