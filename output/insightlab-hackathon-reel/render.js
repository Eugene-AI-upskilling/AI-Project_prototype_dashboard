// node render.js stills [t1,t2,..] | node render.js video
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url'), { spawn } = require('child_process');
const { chromium } = require('../insightlab-showreel/node_modules/playwright');
const mode = process.argv[2] || 'stills', dir = __dirname, DUR = 39, FPS = 30;
const ff = (args, opts = {}) => spawn('ffmpeg', args, { cwd: dir, stdio: [opts.stdin ? 'pipe' : 'ignore', 'ignore', 'pipe'] });
const done = p => new Promise((res, rej) => { let e = ''; p.stderr.on('data', d => e = (e + d).slice(-4000)); p.on('close', c => c ? rej(new Error(e)) : res()); });
(async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(pathToFileURL(path.join(dir, 'reel.html')).href + '?render=1');
  await page.evaluate(() => window.ready);
  const shot = t => page.evaluate(t => seek(t), t).then(() => page.screenshot({ type: 'jpeg', quality: 93 }));
  if (mode === 'stills') {
    fs.mkdirSync(path.join(dir, 'stills'), { recursive: true });
    for (const t of (process.argv[3] || '2,7.6,13.6,18.6,23,28,31.8,35,38').split(',').map(Number))
      fs.writeFileSync(path.join(dir, 'stills', `t${t.toFixed(1)}.jpg`), await shot(t));
  } else {
    const p = ff(['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'InsightLab_Hackathon_Reel.mp4'], { stdin: true });
    const fin = done(p), N = DUR * FPS, t0 = Date.now();
    for (let i = 0; i < N; i++) {
      if (!p.stdin.write(await shot(i / FPS))) await new Promise(r => p.stdin.once('drain', r));
      if (i % 150 === 0) console.log(`frame ${i}/${N} · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    p.stdin.end(); await fin;
    await done(ff(['-y', '-hide_banner', '-loglevel', 'error', '-ss', '13.4', '-i', 'InsightLab_Hackathon_Reel.mp4', '-frames:v', '1', '-q:v', '3', 'poster.jpg']));
    console.log('video + poster done');
  }
  await b.close();
  console.log(errs.length ? errs.join('\n') : 'no page errors');
})().catch(e => { console.error(e); process.exit(1); });
