/* INSIGHT / CHROME — original 128 BPM score, synthesized from first principles.
 * node audio.js -> showreel.wav (exactly 15 seconds, 48 kHz, stereo PCM16)
 * No music samples or third-party recordings. */
'use strict';
const fs = require('fs');
const path = require('path');
const SR = 48000, DUR = 15, N = Math.round(SR * DUR), BPM = 128;
const BEAT = 60 / BPM, BAR = BEAT * 4, TAU = Math.PI * 2;
const drum = [new Float64Array(N), new Float64Array(N)];
const music = [new Float64Array(N), new Float64Array(N)];
const fx = [new Float64Array(N), new Float64Array(N)];
const send = [new Float64Array(N), new Float64Array(N)];
let randomSeed = 2047;
const random = () => { randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) >>> 0; return randomSeed / 4294967296 * 2 - 1; };
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const gainPan = p => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];
function add(bus, start, length, synth, level, pan = 0, sendAmount = 0) {
  const first = Math.floor(start * SR), samples = Math.ceil(length * SR), g = gainPan(pan);
  for (let i = 0; i < samples; i++) {
    const j = first + i; if (j < 0 || j >= N) continue;
    const value = synth(i / SR, i) * level;
    for (let ch = 0; ch < 2; ch++) { bus[ch][j] += value * g[ch]; if (sendAmount) send[ch][j] += value * g[ch] * sendAmount; }
  }
}
function kick(time, level = 1) {
  let phase = 0, clickLP = 0;
  add(drum, time, .31, (t) => {
    phase += TAU * (48 + 115 * Math.exp(-t * 54) + 28 * Math.exp(-t * 15)) / SR;
    clickLP += .16 * (random() - clickLP);
    const body = Math.sin(phase) * Math.exp(-t * 14.8);
    const click = clickLP * Math.exp(-t * 200) * .30;
    return (body + click) * smooth(t / .001);
  }, level * .64);
}
function snare(time, level = 1) {
  let low = 0, high = 0, bodyPhase = 0;
  add(drum, time, .23, (t) => {
    const n = random(); low += .14 * (n - low); high += .65 * (n - high);
    bodyPhase += TAU * (168 + 40 * Math.exp(-t * 45)) / SR;
    const clap = (high - low) * (Math.exp(-t * 27) + .33 * Math.exp(-Math.abs(t - .012) * 260) + .24 * Math.exp(-Math.abs(t - .024) * 220));
    return clap * .78 + Math.sin(bodyPhase) * Math.exp(-t * 38) * .30;
  }, .32 * level, -.06, .09);
}
function hat(time, length, level, pan) {
  let fast = 0, slow = 0, previous = 0;
  add(drum, time, length, t => {
    const noise = random(); fast += .53 * (noise - fast); slow += .11 * (noise - slow);
    const metallic = Math.sin(TAU * 7219 * t) * Math.sin(TAU * 5183 * t) * .17;
    const filtered = fast - slow + metallic;
    const env = Math.exp(-t / (length * .18)) * smooth(t / .0008) * smooth((length - t) / .008);
    previous = filtered; return previous * env;
  }, level, pan, .07);
}
function rim(time, level, pan) {
  add(drum, time, .065, t => (
    Math.sin(TAU * 1060 * t) * .50 + Math.sin(TAU * 1747 * t) * .28 + Math.sin(TAU * 2963 * t) * .12
  ) * Math.exp(-t * 98) * smooth(t / .0005), level, pan, .12);
}
function bass(time, note, length = BEAT * .82, level = .22) {
  const frequency = midi(note), stop = Math.max(.05, length - .035);
  add(music, time, length + .055, t => {
    const attack = smooth(t / .012), release = Math.exp(-Math.max(0, t - stop) * 65);
    const phase = TAU * frequency * t;
    return (Math.sin(phase) + .22 * Math.sin(phase * 2) + .07 * Math.sin(phase * 3)) * attack * release;
  }, level, 0);
}
function pluck(time, note, level = .065, pan = 0, length = .75) {
  const frequency = midi(note);
  add(music, time, length, t => {
    const index = .82 * Math.exp(-t * 13), env = smooth(t / .003) * Math.exp(-t * 8.5) * smooth((length - t) / .07);
    const phase = TAU * frequency * t;
    return (Math.sin(phase + Math.sin(phase * 2.002) * index) + .17 * Math.sin(phase * 1.0018 + .4) + .07 * Math.sin(phase * 3.001)) * env;
  }, level, pan, .35);
}
function chord(time, notes, length, level, pan = 0) {
  add(music, time, length, t => {
    const envelope = smooth(t / .11) * smooth((length - t) / .28);
    let v = 0;
    notes.forEach((note, k) => {
      const f = midi(note), phase = TAU * f * t;
      v += (Math.sin(phase + k * .6) + .30 * Math.sin(phase * 1.0025 + 1.3) + .075 * Math.sin(phase * 2)) / notes.length;
    });
    return v * envelope * (.80 + .20 * Math.sin(TAU * 1.3 * t));
  }, level, pan, .30);
}
function sweep(end, length = .37, level = .12) {
  let lower = 0, upper = 0, phase = 0;
  const start = end - length;
  const first = Math.floor(start * SR), samples = Math.floor(length * SR);
  for (let i = 0; i < samples; i++) {
    const j = first + i; if (j < 0 || j >= N) continue;
    const x = i / samples, t = i / SR, n = random();
    lower += (.015 + x * .12) * (n - lower); upper += .43 * (n - upper);
    phase += TAU * (200 + 720 * x * x) / SR;
    const env = Math.pow(Math.sin(Math.PI * x * .96), 1.5) * Math.pow(x, .62);
    const v = ((upper - lower) * .34 + Math.sin(phase) * .06) * env * level;
    const g = gainPan(Math.sin(x * Math.PI - Math.PI / 2) * .65);
    fx[0][j] += v * g[0]; fx[1][j] += v * g[1];
    send[0][j] += v * g[0] * .2; send[1][j] += v * g[1] * .2;
  }
}
function impact(time, level = .15, note = 38) {
  let low = 0, phase = 0;
  const f = midi(note);
  add(fx, time, .95, t => {
    const n = random(); low += .07 * (n - low);
    phase += TAU * (f * .75 + 38 * Math.exp(-t * 28)) / SR;
    return (Math.sin(phase) * Math.exp(-t * 7.2) * .65 + low * Math.exp(-t * 9) * .7) * smooth(t / .0015);
  }, level, 0, .19);
  // A restrained stereo metal resonance supports the picture's chrome accents.
  add(fx, time + .006, .8, t => (Math.sin(TAU * 947 * t) + .40 * Math.sin(TAU * 1519 * t)) * Math.exp(-t * 8.5) * smooth(t / .002), level * .075, .38, .45);
}

const harmony = [
  { root: 26, notes: [50, 57, 60, 64] }, // D minor 9
  { root: 34, notes: [53, 57, 60, 62] }, // B-flat major 9
  { root: 29, notes: [53, 57, 60, 67] }, // F add 9
  { root: 24, notes: [55, 60, 62, 67] }, // C suspended
  { root: 26, notes: [50, 57, 60, 64] },
  { root: 34, notes: [53, 57, 60, 62] },
  { root: 29, notes: [53, 57, 60, 67] },
  { root: 26, notes: [50, 57, 60, 64] }
];
const hook = [74, 69, 72, 76, 74, 77, 72, 69];
const kickTimes = [];
// Four-beat scenes: the music changes with the visual grammar every 1.875s.
for (let scene = 0; scene < 8; scene++) {
  const start = scene * BAR, h = harmony[scene];
  chord(start, h.notes, BAR + .14, scene === 7 ? .145 : .105, scene % 2 ? .14 : -.14);
  if (scene > 0) { sweep(start, scene === 6 ? .55 : .34, .145); impact(start, scene === 6 ? .20 : .14, h.root + 12); }
  for (let beat = 0; beat < 4; beat++) {
    const when = start + beat * BEAT;
    if (!(scene === 7 && beat > 0)) { kick(when, scene === 0 ? .86 : 1); kickTimes.push(when); }
    if ((beat === 1 || beat === 3) && scene < 7) snare(when + .010, scene > 3 ? 1.04 : .91);
    if (scene < 7) {
      bass(when + .025, h.root + (beat === 3 && scene % 2 === 0 ? 12 : 0), BEAT * (beat === 2 ? .62 : .82), .245);
      const eighth = when + BEAT * .53;
      hat(eighth, beat === 3 ? .23 : .09, scene === 0 ? .066 : .087, beat % 2 ? -.35 : .38);
      if (scene > 1) {
        hat(when + BEAT * .27, .052, .038, -.51);
        hat(when + BEAT * .78, .054, .047, .51);
      }
      if (scene === 2 || scene === 4 || scene === 6) rim(when + BEAT * .76, .050, beat % 2 ? .3 : -.3);
    }
    if (scene < 7) {
      const n = hook[(beat * 2 + scene) % hook.length] + (scene === 3 ? -5 : scene === 5 ? -2 : 0);
      pluck(when + .035, n, scene < 2 ? .057 : .075, -.22 + beat * .15);
      if (scene > 1 && scene < 7) pluck(when + BEAT * .54, n - 12, .035, .25 - beat * .14, .48);
    }
  }
}
// Opening ignition and fast fill add distinct sound-design gestures.
sweep(.31, .30, .105); impact(.31, .11, 38);
[6.94, 7.17, 10.89, 11.02].forEach((time, i) => rim(time, .065, i % 2 ? .42 : -.42));
// The logo resolves with an ascending, glass-like D minor ninth signature.
impact(13.50, .13, 38);
[62, 69, 72, 76, 81].forEach((note, i) => pluck(13.48 + i * .052, note, .083 - i * .005, -.30 + i * .15, 1.3));
bass(13.48, 26, 1.28, .17);
chord(13.49, [50, 57, 60, 64, 69], 1.51, .15, 0);

// Cross-stereo dotted-eighth delay and a four-tap diffuse tail.
const delaySamples = Math.round(BEAT * .75 * SR);
const ambience = [new Float64Array(N), new Float64Array(N)];
let delayLP = [0, 0];
for (let i = delaySamples; i < N; i++) {
  for (let ch = 0; ch < 2; ch++) {
    const source = send[1 - ch][i - delaySamples] + ambience[1 - ch][i - delaySamples] * .38;
    delayLP[ch] += .12 * (source - delayLP[ch]);
    ambience[ch][i] = delayLP[ch];
  }
}
const taps = [[.041, .12], [.071, .10], [.113, .075], [.167, .06]];
for (const [seconds, level] of taps) {
  const d = Math.round(seconds * SR);
  for (let i = d; i < N; i++) {
    ambience[0][i] += send[1][i - d] * level;
    ambience[1][i] += send[0][i - d] * level;
  }
}

// A short kick envelope ducks only harmonic material: transients remain crisp.
const mixed = [new Float64Array(N), new Float64Array(N)];
let lastKick = -100, nextKick = 0, dcIn = [0, 0], dcOut = [0, 0];
let peak = 0, squares = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  while (nextKick < kickTimes.length && t >= kickTimes[nextKick]) { lastKick = kickTimes[nextKick++]; }
  const duck = 1 - .42 * Math.exp(-(t - lastKick) * 22);
  const fade = t > 14.75 ? smooth((15 - t) / .25) : 1;
  const opening = smooth(t / .004);
  for (let ch = 0; ch < 2; ch++) {
    const raw = drum[ch][i] + music[ch][i] * duck + fx[ch][i] + ambience[ch][i] * .58;
    const highpassed = raw - dcIn[ch] + .995 * dcOut[ch]; dcIn[ch] = raw; dcOut[ch] = highpassed;
    const value = Math.tanh(highpassed * 1.10) * fade * opening;
    mixed[ch][i] = value;
    peak = Math.max(peak, Math.abs(value)); squares += value * value;
  }
}
// Peak normalization leaves 1.6 dB of headroom for AAC intersample peaks.
const targetPeak = Math.pow(10, -1.6 / 20), normalization = targetPeak / peak;
const wav = Buffer.alloc(44 + N * 4);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + N * 4, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) for (let ch = 0; ch < 2; ch++) wav.writeInt16LE(Math.round(clamp(mixed[ch][i] * normalization, -1, 1) * 32767), 44 + i * 4 + ch * 2);
const filename = path.join(__dirname, 'showreel.wav');
fs.writeFileSync(filename, wav);
const rms = Math.sqrt(squares / (N * 2)) * normalization;
const report = { title: 'INSIGHT / CHROME', durationSeconds: DUR, bpm: BPM, sampleRate: SR, channels: 2, peakDbFS: -1.6, rmsDbFS: Number((20 * Math.log10(rms)).toFixed(2)), generatedFrom: 'original synthesis; no samples', sceneCuts: Array.from({length: 7}, (_, i) => Number(((i + 1) * BAR).toFixed(3))), logoResolve: 13.5, fade: [14.75, 15] };
fs.writeFileSync(path.join(__dirname, 'audio-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
